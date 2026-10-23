import { NextRequest, NextResponse } from "next/server";
import { initiateCheckout } from "@/lib/payments/service";
import { z } from "zod";

const CreateOrderSchema = z.object({
  registrationId: z.string().min(1, "Registration ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { registrationId } = parsed.data;
    const checkoutResult = await initiateCheckout(registrationId);

    return NextResponse.json({
      success: true,
      ...checkoutResult,
    });
  } catch (error: any) {
    console.error("Payment order creation failed:", error);
    const msg = error.message || "";

    if (msg === "REGISTRATION_NOT_FOUND") {
      return NextResponse.json({ error: "Registration record not found.", code: "REGISTRATION_NOT_FOUND" }, { status: 404 });
    }
    if (msg === "ALREADY_PAID") {
      return NextResponse.json({ error: "This registration is already paid.", code: "ALREADY_PAID" }, { status: 400 });
    }
    if (msg === "REGISTRATION_CANCELLED") {
      return NextResponse.json({ error: "This registration has been cancelled.", code: "REGISTRATION_CANCELLED" }, { status: 400 });
    }
    if (msg === "TOURNAMENT_IN_PROGRESS") {
      return NextResponse.json(
        {
          error: "This tournament is currently in progress. Registrations are closed.",
          code: "TOURNAMENT_IN_PROGRESS",
        },
        { status: 409 }
      );
    }
    if (msg === "REGISTRATION_CLOSED") {
      return NextResponse.json(
        {
          error: "Registration is currently closed for this tournament.",
          code: "REGISTRATION_CLOSED",
        },
        { status: 400 }
      );
    }
    if (msg === "TOURNAMENT_COMPLETED") {
      return NextResponse.json(
        {
          error: "This tournament has completed. Registrations are closed.",
          code: "TOURNAMENT_COMPLETED",
        },
        { status: 400 }
      );
    }
    if (msg === "TOURNAMENT_CANCELLED") {
      return NextResponse.json(
        {
          error: "This tournament has been cancelled. Registrations are not accepted.",
          code: "TOURNAMENT_CANCELLED",
        },
        { status: 400 }
      );
    }
    if (msg === "TOURNAMENT_CAPACITY_FULL") {
      return NextResponse.json(
        {
          error: "This tournament has reached maximum player capacity. Registration is currently full.",
          code: "TOURNAMENT_CAPACITY_FULL",
        },
        { status: 400 }
      );
    }
    if (msg === "REGISTRATION_NOT_YET_OPEN") {
      return NextResponse.json(
        {
          error: "Registration for this tournament has not opened yet.",
          code: "REGISTRATION_NOT_YET_OPEN",
        },
        { status: 400 }
      );
    }
    if (msg === "REGISTRATION_DEADLINE_PASSED") {
      return NextResponse.json(
        {
          error: "The registration deadline for this tournament has passed.",
          code: "REGISTRATION_DEADLINE_PASSED",
        },
        { status: 400 }
      );
    }
    if (msg === "REGISTRATION_NOT_OPEN") {
      return NextResponse.json(
        {
          error: "Registration is not currently open for this tournament.",
          code: "REGISTRATION_NOT_OPEN",
        },
        { status: 400 }
      );
    }

    if (msg.startsWith("PAYMENT_GATEWAY_UNAVAILABLE")) {
      return NextResponse.json(
        {
          error:
            "Online payment gateway is temporarily unavailable. Please try again later or contact the tournament organizer.",
          code: "PAYMENT_GATEWAY_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to initiate payment order.", details: error.message },
      { status: 500 }
    );
  }
}
