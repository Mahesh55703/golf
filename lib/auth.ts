import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { AdminRole, AuditAction } from "@prisma/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "golfpulse-super-secret-key-change-in-production-2026-secure"
);

const COOKIE_NAME = "golfpulse_admin_token";
const SESSION_DURATION_HOURS = 24;

export interface TokenPayload {
  sub: string;
  email: string;
  role: AdminRole;
  name: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(adminUserId: string, email: string, role: AdminRole, name: string) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
  const tokenString = crypto.randomUUID();

  const session = await prisma.adminSession.create({
    data: {
      token: tokenString,
      adminUserId,
      expiresAt,
    },
  });

  const jwt = await new SignJWT({
    sub: adminUserId,
    email,
    role,
    name,
    sessionId: session.id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return { session, token: jwt };
}

export async function getCurrentAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const customPayload = payload as unknown as TokenPayload;

    const session = await prisma.adminSession.findUnique({
      where: { id: customPayload.sessionId },
      include: {
        adminUser: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return null;
    }

    if (!session.adminUser.isActive) {
      return null;
    }

    return session.adminUser;
  } catch {
    return null;
  }
}

export async function destroySession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const customPayload = payload as unknown as TokenPayload;
        await prisma.adminSession.updateMany({
          where: { id: customPayload.sessionId },
          data: { revokedAt: new Date() },
        });
      } catch {
        // ignore
      }
    }
    cookieStore.delete(COOKIE_NAME);
  } catch {
    // ignore
  }
}

export async function logAdminAudit(action: AuditAction, details?: string, targetEmail?: string, adminUserId?: string) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        action,
        details,
        targetEmail,
        adminUserId,
      },
    });
  } catch (e) {
    console.error("Failed to write admin audit log:", e);
  }
}

export async function logMediaAudit(action: AuditAction, details?: string, adminUserId?: string) {
  try {
    await prisma.mediaAuditLog.create({
      data: {
        action,
        details,
        adminUserId,
      },
    });
  } catch (e) {
    console.error("Failed to write media audit log:", e);
  }
}

// Role Permissions Check
const ROLE_HIERARCHY: Record<AdminRole, number> = {
  VIEWER: 1,
  CONTENT_MANAGER: 2,
  PLATFORM_ADMIN: 3,
  SUPER_ADMIN: 4,
};

export function hasPermission(userRole: AdminRole, requiredRole: AdminRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
