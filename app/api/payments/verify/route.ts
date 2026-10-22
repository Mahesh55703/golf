import { NextRequest, NextResponse } from "next/server";
import { finalizePaymentVerification } from "@/lib/payments/service";
import { z } from "zod";

const VerifySchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  paymentId: z.string().min(1, "Payment ID is required"),
  signature: z.string().min(1, "Signature is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VerifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { orderId, paymentId, signature } = parsed.data;

    const result = await finalizePaymentVerification({
      orderId,
      paymentId,
      signature,
    });

    return NextResponse.json({
      success: true,
      message: "Payment successfully verified and registration confirmed.",
      registration: result.registration,
      payment: {
        referenceNumber: result.payment.referenceNumber,
        status: result.payment.status,
        amount: Number(result.payment.amount),
        currency: result.payment.currency,
        paidAt: result.payment.paidAt,
      },
    });
  } catch (error: any) {
    console.error("Payment verification failed:", error);
    const msg = error.message || "";

    if (msg.startsWith("INVALID_PAYMENT_SIGNATURE")) {
      return NextResponse.json(
        { error: "Invalid payment signature. Verification failed." },
        { status: 400 }
      );
    }
    if (msg === "PAYMENT_RECORD_NOT_FOUND") {
      return NextResponse.json(
        { error: "No matching payment order found." },
        { status: 404 }
      );
    }
    if (msg.startsWith("DUPLICATE_PAYMENT_ID")) {
      return NextResponse.json(
        { error: "Duplicate payment identifier detected." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred during payment verification.", details: error.message },
      { status: 500 }
    );
  }
}
