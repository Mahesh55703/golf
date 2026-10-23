import { NextRequest, NextResponse } from "next/server";
import { contactFormSchema, checkContactRateLimit, sendContactEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    // 1. Abuse protection: IP-based rate limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rateLimit = checkContactRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "RATE_LIMIT_EXCEEDED",
          message: "Too many inquiries submitted. Please wait a few minutes before trying again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // 2. Body parsing and schema validation
    const body = await req.json();
    const parseResult = contactFormSchema.safeParse(body);

    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message);
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: issues[0] || "Invalid form submission",
          details: issues,
        },
        { status: 400 }
      );
    }

    // 3. Honeypot bot protection
    if (parseResult.data.honeypot && parseResult.data.honeypot.trim().length > 0) {
      // Silently return success to bot without sending email
      return NextResponse.json({
        success: true,
        message: "Your message has been captured.",
      });
    }

    // 4. Send email enquiry via transactional integration
    const sendResult = await sendContactEmail(parseResult.data);

    if (!sendResult.success) {
      return NextResponse.json(
        {
          error: "DELIVERY_FAILURE",
          message: "We encountered an issue transmitting your inquiry. Please try again or call section headquarters.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Your message has been captured. The Tournament Committee will be in touch shortly.",
      reference: sendResult.id,
      mockMode: sendResult.provider === "mock",
    });
  } catch (error) {
    console.error("[Contact API Error]:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while processing your request.",
      },
      { status: 500 }
    );
  }
}
