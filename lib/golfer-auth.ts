import bcrypt from "bcryptjs";
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { sendContactEmail, sendTransactionalEmail, isVercelPreviewEnvironment } from "./email";

const GOLFER_JWT_SECRET = new TextEncoder().encode(
  process.env.GOLFER_JWT_SECRET || process.env.ADMIN_JWT_SECRET || "golfpulse-golfer-secure-session-key-2026-production"
);

export const GOLFER_COOKIE_NAME = "golfpulse_golfer_token";
const SESSION_DURATION_HOURS = 24 * 7; // 7 days for golfers
const TOKEN_EXPIRY_HOURS = 24; // 24 hours for activation and password reset

export interface GolferTokenPayload {
  sub: string; // golferProfile.id
  email: string;
  name: string;
  sessionId: string;
  type: "GOLFER";
  iat?: number;
  exp?: number;
}

export async function hashGolferPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyGolferPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Creates an authenticated session for a golfer and sets the HTTP-only cookie.
 */
export async function createGolferSession(golfer: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
  const tokenString = crypto.randomUUID();

  const session = await prisma.golferSession.create({
    data: {
      token: tokenString,
      golferId: golfer.id,
      expiresAt,
    },
  });

  const name = `${golfer.firstName} ${golfer.lastName}`.trim();

  const jwt = await new SignJWT({
    sub: golfer.id,
    email: golfer.email,
    name,
    sessionId: session.id,
    type: "GOLFER",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(GOLFER_JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(GOLFER_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return { session, token: jwt };
}

/**
 * Validates session cookie and retrieves current authenticated golfer profile.
 */
export async function getCurrentGolfer() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(GOLFER_COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, GOLFER_JWT_SECRET);
    const customPayload = payload as unknown as GolferTokenPayload;

    if (customPayload.type !== "GOLFER") {
      return null;
    }

    const session = await prisma.golferSession.findUnique({
      where: { id: customPayload.sessionId },
      include: {
        golfer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            country: true,
            homeClub: true,
            handicapIndex: true,
            handicapStatus: true,
            avatarUrl: true,
            isEmailVerified: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return null;
    }

    return session.golfer;
  } catch {
    return null;
  }
}

/**
 * Revokes current golfer session and deletes cookie.
 */
export async function destroyGolferSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(GOLFER_COOKIE_NAME)?.value;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, GOLFER_JWT_SECRET);
        const customPayload = payload as unknown as GolferTokenPayload;
        await prisma.golferSession.updateMany({
          where: { id: customPayload.sessionId },
          data: { revokedAt: new Date() },
        });
      } catch {
        // ignore
      }
    }
    cookieStore.delete(GOLFER_COOKIE_NAME);
  } catch {
    // ignore
  }
}

/**
 * Requests an account activation link for a golfer by email.
 * Safe from email enumeration - returns success even if golfer doesn't exist.
 */
