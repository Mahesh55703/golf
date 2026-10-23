import { prisma } from "@/lib/prisma";
import { razorpayGateway } from "./razorpay";
import { toMinorUnits, fromMinorUnits } from "./types";
import { TransactionStatus, PaymentStatus, RegistrationStatus, AuditAction } from "@prisma/client";
import { logAdminAudit } from "@/lib/auth";
import { deriveTournamentLifecycle } from "@/lib/tournament-lifecycle";

export const PAYMENT_RESERVATION_TIMEOUT_MINUTES = 30;

/**
 * Checks whether the current deployment/runtime is strictly a Vercel Preview deployment.
 * Never relies on NODE_ENV alone.
 */
export function isVercelPreviewEnvironment(): boolean {
  return (
    process.env.VERCEL === "1" &&
    process.env.VERCEL_ENV === "preview"
  );
}

/**
 * Checks whether simulated payment flow is permitted.
 * STRICT SECURITY INVARIANT:
 * - Production (process.env.VERCEL_ENV === "production" OR process.env.NODE_ENV === "production")
 *   strictly and unconditionally forbids payment simulation regardless of any flags.
 * - On Vercel Preview deployments, simulation is only allowed when explicitly opted in via
 *   ENABLE_PAYMENT_SIMULATION === "true".
 * - On local development (non-Vercel, NODE_ENV === "development"), simulation is allowed only
 *   when ENABLE_PAYMENT_SIMULATION === "true".
 */
