import { prisma } from "@/lib/prisma";
import { razorpayGateway } from "./razorpay";
import { toMinorUnits } from "./types";
import { TransactionStatus, PaymentStatus, RegistrationStatus, AuditAction } from "@prisma/client";
import { logAdminAudit } from "@/lib/auth";

export const PAYMENT_RESERVATION_TIMEOUT_MINUTES = 30;

/**
 * Check and clean expired reservations for a tournament.
 * Runs atomically when checking capacity without requiring an external cron daemon.
 */
export async function expireStalePendingRegistrations(tournamentId: string) {
  const expiryThreshold = new Date(Date.now() - PAYMENT_RESERVATION_TIMEOUT_MINUTES * 60 * 1000);

  // Find registrations that are PENDING and UNPAID and older than threshold
  await prisma.registration.updateMany({
    where: {
      tournamentId,
      status: RegistrationStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      registeredAt: { lt: expiryThreshold },
    },
    data: {
      status: RegistrationStatus.CANCELLED,
      cancelledAt: new Date(),
      notes: "Auto-cancelled: Registration checkout expired without payment.",
    },
  });
}

/**
 * Generate unique internal payment reference: GP-PAY-YYYY-XXXXX
 */
export function generatePaymentReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 5; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `GP-PAY-${year}-${random}`;
}

export interface InitiateCheckoutInput {
  registrationId: string;
}

/**
 * Initiates an auditable checkout for a golfer registration.
 * Recalculates amount & currency server-side directly from the Tournament record.
 */
export async function initiateCheckout(registrationId: string) {
  return await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      include: {
        tournament: true,
        golfer: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!registration) {
      throw new Error("REGISTRATION_NOT_FOUND");
    }

    if (registration.status === RegistrationStatus.CANCELLED || registration.status === RegistrationStatus.WITHDRAWN) {
      throw new Error("REGISTRATION_CANCELLED");
    }

    if (registration.paymentStatus === PaymentStatus.PAID) {
      throw new Error("ALREADY_PAID");
    }

    const serverAmount = Number(registration.tournament.entryFee);
    const serverCurrency = (registration.tournament.currency || "USD").toUpperCase();

    // If tournament has 0 fee, transition directly to FREE_ENTRY
    if (serverAmount <= 0) {
      const updatedReg = await tx.registration.update({
        where: { id: registration.id },
        data: {
          status: RegistrationStatus.CONFIRMED,
          paymentStatus: PaymentStatus.FREE_ENTRY,
          entryFeePaid: 0,
          currency: serverCurrency,
        },
      });
      return {
        isFree: true,
        registration: updatedReg,
      };
    }

    // Check if an existing open payment order exists created in the last 20 minutes
    const latestPayment = registration.payments[0];
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
    if (
      latestPayment &&
      latestPayment.status === TransactionStatus.CREATED &&
      latestPayment.providerOrderId &&
      latestPayment.createdAt > twentyMinsAgo &&
      Number(latestPayment.amount) === serverAmount &&
      latestPayment.currency === serverCurrency
    ) {
      return {
        isFree: false,
        paymentReference: latestPayment.referenceNumber,
        provider: latestPayment.provider,
        orderId: latestPayment.providerOrderId,
        amount: Number(latestPayment.amount),
        amountMinor: latestPayment.amountMinor,
        currency: latestPayment.currency,
        keyId: razorpayGateway.getKeyId(),
        isConfigured: razorpayGateway.isConfigured(),
      };
    }

    const amountMinor = toMinorUnits(serverAmount, serverCurrency);
    let providerOrderId: string | null = null;
    const isConfigured = razorpayGateway.isConfigured();

    if (isConfigured) {
      const orderRes = await razorpayGateway.createOrder({
        registrationId: registration.id,
        registrationReference: registration.referenceNumber,
        amount: serverAmount,
        currency: serverCurrency,
        golferEmail: registration.golfer.email,
        golferName: `${registration.golfer.firstName} ${registration.golfer.lastName}`,
        tournamentName: registration.tournament.name,
      });
      providerOrderId = orderRes.orderId;
    } else {
      // In development or when credentials are not yet set, generate a pending internal order token
      providerOrderId = `order_sim_${crypto.randomUUID().slice(0, 14)}`;
    }

    let referenceNumber = generatePaymentReference();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await tx.payment.findUnique({ where: { referenceNumber } });
      if (!existing) break;
      referenceNumber = generatePaymentReference();
    }

    const payment = await tx.payment.create({
      data: {
        referenceNumber,
        registrationId: registration.id,
        provider: "RAZORPAY",
        providerOrderId,
        amount: registration.tournament.entryFee,
        currency: serverCurrency,
        amountMinor,
        status: TransactionStatus.CREATED,
        idempotencyKey: `ord_${registration.id}_${Date.now()}`,
      },
    });

    return {
      isFree: false,
      paymentReference: payment.referenceNumber,
      provider: payment.provider,
      orderId: providerOrderId,
      amount: serverAmount,
      amountMinor,
      currency: serverCurrency,
      keyId: razorpayGateway.getKeyId(),
      isConfigured,
    };
  });
}

/**
 * Verifies and finalizes a payment server-side atomically.
 */
export async function finalizePaymentVerification(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const { orderId, paymentId, signature } = params;

  // 1. Verify cryptographic HMAC signature
  const isConfigured = razorpayGateway.isConfigured();
  if (isConfigured) {
    const isValid = razorpayGateway.verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
    });
    if (!isValid) {
      throw new Error("INVALID_PAYMENT_SIGNATURE: Cryptographic signature mismatch.");
    }
  } else {
    // When gateway not configured, fail securely unless in explicit dev/sim mode with dev signature
    if (signature !== "DEV_SIMULATED_SIGNATURE") {
      throw new Error("INVALID_PAYMENT_SIGNATURE: Gateway credentials not configured.");
    }
  }

  // 2. Perform atomic database updates
  return await prisma.$transaction(async (tx) => {
    // Find payment record matching provider order
    const payment = await tx.payment.findFirst({
      where: { providerOrderId: orderId },
      include: {
        registration: {
          include: {
            tournament: true,
            golfer: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error("PAYMENT_RECORD_NOT_FOUND");
    }

    // Idempotency: If already marked SUCCESS, return existing success status
    if (payment.status === TransactionStatus.SUCCESS) {
      return {
        alreadyProcessed: true,
        payment,
        registration: payment.registration,
      };
    }

    // Check if providerPaymentId was already used by another payment
    const existingPaymentWithSameId = await tx.payment.findUnique({
      where: { providerPaymentId: paymentId },
    });
    if (existingPaymentWithSameId && existingPaymentWithSameId.id !== payment.id) {
      throw new Error("DUPLICATE_PAYMENT_ID: This gateway payment ID is already linked to another record.");
    }

    const now = new Date();

    // Update payment record
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: paymentId,
        providerSignature: signature,
        status: TransactionStatus.SUCCESS,
        paidAt: now,
      },
    });

    // Update registration to CONFIRMED and PAID
    const updatedRegistration = await tx.registration.update({
      where: { id: payment.registrationId },
      data: {
        status: RegistrationStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        entryFeePaid: payment.amount,
        currency: payment.currency,
      },
      include: {
        tournament: {
          select: { name: true, hostClub: { select: { name: true } } },
        },
        division: { select: { name: true } },
        golfer: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return {
      alreadyProcessed: false,
      payment: updatedPayment,
      registration: updatedRegistration,
    };
  });
}
