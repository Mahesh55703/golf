import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission, logAdminAudit } from "@/lib/auth";
import { AdminRole, AuditAction, PaymentStatus, RegistrationStatus, TransactionStatus } from "@prisma/client";
import { initiateProviderRefund } from "@/lib/payments/service";
import { z } from "zod";

const ReconcileSchema = z.object({
  registrationId: z.string().min(1, "Registration ID is required"),
  action: z.enum(["MARK_PAID", "CANCEL_REGISTRATION", "MARK_REFUNDED"]),
  reason: z.string().min(5, "A reason of at least 5 characters is required for reconciliation"),
  externalReference: z.string().optional(),
  amount: z.number().positive().optional(),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require at least PLATFORM_ADMIN for financial mutations
    if (!hasPermission(admin.role, AdminRole.PLATFORM_ADMIN)) {
      return NextResponse.json(
        { error: "Forbidden: Platform Administrator privileges required for financial reconciliation." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = ReconcileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { registrationId, action, reason, externalReference, amount, idempotencyKey } = parsed.data;

    if (action === "MARK_REFUNDED") {
      // Execute verified provider-backed refund workflow
      const refundResult = await initiateProviderRefund({
        registrationId,
        adminId: admin.id,
        adminEmail: admin.email,
        reason,
        amount,
        idempotencyKey,
        externalReference,
      });

      return NextResponse.json({
        success: true,
        message: refundResult.isProcessedImmediately
          ? (refundResult.isFullRefund ? "Full refund processed successfully." : "Partial refund processed successfully.")
          : "Refund request initiated with provider. Status is pending provider confirmation.",
        result: refundResult,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const registration = await tx.registration.findUnique({
        where: { id: registrationId },
        include: { tournament: true, golfer: true, payments: true },
      });

      if (!registration) {
        throw new Error("REGISTRATION_NOT_FOUND");
      }

      const now = new Date();

      if (action === "MARK_PAID") {
        if (registration.paymentStatus === PaymentStatus.PAID) {
          throw new Error("ALREADY_PAID: Registration is already marked as paid.");
        }

        // Create or update manual payment record
        const payment = await tx.payment.create({
          data: {
            referenceNumber: `GP-MAN-${Date.now().toString().slice(-6)}`,
            registrationId: registration.id,
            provider: "MANUAL",
            providerPaymentId: externalReference || `manual_${Date.now()}`,
            amount: registration.tournament.entryFee,
            currency: registration.tournament.currency || "USD",
            amountMinor: Math.round(Number(registration.tournament.entryFee) * 100),
            status: TransactionStatus.SUCCESS,
            paidAt: now,
            metadata: {
              reconciledBy: admin.email,
              reconciledByName: admin.name,
              reason,
            },
          },
        });

        const updatedReg = await tx.registration.update({
          where: { id: registration.id },
          data: {
            status: RegistrationStatus.CONFIRMED,
            paymentStatus: PaymentStatus.PAID,
            entryFeePaid: registration.tournament.entryFee,
          },
        });

        return { registration: updatedReg, payment };
      } else if (action === "CANCEL_REGISTRATION") {
        const updatedReg = await tx.registration.update({
          where: { id: registration.id },
          data: {
            status: RegistrationStatus.CANCELLED,
            cancelledAt: now,
            notes: `Cancelled by admin (${admin.email}): ${reason}`,
          },
        });

        // Cancel pending payments
        await tx.payment.updateMany({
          where: {
            registrationId: registration.id,
            status: { in: [TransactionStatus.CREATED, TransactionStatus.PROCESSING] },
          },
          data: {
            status: TransactionStatus.CANCELLED,
            failureReason: `Admin cancellation: ${reason}`,
          },
        });

        return { registration: updatedReg };
      }

      throw new Error("INVALID_ACTION");
    });

    // Write audit log
    await logAdminAudit(
      AuditAction.PAYMENT_MANUAL_RECONCILE,
      `Action: ${action} for Registration ${registrationId}. Reason: ${reason}. Ref: ${externalReference || "N/A"}`,
      undefined,
      admin.id
    );

    return NextResponse.json({
      success: true,
      message: `Action ${action} executed successfully.`,
      result,
    });
  } catch (error: any) {
    console.error("Admin reconciliation error:", error);
    const msg = error.message || "";
    return NextResponse.json(
      { error: "Reconciliation failed", details: msg },
      { status: 500 }
    );
  }
}