export function isPaymentSimulationAllowed(): boolean {
  // 1. Unconditional production kill-switch
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    // Exception: If running in a Vercel Preview deployment, Vercel sets NODE_ENV=production,
    // but VERCEL_ENV is explicitly "preview". Check that strictly.
    if (isVercelPreviewEnvironment()) {
      return process.env.ENABLE_PAYMENT_SIMULATION === "true";
    }
    return false;
  }

  // 2. Vercel Preview deployment (when NODE_ENV is not production or any other state)
  if (isVercelPreviewEnvironment()) {
    return process.env.ENABLE_PAYMENT_SIMULATION === "true";
  }

  // 3. Local development environment
  if (process.env.NODE_ENV === "development" && !process.env.VERCEL) {
    return process.env.ENABLE_PAYMENT_SIMULATION === "true";
  }

  return false;
}

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
        tournament: {
          include: {
            _count: {
              select: {
                registrations: {
                  where: {
                    status: { in: [RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING] },
                  },
                },
              },
            },
          },
        },
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

    // Authoritative check: tournament must be active and eligible for registration and checkout
    const lifecycle = deriveTournamentLifecycle({
      status: registration.tournament.status,
      startDate: registration.tournament.startDate,
      endDate: registration.tournament.endDate,
      registrationOpenAt: registration.tournament.registrationOpenAt,
      registrationCloseAt: registration.tournament.registrationCloseAt,
      fieldCapacity: registration.tournament.fieldCapacity,
      registrationsCount: registration.tournament._count?.registrations,
      timeZone: registration.tournament.timeZone,
      publishedAt: registration.tournament.publishedAt,
    });

    if (!lifecycle.canRegister) {
      throw new Error(lifecycle.rejectionCode || "REGISTRATION_NOT_OPEN");
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
      // In production or when simulation is not permitted, never return a simulated order
      if (latestPayment.providerOrderId.startsWith("order_sim_") && !isPaymentSimulationAllowed()) {
        // Drop into standard flow to create a real gateway order or reject if not configured
      } else {
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
          isSimulation: latestPayment.providerOrderId.startsWith("order_sim_"),
        };
      }
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
      // In production or when simulation is not explicitly enabled, reject immediately
      if (!isPaymentSimulationAllowed()) {
        throw new Error(
          "PAYMENT_GATEWAY_UNAVAILABLE: Razorpay payment gateway is not configured on the server. Paid tournament registrations are temporarily unavailable."
        );
      }
      // Non-production explicitly opted into simulation via ENABLE_PAYMENT_SIMULATION="true"
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
      isSimulation: !isConfigured && isPaymentSimulationAllowed(),
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

  // 1. Production Security Enforcement: Block simulated values
  // Simulation is only allowed if isPaymentSimulationAllowed() evaluates to true (Preview or local dev).
  // In production or any non-simulation environment, any simulated tokens are strictly rejected.
  if (!isPaymentSimulationAllowed()) {
    if (
      signature === "DEV_SIMULATED_SIGNATURE" ||
      orderId.startsWith("order_sim_") ||
      paymentId.startsWith("pay_sim_")
    ) {
      throw new Error(
        "INVALID_PAYMENT_SIGNATURE: Payment simulation is strictly prohibited in production."
      );
    }
  }

  // 2. Verify cryptographic HMAC signature
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
    // When gateway not configured, fail securely unless in non-production with explicit simulation enabled
    if (!isPaymentSimulationAllowed() || signature !== "DEV_SIMULATED_SIGNATURE") {
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
    const isSimulatedTransaction = orderId.startsWith("order_sim_") || paymentId.startsWith("pay_sim_");
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: paymentId,
        providerSignature: signature,
        status: TransactionStatus.SUCCESS,
        paidAt: now,
        metadata: {
          ...(typeof payment.metadata === "object" && payment.metadata !== null ? payment.metadata : {}),
          ...(isSimulatedTransaction ? { simulation: true, mode: "DEV_SIMULATION" } : {}),
        },
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

export interface InitiateRefundInput {
  registrationId: string;
  adminId: string;
  adminEmail: string;
  reason: string;
  amount?: number; // Major unit (e.g. 50.00). If omitted, full refund of remaining balance
  idempotencyKey?: string;
  externalReference?: string;
}

/**
 * Initiates a provider-backed refund using the official Razorpay SDK.
 * Validates remaining refundable balance, prevents concurrent/duplicate refunds,
 * and maintains atomic consistency between Payment and Registration models.
 */
export async function initiateProviderRefund(input: InitiateRefundInput) {
  const { registrationId, adminId, adminEmail, reason, idempotencyKey } = input;

  if (!reason || reason.trim().length < 5) {
    throw new Error("INVALID_REASON: An audit reason of at least 5 characters is required.");
  }

  // 1. Transaction Phase: Validate eligibility and lock/record intent
  const validatedPayment = await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      include: {
        tournament: true,
        golfer: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!registration) {
      throw new Error("REGISTRATION_NOT_FOUND");
    }

    if (registration.paymentStatus !== PaymentStatus.PAID) {
      throw new Error(`CANNOT_REFUND_UNPAID: Registration payment status is ${registration.paymentStatus}. Only PAID registrations can be refunded.`);
    }

    // Find the payment associated with this registration
    const payment = registration.payments.find(
      (p) => p.status === TransactionStatus.SUCCESS || p.status === TransactionStatus.PARTIALLY_REFUNDED
    );
    if (!payment) {
      throw new Error("NO_SUCCESSFUL_PAYMENT: No captured or partially refunded payment found for this registration.");
    }

    // Check for duplicate refund reference if idempotency key is provided in metadata
    const metadata = (payment.metadata as any) || {};
    if (idempotencyKey && metadata.lastRefundIdempotencyKey === idempotencyKey && payment.refundReference) {
      return {
        isDuplicate: true,
        payment,
        registration,
        refundReference: payment.refundReference,
        status: payment.status,
      };
    }

    const totalCaptured = Number(payment.amount);
    const alreadyRefunded = payment.refundAmount ? Number(payment.refundAmount) : 0;
    const remainingRefundable = Number((totalCaptured - alreadyRefunded).toFixed(2));

    if (remainingRefundable <= 0) {
      throw new Error("ALREADY_FULLY_REFUNDED: Remaining refundable balance is 0.00.");
    }

    const requestedAmount = typeof input.amount === "number" && input.amount > 0 ? Number(input.amount.toFixed(2)) : remainingRefundable;

    if (requestedAmount > remainingRefundable) {
      throw new Error(`REFUND_EXCEEDS_BALANCE: Requested ${requestedAmount} ${payment.currency} exceeds remaining balance of ${remainingRefundable} ${payment.currency}.`);
    }

    return {
      isDuplicate: false,
      payment,
      registration,
      requestedAmount,
      remainingRefundable,
      totalCaptured,
      currency: payment.currency,
    };
  });

  if (validatedPayment.isDuplicate) {
    return {
      success: true,
      idempotent: true,
      refundId: validatedPayment.refundReference,
      status: validatedPayment.status,
      message: "Refund request was already processed idempotently.",
    };
  }

  const payment = validatedPayment.payment;
  const registration = validatedPayment.registration;
  const requestedAmount: number = validatedPayment.requestedAmount!;
  const totalCaptured: number = validatedPayment.totalCaptured!;
  const currency: string = validatedPayment.currency!;
  const isGatewayConfigured = razorpayGateway.isConfigured() && payment.provider === "RAZORPAY" && Boolean(payment.providerPaymentId);

  const amountMinor = toMinorUnits(requestedAmount, currency);
  let refundId: string;
  let isProcessedImmediately = false;

  // 2. Provider API Phase: Call Razorpay API if live/configured or simulated
  if (isGatewayConfigured && payment.providerPaymentId) {
    try {
      const receipt = `RFD-${registration.referenceNumber.replace(/[^A-Za-z0-9_-]/g, "")}-${Date.now().toString().slice(-4)}`.slice(0, 40);
      const res = await razorpayGateway.createRefund({
        paymentId: payment.providerPaymentId,
        amountMinor,
        receipt,
        notes: {
          registrationId: registration.id,
          registrationReference: registration.referenceNumber,
          tournamentName: registration.tournament.name.slice(0, 50),
          reason: reason.slice(0, 50),
          refundedBy: adminEmail,
        },
      });

      refundId = res.refundId;
      isProcessedImmediately = res.status === "processed";
    } catch (err: any) {
      console.error("Provider refund execution error:", err);
      throw new Error(err.message || "Failed to execute provider refund with gateway.");
    }
  } else {
    // Manual reconciliation or simulated test mode
    refundId = input.externalReference || `rfd_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    isProcessedImmediately = true;
  }

  // 3. Persistence Phase: Atomically update Payment, Registration, and Audit log
  const now = new Date();
  const currentRefundedTotal = payment.refundAmount ? Number(payment.refundAmount) : 0;
  const newRefundedTotal = Number((currentRefundedTotal + requestedAmount).toFixed(2));
  const isFullRefund = newRefundedTotal >= totalCaptured;

  const targetTransactionStatus = isProcessedImmediately
    ? (isFullRefund ? TransactionStatus.REFUNDED : TransactionStatus.PARTIALLY_REFUNDED)
    : TransactionStatus.PROCESSING; // Kept in PROCESSING until provider webhook confirms

  const targetPaymentStatus = isProcessedImmediately
    ? (isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PAID)
    : PaymentStatus.PAID;

  const updatedResult = await prisma.$transaction(async (tx) => {
    // Concurrency defense: re-check refundable balance inside lock
    const currentPaymentState = await tx.payment.findUnique({
      where: { id: payment.id },
    });

    if (!currentPaymentState) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    const currentRefunded = currentPaymentState.refundAmount ? Number(currentPaymentState.refundAmount) : 0;
    if (currentRefunded + requestedAmount > Number(currentPaymentState.amount)) {
      throw new Error("CONCURRENT_REFUND_DETECTED: Refund would exceed original captured amount.");
    }

    const existingMetadata = (currentPaymentState.metadata as any) || {};
    const updatedMetadata = {
      ...existingMetadata,
      lastRefundIdempotencyKey: idempotencyKey || null,
      refundHistory: [
        ...(existingMetadata.refundHistory || []),
        {
          refundId,
          amount: requestedAmount,
          currency,
          reason,
          refundedBy: adminEmail,
          refundedAt: now.toISOString(),
          status: isProcessedImmediately ? "processed" : "pending",
        },
      ],
    };

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: targetTransactionStatus,
        refundedAt: now,
        refundReference: refundId,
        refundAmount: newRefundedTotal,
        metadata: updatedMetadata,
      },
    });

    const updatedRegistration = await tx.registration.update({
      where: { id: registration.id },
      data: {
        paymentStatus: targetPaymentStatus,
        notes: [
          registration.notes || "",
          `[${now.toISOString()}] Refund of ${requestedAmount.toFixed(2)} ${currency} (${refundId}): ${reason} (by ${adminEmail})`
        ].filter(Boolean).join(" | "),
      },
    });

    return {
      payment: updatedPayment,
      registration: updatedRegistration,
    };
  });

  // 4. Admin Audit Trail
  await logAdminAudit(
    AuditAction.PAYMENT_REFUNDED,
    `Provider Refund ${refundId} initiated for Registration ${registration.id} (${registration.referenceNumber}). Amount: ${requestedAmount} ${currency}. Reason: ${reason}`,
    undefined,
    adminId
  );

  return {
    success: true,
    refundId,
    amount: requestedAmount,
    currency,
    status: targetTransactionStatus,
    paymentStatus: targetPaymentStatus,
    isFullRefund,
    isProcessedImmediately,
    payment: updatedResult.payment,
    registration: updatedResult.registration,
  };
}
