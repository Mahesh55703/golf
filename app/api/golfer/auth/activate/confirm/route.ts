import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { confirmGolferActivation, createGolferSession } from "@/lib/golfer-auth";
import { checkContactRateLimit } from "@/lib/email";

const ConfirmSchema = z.object({
  token: z.string().min(10, "Activation token is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const rateCheck = checkContactRateLimit(`golfer-act-conf:${ip}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again shortly." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = ConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const golfer = await confirmGolferActivation(parsed.data.token, parsed.data.password);
    await createGolferSession(golfer);

    return NextResponse.json({
      success: true,
      message: "Account successfully activated! Welcome to your GolfPulse dashboard.",
      golfer: {
        id: golfer.id,
        email: golfer.email,
        firstName: golfer.firstName,
        lastName: golfer.lastName,
      },
    });
  } catch (error: any) {
    console.error("Activation confirm error:", error);
    const msg = error.message;

    if (msg === "INVALID_OR_EXPIRED_TOKEN" || msg === "TOKEN_ALREADY_USED" || msg === "TOKEN_EXPIRED") {
      return NextResponse.json(
        { error: "This activation link is invalid, already used, or has expired. Please request a new one.", code: msg },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Activation failed. Please try again." },
      { status: 500 }
    );
  }
}
