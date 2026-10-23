import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestGolferPasswordReset, confirmGolferPasswordReset } from "@/lib/golfer-auth";
import { checkContactRateLimit } from "@/lib/email";

const ForgotSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
});

const ResetSchema = z.object({
  token: z.string().min(10, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const rateCheck = checkContactRateLimit(`golfer-pw-reset:${ip}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Check if it's request or confirm
    if (body.token) {
      const parsed = ResetSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation error", details: parsed.error.issues },
          { status: 400 }
        );
      }
      await confirmGolferPasswordReset(parsed.data.token, parsed.data.password);
      return NextResponse.json({
        success: true,
        message: "Password has been successfully updated. You may now sign in.",
      });
    } else {
      const parsed = ForgotSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation error", details: parsed.error.issues },
          { status: 400 }
        );
      }
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
      const proto = req.headers.get("x-forwarded-proto") || "http";
      const baseUrl = `${proto}://${host}`;

      const res = await requestGolferPasswordReset(parsed.data.email, baseUrl);
      return NextResponse.json(res);
    }
  } catch (error: any) {
    console.error("Password reset error:", error);
    const msg = error.message;
    if (msg === "INVALID_OR_EXPIRED_TOKEN" || msg === "TOKEN_ALREADY_USED" || msg === "TOKEN_EXPIRED") {
      return NextResponse.json(
        { error: "This password reset link is invalid or has expired. Please submit a new request.", code: msg },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