export async function requestGolferActivation(email: string, baseUrl: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const golfer = await prisma.golferProfile.findUnique({
    where: { email: normalizedEmail },
  });

  if (!golfer) {
    // Generic response to avoid enumeration
    return { success: true, message: "If an account or registration exists with this email, an activation link has been sent." };
  }

  // Generate secure random token
  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Invalidate any previous unused activation tokens
  await prisma.golferActivationToken.deleteMany({
    where: { golferId: golfer.id, usedAt: null },
  });

  const createdToken = await prisma.golferActivationToken.create({
    data: {
      tokenHash,
      golferId: golfer.id,
      email: normalizedEmail,
      expiresAt,
    },
  });

  const activationLink = `${baseUrl.replace(/\/$/, "")}/activate?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

  const isNonProdOrPreview = process.env.NODE_ENV !== "production" || isVercelPreviewEnvironment();

  // Send transactional email directly to golfer
  const emailResult = await sendTransactionalEmail({
    to: normalizedEmail,
    name: `${golfer.firstName} ${golfer.lastName}`.trim(),
    subject: "GolfPulse Account Activation",
    text: `Hello ${golfer.firstName},\n\nPlease activate your GolfPulse account to manage your tournament registrations, track official scorecards, and monitor performance analytics.\n\nActivation Link: ${activationLink}\n\nThis single-use link expires in 24 hours. If you did not request this, you can safely ignore this email.`,
  });

  if (!emailResult.success) {
    if (!isNonProdOrPreview) {
      await prisma.golferActivationToken.delete({ where: { id: createdToken.id } }).catch(() => {});
      return {
        success: false,
        error: "Unable to deliver activation email at this time. Please contact tournament administration.",
      };
    }

    console.warn("[Activation] Transactional email provider rejected dispatch in preview/dev:", emailResult.error);
    return {
      success: true,
      emailDelivered: false,
      message: "Activation link generated. In Preview sandbox mode, click the direct activation button below to proceed.",
      debugToken: rawToken,
      activationLink,
    };
  }

  return {
    success: true,
    emailDelivered: true,
    message: "Activation link sent! Check your email inbox to complete your account activation.",
    ...(isNonProdOrPreview ? { debugToken: rawToken, activationLink } : {}),
  };
}

/**
 * Confirms account activation and sets golfer password.
 */
export async function confirmGolferActivation(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken.trim());

  const tokenRecord = await prisma.golferActivationToken.findUnique({
    where: { tokenHash },
    include: { golfer: true },
  });

  if (!tokenRecord) {
    throw new Error("INVALID_OR_EXPIRED_TOKEN");
  }

  if (tokenRecord.usedAt !== null) {
    throw new Error("TOKEN_ALREADY_USED");
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new Error("TOKEN_EXPIRED");
  }

  const passwordHash = await hashGolferPassword(newPassword);

  // Mark token used and update golfer profile atomically
  const updatedGolfer = await prisma.$transaction(async (tx) => {
    await tx.golferActivationToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    return tx.golferProfile.update({
      where: { id: tokenRecord.golferId },
      data: {
        passwordHash,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
  });

  // Create welcome notification
  await prisma.golferNotification.create({
    data: {
      golferId: updatedGolfer.id,
      title: "Welcome to GolfPulse",
      message: "Your golfer account is activated. You can now access your tournament entries, performance metrics, and official leaderboards.",
      type: "GENERAL",
      linkUrl: "/dashboard",
    },
  });

  return updatedGolfer;
}

/**
 * Requests password reset token for a golfer.
 */
export async function requestGolferPasswordReset(email: string, baseUrl: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const golfer = await prisma.golferProfile.findUnique({
    where: { email: normalizedEmail },
  });

  if (!golfer || !golfer.passwordHash) {
    // Return generic response
    return { success: true, message: "If a verified account exists for this email, password reset instructions have been sent." };
  }

  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

  await prisma.golferPasswordResetToken.deleteMany({
    where: { golferId: golfer.id, usedAt: null },
  });

  await prisma.golferPasswordResetToken.create({
    data: {
      tokenHash,
      golferId: golfer.id,
      expiresAt,
    },
  });

  const resetLink = `${baseUrl.replace(/\/$/, "")}/forgot-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

  const isNonProdOrPreview = process.env.NODE_ENV !== "production" || isVercelPreviewEnvironment();

  try {
    await sendTransactionalEmail({
      to: normalizedEmail,
      name: `${golfer.firstName} ${golfer.lastName}`.trim(),
      subject: "GolfPulse Password Reset",
      text: `Hello ${golfer.firstName},\n\nA password reset request was received for your GolfPulse account.\n\nReset Link: ${resetLink}\n\nThis link will expire in 2 hours. If you did not make this request, please disregard this email.`,
    });
  } catch (err) {
    console.error("Failed to dispatch password reset email:", err);
  }

  return {
    success: true,
    message: "If a verified account exists for this email, password reset instructions have been sent.",
    ...(isNonProdOrPreview ? { debugToken: rawToken, resetLink } : {}),
  };
}

/**
 * Resets golfer password using token.
 */
export async function confirmGolferPasswordReset(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken.trim());

  const tokenRecord = await prisma.golferPasswordResetToken.findUnique({
    where: { tokenHash },
    include: { golfer: true },
  });

  if (!tokenRecord) {
    throw new Error("INVALID_OR_EXPIRED_TOKEN");
  }

  if (tokenRecord.usedAt !== null) {
    throw new Error("TOKEN_ALREADY_USED");
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new Error("TOKEN_EXPIRED");
  }

  const passwordHash = await hashGolferPassword(newPassword);

  const updatedGolfer = await prisma.$transaction(async (tx) => {
    await tx.golferPasswordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    // Revoke all existing sessions on password change
    await tx.golferSession.updateMany({
      where: { golferId: tokenRecord.golferId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return tx.golferProfile.update({
      where: { id: tokenRecord.golferId },
      data: {
        passwordHash,
        isEmailVerified: true,
        emailVerifiedAt: tokenRecord.golfer.emailVerifiedAt || new Date(),
      },
    });
  });

  return updatedGolfer;
}
