import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyGolferPassword, createGolferSession } from "@/lib/golfer-auth";
import { checkContactRateLimit } from "@/lib/email";

const LoginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const rateCheck = checkContactRateLimit(`golfer-login:${ip}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid credentials.", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const golfer = await prisma.golferProfile.findUnique({
      where: { email: normalizedEmail },
    });

    if (!golfer || !golfer.passwordHash) {
      // Prevent user enumeration and prompt activation if unactivated registration exists
      return NextResponse.json(
        {
          error: "Invalid email or password. If you registered for a tournament, please activate your account first.",
          code: !golfer ? "INVALID_CREDENTIALS" : "ACCOUNT_NOT_ACTIVATED",
        },
        { status: 401 }
      );
    }

    const isValid = await verifyGolferPassword(parsed.data.password, golfer.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password.", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    await createGolferSession(golfer);

    return NextResponse.json({
      success: true,
      golfer: {
        id: golfer.id,
        email: golfer.email,
        firstName: golfer.firstName,
        lastName: golfer.lastName,
        avatarUrl: golfer.avatarUrl,
        handicapIndex: golfer.handicapIndex,
      },
    });
  } catch (error: any) {
    console.error("Golfer login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during sign in." },
      { status: 500 }
    );
  }
}
