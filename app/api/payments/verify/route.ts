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

    const reg = result.registration as any;
    const golferName = reg.golfer
      ? `${reg.golfer.firstName} ${reg.golfer.lastName}`.trim()
      : "";
    const golferEmail = reg.golfer?.email || "";
    const isActivated = Boolean(reg.golfer?.isEmailVerified && reg.golfer?.passwordHash);

    return NextResponse.json({
      success: true,
      message: "Payment successfully verified and registration confirmed.",
      registration: {
        id: reg.id,
        referenceNumber: reg.referenceNumber,
        status: reg.status,
        paymentStatus: reg.paymentStatus,
        entryFee: Number(reg.entryFeePaid ?? 0),
        currency: reg.currency,
        tournamentName: reg.tournament?.name || "",
        hostClub: reg.tournament?.hostClub?.name || "Host Club",
        divisionName: reg.division?.name || "Open Championship",
        golferId: reg.golfer?.id,
        golferName,
        golferEmail,
        isActivated,
        registeredAt: reg.registeredAt,
        tournament: reg.tournament,
        division: reg.division,
        golfer: reg.golfer
          ? {
              id: reg.golfer.id,
              firstName: reg.golfer.firstName,
              lastName: reg.golfer.lastName,
              email: reg.golfer.email,
              isEmailVerified: reg.golfer.isEmailVerified,
            }
          : undefined,
      },
      payment: {
        referenceNumber: result.payment.referenceNumber,
        status: result.payment.status,
        amount: Number(result.payment.amount),
        currency: result.payment.currency,
        paidAt: result.payment.paidAt,
        isSimulation: Boolean(
          result.payment.providerOrderId?.startsWith("order_sim_") ||
          result.payment.providerPaymentId?.startsWith("pay_sim_")
        ),
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
