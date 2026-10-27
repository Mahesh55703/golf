import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestGolferActivation } from "@/lib/golfer-auth";
import { checkContactRateLimit } from "@/lib/email";

const RequestSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const rateCheck = checkContactRateLimit(`golfer-act-req:${ip}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many activation requests. Please wait a few minutes before trying again." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const forwardedHost = req.headers.get("x-forwarded-host");
    const host = forwardedHost || req.headers.get("host");
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const proto = forwardedProto || (host?.includes("localhost") ? "http" : "https");
    let baseUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    if (!baseUrl.startsWith("http")) {
      baseUrl = `https://${baseUrl}`;
    }

    const result = await requestGolferActivation(parsed.data.email, baseUrl);

    if (!result.success) {
      return NextResponse.json(
        { error: (result as any).error || "Failed to process activation request." },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Activation request error:", error);
    return NextResponse.json(
      { error: "Failed to process activation request." },
      { status: 500 }
    );
  }
}
