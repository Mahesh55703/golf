import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { razorpayGateway } from "@/lib/payments/razorpay";
import { fromMinorUnits } from "@/lib/payments/types";
import { TransactionStatus, PaymentStatus, RegistrationStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    if (!signature) {
      return NextResponse.json({ error: "Missing webhook signature header" }, { status: 400 });
    }

    // Verify webhook signature against raw body
    const isValid = razorpayGateway.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventId = event?.event_id || event?.id || `evt_${Date.now()}_${Math.random()}`;
    const eventType = event?.event || "unknown";

    // 1. Durable Idempotency Check in DB
    const existingWebhook = await prisma.paymentWebhookEvent.findUnique({
      where: { eventId },
    });

    if (existingWebhook && existingWebhook.processed) {
      return NextResponse.json({ success: true, message: "Event already processed." });
    }

    // Record webhook event
    const recordedEvent = existingWebhook || await prisma.paymentWebhookEvent.create({
      data: {
        provider: "RAZORPAY",
        eventId,
        eventType,
        payload: event,
        signature,
        processed: false,
      },
    });

    // 2. Handle Event Types
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = event?.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.findFirst({
            where: { providerOrderId: orderId },
          });

          if (payment && payment.status !== TransactionStatus.SUCCESS) {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                providerPaymentId: paymentId || payment.providerPaymentId,
                status: TransactionStatus.SUCCESS,
                paidAt: new Date(),
              },
            });

            await tx.registration.update({
              where: { id: payment.registrationId },
              data: {
                status: RegistrationStatus.CONFIRMED,
                paymentStatus: PaymentStatus.PAID,
              },
            });
          }
        });
      }
    } else if (eventType === "payment.failed") {
      const paymentEntity = event?.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const errorCode = paymentEntity?.error_code;
      const errorDescription = paymentEntity?.error_description;

      if (orderId) {
        await prisma.payment.updateMany({
          where: {
            providerOrderId: orderId,
            status: { in: [TransactionStatus.CREATED, TransactionStatus.PROCESSING] },
          },
          data: {
            status: TransactionStatus.FAILED,
            failureCode: errorCode || "PAYMENT_FAILED",
            failureReason: errorDescription || "Payment was rejected by gateway/bank.",
          },
        });
      }
    } else if (eventType === "refund.processed" || eventType === "refund.created") {
      const refundEntity = event?.payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;
      const refundId = refundEntity?.id;
      const refundAmountMinor = refundEntity?.amount;

      if (paymentId) {
        await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.findUnique({
            where: { providerPaymentId: paymentId },
            include: { registration: true },
          });

          if (payment) {
            const parsedRefundAmount = refundAmountMinor
              ? fromMinorUnits(refundAmountMinor, payment.currency)
              : Number(payment.amount);

            const totalCaptured = Number(payment.amount);
            const currentRefunded = payment.refundAmount ? Number(payment.refundAmount) : 0;
            
            // Check if this refund ID was already processed in metadata history to protect against repeated deliveries
            const meta = (payment.metadata as any) || {};
            const history = meta.refundHistory || [];
            const existingEntry = history.find((h: any) => h.refundId === refundId);

            let newRefundedTotal = currentRefunded;
            if (!existingEntry) {
              newRefundedTotal = Number((currentRefunded + parsedRefundAmount).toFixed(2));
            }

            const isFullRefund = newRefundedTotal >= totalCaptured;
            const updatedTxStatus = isFullRefund ? TransactionStatus.REFUNDED : TransactionStatus.PARTIALLY_REFUNDED;
            const updatedPaymentStatus = isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PAID;

            const updatedHistory = existingEntry
              ? history.map((h: any) => h.refundId === refundId ? { ...h, status: "processed" } : h)
              : [
                  ...history,
                  {
                    refundId,
                    amount: parsedRefundAmount,
                    currency: payment.currency,
                    reason: "Processed via gateway webhook",
                    refundedAt: new Date().toISOString(),
                    status: "processed",
                  },
                ];

            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: updatedTxStatus,
                refundedAt: new Date(),
                refundReference: refundId,
                refundAmount: newRefundedTotal,
                metadata: {
                  ...meta,
                  refundHistory: updatedHistory,
                },
              },
            });

            await tx.registration.update({
              where: { id: payment.registrationId },
              data: {
                paymentStatus: updatedPaymentStatus,
              },
            });
          }
        });
      }
    } else if (eventType === "refund.failed") {
      const refundEntity = event?.payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;
      const refundId = refundEntity?.id;

      if (paymentId) {
        await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.findUnique({
            where: { providerPaymentId: paymentId },
          });

          if (payment) {
            const meta = (payment.metadata as any) || {};
            const history = (meta.refundHistory || []).map((h: any) =>
              h.refundId === refundId ? { ...h, status: "failed" } : h
            );

            await tx.payment.update({
              where: { id: payment.id },
              data: {
                metadata: {
                  ...meta,
                  refundHistory: history,
                  lastRefundFailure: {
                    refundId,
                    failedAt: new Date().toISOString(),
                  },
                },
              },
            });
          }
        });
      }
    }

    // Mark webhook event as processed
    await prisma.paymentWebhookEvent.update({
      where: { id: recordedEvent.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, eventId, eventType });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook error", details: error.message },
      { status: 500 }
    );
  }
}
