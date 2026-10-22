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
      return NextResponse.json({ error: "Registration record not found." }, { status: 404 });
    }
    if (msg === "ALREADY_PAID") {
      return NextResponse.json({ error: "This registration is already paid." }, { status: 400 });
    }
    if (msg === "REGISTRATION_CANCELLED") {
      return NextResponse.json({ error: "This registration has been cancelled." }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to initiate payment order.", details: error.message },
      { status: 500 }
    );
  }
}
