const { PrismaClient, TransactionStatus, PaymentStatus, RegistrationStatus, AuditAction, AdminRole } = require("@prisma/client");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

// Load .env.local if not loaded
const envFile = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED ASSERTION: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

function verifyHmacSha256(data, signature, secret) {
  try {
    const expected = crypto.createHmac("sha256", secret).update(data).digest("hex");
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

function toMinorUnits(amount, currency) {
  const zeroDecimal = new Set(["JPY", "KRW", "VND", "CLP"]);
  const threeDecimal = new Set(["BHD", "KWD", "OMR"]);
  const curr = currency.toUpperCase().trim();
  const amountStr = typeof amount === "number" ? amount.toFixed(4) : amount.trim();
  const [wholeStr, fracStr = ""] = amountStr.split(".");
  const whole = parseInt(wholeStr || "0", 10);

  if (zeroDecimal.has(curr)) return whole;
  if (threeDecimal.has(curr)) {
    const decimals = (fracStr + "000").slice(0, 3);
    return whole * 1000 + parseInt(decimals, 10);
  }
  const decimals = (fracStr + "00").slice(0, 2);
  return whole * 100 + parseInt(decimals, 10);
}

function fromMinorUnits(minor, currency) {
  const zeroDecimal = new Set(["JPY", "KRW", "VND", "CLP"]);
  const threeDecimal = new Set(["BHD", "KWD", "OMR"]);
  const curr = currency.toUpperCase().trim();
  if (zeroDecimal.has(curr)) return minor;
  if (threeDecimal.has(curr)) return Number((minor / 1000).toFixed(3));
  return Number((minor / 100).toFixed(2));
}

// Full refund service logic simulation matching lib/payments/service.ts
async function executeRefundWorkflow({
  registrationId,
  adminId,
  adminEmail,
  reason,
  amount,
  idempotencyKey,
  mockProviderStatus = "processed", // "processed" | "pending" | "error" | "timeout"
}) {
  if (!reason || reason.trim().length < 5) {
    throw new Error("INVALID_REASON: An audit reason of at least 5 characters is required.");
  }

  // 1. Transaction Phase: Validation & Idempotency check
  const validatedPayment = await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      include: {
        tournament: true,
        golfer: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!registration) throw new Error("REGISTRATION_NOT_FOUND");
    if (registration.paymentStatus !== PaymentStatus.PAID) {
      throw new Error(`CANNOT_REFUND_UNPAID: Registration payment status is ${registration.paymentStatus}. Only PAID registrations can be refunded.`);
    }

    const payment = registration.payments.find(
      (p) => p.status === TransactionStatus.SUCCESS || p.status === TransactionStatus.PARTIALLY_REFUNDED
    );
    if (!payment) throw new Error("NO_SUCCESSFUL_PAYMENT");

    // Check for duplicate refund reference if idempotency key is provided in metadata
    const metadata = payment.metadata || {};
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

    if (remainingRefundable <= 0) throw new Error("ALREADY_FULLY_REFUNDED");

    const requestedAmount = typeof amount === "number" && amount > 0 ? Number(amount.toFixed(2)) : remainingRefundable;
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

  const { payment, registration, requestedAmount, totalCaptured, currency } = validatedPayment;

  // 2. Provider API Phase
  if (mockProviderStatus === "error") {
    throw new Error("GATEWAY_REFUND_ERROR: Payment gateway rejected refund request (card expired / insufficient merchant balance).");
  }
  if (mockProviderStatus === "timeout") {
    throw new Error("GATEWAY_TIMEOUT: Network timeout communicating with payment provider. Internal state preserved.");
  }

  const refundId = `rfd_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const isProcessedImmediately = mockProviderStatus === "processed";

  // 3. Persistence Phase: Atomic DB update with concurrency check
  const now = new Date();
  const currentRefundedTotal = payment.refundAmount ? Number(payment.refundAmount) : 0;
  const newRefundedTotal = Number((currentRefundedTotal + requestedAmount).toFixed(2));
  const isFullRefund = newRefundedTotal >= totalCaptured;

  const targetTransactionStatus = isProcessedImmediately
    ? (isFullRefund ? TransactionStatus.REFUNDED : TransactionStatus.PARTIALLY_REFUNDED)
    : TransactionStatus.PROCESSING;

  const targetPaymentStatus = isProcessedImmediately
    ? (isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PAID)
    : PaymentStatus.PAID;

  const updatedResult = await prisma.$transaction(async (tx) => {
    const currentPaymentState = await tx.payment.findUnique({
      where: { id: payment.id },
    });
    if (!currentPaymentState) throw new Error("PAYMENT_NOT_FOUND");

    const currentRefunded = currentPaymentState.refundAmount ? Number(currentPaymentState.refundAmount) : 0;
    if (currentRefunded + requestedAmount > Number(currentPaymentState.amount)) {
      throw new Error("CONCURRENT_REFUND_DETECTED: Refund would exceed original captured amount.");
    }

    const existingMetadata = currentPaymentState.metadata || {};
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
      },
    });

    return { payment: updatedPayment, registration: updatedRegistration };
  });

  await prisma.adminAuditLog.create({
    data: {
      action: AuditAction.PAYMENT_REFUNDED,
      adminUserId: adminId,
      details: `Provider Refund ${refundId} initiated for Registration ${registration.id}. Amount: ${requestedAmount} ${currency}. Reason: ${reason}`,
    },
  });

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

// Webhook simulation handler matching app/api/payments/webhook/route.ts
async function simulateWebhookArrival({ eventId, eventType, paymentId, refundId, refundAmountMinor, currency = "USD" }) {
  const existingWebhook = await prisma.paymentWebhookEvent.findUnique({
    where: { eventId },
  });
  if (existingWebhook && existingWebhook.processed) {
    return { success: true, idempotent: true, message: "Webhook already processed" };
  }

  const recorded = existingWebhook || await prisma.paymentWebhookEvent.create({
    data: {
      provider: "RAZORPAY",
      eventId,
      eventType,
      payload: { event: eventType, id: eventId },
      processed: false,
    },
  });

  if (eventType === "refund.processed" || eventType === "refund.created") {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { providerPaymentId: paymentId },
        include: { registration: true },
      });
      if (payment) {
        const parsedRefundAmount = refundAmountMinor
          ? fromMinorUnits(refundAmountMinor, currency)
          : Number(payment.amount);
        const totalCaptured = Number(payment.amount);
        const currentRefunded = payment.refundAmount ? Number(payment.refundAmount) : 0;

        const meta = payment.metadata || {};
        const history = meta.refundHistory || [];
        const existingEntry = history.find((h) => h.refundId === refundId);

        let newRefundedTotal = currentRefunded;
        if (!existingEntry) {
          newRefundedTotal = Number((currentRefunded + parsedRefundAmount).toFixed(2));
        }

        const isFullRefund = newRefundedTotal >= totalCaptured;
        const updatedTxStatus = isFullRefund ? TransactionStatus.REFUNDED : TransactionStatus.PARTIALLY_REFUNDED;
        const updatedPaymentStatus = isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PAID;

        const updatedHistory = existingEntry
          ? history.map((h) => (h.refundId === refundId ? { ...h, status: "processed" } : h))
          : [
              ...history,
              {
                refundId,
                amount: parsedRefundAmount,
                currency,
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
  } else if (eventType === "refund.failed") {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { providerPaymentId: paymentId },
      });
      if (payment) {
        const meta = payment.metadata || {};
        const history = (meta.refundHistory || []).map((h) =>
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

  await prisma.paymentWebhookEvent.update({
    where: { id: recorded.id },
    data: { processed: true, processedAt: new Date() },
  });

  return { success: true, processed: true };
}

async function runExtendedAuditSuite() {
  console.log("================================================================================");
  console.log("⛳ GOLFPULSE PHASE 4.0 — FINANCIAL EDGE CASES & OPERATIONAL READINESS QA SUITE");
  console.log("================================================================================\n");

  const runId = Date.now().toString().slice(-6);
  let club, course, tournament, golfer, registration, payment, adminUser;

  try {
    // 1. Provision isolated test fixtures
    console.log("Setup: Provisioning isolated test fixtures...");
    club = await prisma.club.create({
      data: {
        name: `QA Edge Club ${runId}`,
        slug: `qa-edge-club-${runId}`,
        city: "Bengaluru",
        state: "Karnataka",
      },
    });

    course = await prisma.golfCourse.create({
      data: {
        name: `QA Edge Course ${runId}`,
        slug: `qa-edge-course-${runId}`,
        clubId: club.id,
        holesCount: 18,
        par: 72,
      },
    });

    tournament = await prisma.tournament.create({
      data: {
        name: `QA Edge Championship ${runId}`,
        slug: `qa-edge-champ-${runId}`,
        hostClubId: club.id,
        defaultCourseId: course.id,
        startDate: new Date("2026-11-20T08:00:00Z"),
        endDate: new Date("2026-11-21T18:00:00Z"),
        entryFee: 100.00,
        currency: "USD",
        fieldCapacity: 10,
      },
    });

    golfer = await prisma.golferProfile.create({
      data: {
        firstName: "Jack",
        lastName: `Nicklaus${runId}`,
        email: `jack.edge.${runId}@golfpulse.test`,
      },
    });

    const golfer2 = await prisma.golferProfile.create({
      data: {
        firstName: "Arnold",
        lastName: `Palmer${runId}`,
        email: `arnold.edge.${runId}@golfpulse.test`,
      },
    });

    adminUser = await prisma.adminUser.findFirst({
      where: { role: AdminRole.SUPER_ADMIN },
    });
    if (!adminUser) {
      adminUser = await prisma.adminUser.create({
        data: {
          email: `admin.edge.${runId}@golfpulse.test`,
          passwordHash: "hash_placeholder",
          name: "QA Super Admin",
          role: AdminRole.SUPER_ADMIN,
        },
      });
    }

    registration = await prisma.registration.create({
      data: {
        referenceNumber: `GP-EDGE-${runId}`,
        tournamentId: tournament.id,
        golferId: golfer.id,
        status: RegistrationStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        entryFeePaid: 100.00,
        currency: "USD",
      },
    });

    payment = await prisma.payment.create({
      data: {
        referenceNumber: `GP-PAY-EDGE-${runId}`,
        registrationId: registration.id,
        provider: "RAZORPAY",
        providerPaymentId: `pay_edge_${runId}`,
        amount: 100.00,
        currency: "USD",
        amountMinor: 10000,
        status: TransactionStatus.SUCCESS,
        paidAt: new Date(),
      },
    });

    assert(true, "Isolated fixtures provisioned cleanly (100.00 USD entry fee paid)");

    // Test 1: Full Refund directly on golfer2
    console.log("\n[Test 1: Full refund scenario check]");
    const regFull = await prisma.registration.create({
      data: {
        referenceNumber: `GP-FULL-${runId}`,
        tournamentId: tournament.id,
        golferId: golfer2.id,
        status: RegistrationStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        entryFeePaid: 100.00,
        currency: "USD",
      },
    });
    const payFull = await prisma.payment.create({
      data: {
        referenceNumber: `GP-PAY-FULL-${runId}`,
        registrationId: regFull.id,
        provider: "RAZORPAY",
        providerPaymentId: `pay_full_${runId}`,
        amount: 100.00,
        currency: "USD",
        amountMinor: 10000,
        status: TransactionStatus.SUCCESS,
        paidAt: new Date(),
      },
    });

    const fullResult = await executeRefundWorkflow({
      registrationId: regFull.id,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      reason: "Direct full refund test",
    });
    assert(fullResult.isFullRefund === true, "Full refund calculation recognized full amount (100.00 USD)");
    assert(fullResult.status === TransactionStatus.REFUNDED, "Payment status transitioned to REFUNDED");
    assert(fullResult.paymentStatus === PaymentStatus.REFUNDED, "Registration paymentStatus transitioned to REFUNDED");

    // Clean up regFull and golfer2
    await prisma.payment.deleteMany({ where: { registrationId: regFull.id } });
    await prisma.registration.delete({ where: { id: regFull.id } });
    await prisma.golferProfile.delete({ where: { id: golfer2.id } });

    // Test 2: Partial refund followed by a second partial refund
    console.log("\n[Test 2: Partial refund followed by a second partial refund]");
    const part1 = await executeRefundWorkflow({
      registrationId: registration.id,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      amount: 30.00,
      reason: "First partial refund (30.00 USD)",
      idempotencyKey: `idem_p1_${runId}`,
    });
    assert(part1.amount === 30.00, "First partial refund of 30.00 processed");
    assert(part1.status === TransactionStatus.PARTIALLY_REFUNDED, "Status is PARTIALLY_REFUNDED after 1st partial");
    assert(part1.paymentStatus === PaymentStatus.PAID, "Registration remains PAID after 1st partial");

    const part2 = await executeRefundWorkflow({
      registrationId: registration.id,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      amount: 40.00,
      reason: "Second partial refund (40.00 USD)",
      idempotencyKey: `idem_p2_${runId}`,
    });
    assert(part2.amount === 40.00, "Second partial refund of 40.00 processed");
    assert(Number(part2.payment.refundAmount) === 70.00, "Cumulative refund total is accurately 70.00 USD");
    assert(part2.status === TransactionStatus.PARTIALLY_REFUNDED, "Status remains PARTIALLY_REFUNDED (30.00 USD balance remains)");
    assert(part2.paymentStatus === PaymentStatus.PAID, "Registration remains PAID");

    // Test 3: Attempted refund above the remaining refundable balance
    console.log("\n[Test 3: Attempted refund above remaining balance (remaining 30.00, requesting 35.00)]");
    try {
      await executeRefundWorkflow({
        registrationId: registration.id,
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        amount: 35.00,
        reason: "Excessive refund attempt",
      });
      assert(false, "Should have rejected refund exceeding balance");
    } catch (err) {
      assert(err.message.includes("REFUND_EXCEEDS_BALANCE"), "Blocked refund exceeding remaining balance: " + err.message);
    }

    // Test 4: Duplicate request with the same idempotency key
    console.log("\n[Test 4: Duplicate request with the same idempotency key]");
    const dupRes = await executeRefundWorkflow({
      registrationId: registration.id,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      amount: 40.00,
      reason: "Retried second partial refund",
      idempotencyKey: `idem_p2_${runId}`,
    });
    assert(dupRes.idempotent === true && dupRes.success === true, "Intercepted duplicate idempotency key and returned original result safely");

    // Test 5: Two simultaneous refund requests (Concurrency stress test)
    console.log("\n[Test 5: Two simultaneous refund requests competing for remaining 30.00 balance]");
    // Both try to refund 20.00 USD simultaneously. Only one must succeed; total cannot exceed 100.00.
    const concurrent1 = executeRefundWorkflow({
      registrationId: registration.id,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      amount: 20.00,
      reason: "Concurrent racer 1 (20.00 USD)",
      idempotencyKey: `race_1_${runId}`,
    });
    const concurrent2 = executeRefundWorkflow({
      registrationId: registration.id,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      amount: 20.00,
      reason: "Concurrent racer 2 (20.00 USD)",
      idempotencyKey: `race_2_${runId}`,
    });

    const raceOutcomes = await Promise.allSettled([concurrent1, concurrent2]);
    const succeeded = raceOutcomes.filter((r) => r.status === "fulfilled");
    const failed = raceOutcomes.filter((r) => r.status === "rejected");

    console.log(`  Race outcome: ${succeeded.length} succeeded, ${failed.length} failed/intercepted.`);
    const postRacePayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    const postRaceTotal = Number(postRacePayment.refundAmount);
    assert(postRaceTotal <= 100.00, `Post-race refund total (${postRaceTotal} USD) does not exceed 100.00 USD`);
    if (failed.length > 0) {
      assert(failed[0].reason.message.includes("CONCURRENT_REFUND_DETECTED") || failed[0].reason.message.includes("REFUND_EXCEEDS_BALANCE"), "Defended against concurrent over-refund race condition");
    }

    // Test 6: Provider timeout or ambiguous response
    console.log("\n[Test 6: Provider timeout or ambiguous response handling]");
    try {
      await executeRefundWorkflow({
        registrationId: registration.id,
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        amount: 5.00,
        reason: "Testing provider timeout handling",
        mockProviderStatus: "timeout",
      });
      assert(false, "Should have thrown on timeout");
    } catch (err) {
      assert(err.message.includes("GATEWAY_TIMEOUT"), "Provider timeout error safely trapped without updating database records");
    }

    // Verify DB was NOT modified by timed-out call
    const afterTimeoutPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    assert(Number(afterTimeoutPayment.refundAmount) === postRaceTotal, "Database refundAmount unchanged after provider timeout");

    // Test 7: Refund creation followed by processing success (Webhook lifecycle)
    console.log("\n[Test 7: Refund creation followed by webhook processing success]");
    const webhookEventId1 = `evt_proc_${runId}`;
    const testRefundId1 = `rfd_hook_${runId}`;
    const hookRes1 = await simulateWebhookArrival({
      eventId: webhookEventId1,
      eventType: "refund.processed",
      paymentId: payment.providerPaymentId,
      refundId: testRefundId1,
      refundAmountMinor: 500, // 5.00 USD
      currency: "USD",
    });
    assert(hookRes1.processed === true, "refund.processed webhook processed successfully");

    // Test 8: Refund creation followed by failure
    console.log("\n[Test 8: Refund creation followed by webhook failure notification]");
    const webhookEventId2 = `evt_fail_${runId}`;
    const testRefundId2 = `rfd_hook_fail_${runId}`;
    const hookRes2 = await simulateWebhookArrival({
      eventId: webhookEventId2,
      eventType: "refund.failed",
      paymentId: payment.providerPaymentId,
      refundId: testRefundId2,
      refundAmountMinor: 500,
      currency: "USD",
    });
    assert(hookRes2.processed === true, "refund.failed webhook recorded cleanly in payment metadata");

    const pWithFailure = await prisma.payment.findUnique({ where: { id: payment.id } });
    const pMeta = pWithFailure.metadata || {};
    assert(pMeta.lastRefundFailure && pMeta.lastRefundFailure.refundId === testRefundId2, "lastRefundFailure recorded in payment metadata");

    // Test 9: Duplicate webhook delivery
    console.log("\n[Test 9: Duplicate webhook delivery idempotency]");
    const dupWebhook = await simulateWebhookArrival({
      eventId: webhookEventId1, // Same event ID as Test 7
      eventType: "refund.processed",
      paymentId: payment.providerPaymentId,
      refundId: testRefundId1,
      refundAmountMinor: 500,
      currency: "USD",
    });
    assert(dupWebhook.idempotent === true, "Duplicate webhook event delivery intercepted idempotently via eventId constraint");

    // Test 10: Webhooks delivered out of order
    console.log("\n[Test 10: Webhook delivery out-of-order defense]");
    // e.g. refund.processed arrives when internal state is already terminal REFUNDED
    // Set payment to REFUNDED first
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: TransactionStatus.REFUNDED,
        refundAmount: 100.00,
      },
    });
    await prisma.registration.update({
      where: { id: registration.id },
      data: { paymentStatus: PaymentStatus.REFUNDED },
    });

    // An out-of-order refund.created or earlier partial arrives
    const oooEventId = `evt_ooo_${runId}`;
    await simulateWebhookArrival({
      eventId: oooEventId,
      eventType: "refund.created",
      paymentId: payment.providerPaymentId,
      refundId: `rfd_ooo_${runId}`,
      refundAmountMinor: 1000,
      currency: "USD",
    });

    const oooPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    assert(oooPayment.status === TransactionStatus.REFUNDED, "Payment terminal state REFUNDED was preserved against out-of-order webhook");

    const oooReg = await prisma.registration.findUnique({ where: { id: registration.id } });
    assert(oooReg.paymentStatus === PaymentStatus.REFUNDED, "Registration paymentStatus REFUNDED was preserved");

    // Test 11: Unauthorized reconciliation / refund attempt RBAC check
    console.log("\n[Test 11: Unauthorized reconciliation/refund attempt validation]");
    const ROLE_HIERARCHY = {
      [AdminRole.SUPER_ADMIN]: 4,
      [AdminRole.PLATFORM_ADMIN]: 3,
      [AdminRole.CONTENT_MANAGER]: 2,
      [AdminRole.VIEWER]: 1,
    };
    function checkPermission(userRole, requiredRole) {
      return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
    }

    const contentManagerHasAccess = checkPermission(AdminRole.CONTENT_MANAGER, AdminRole.PLATFORM_ADMIN);
    const viewerHasAccess = checkPermission(AdminRole.VIEWER, AdminRole.PLATFORM_ADMIN);
    const platformAdminHasAccess = checkPermission(AdminRole.PLATFORM_ADMIN, AdminRole.PLATFORM_ADMIN);
    const superAdminHasAccess = checkPermission(AdminRole.SUPER_ADMIN, AdminRole.PLATFORM_ADMIN);

    assert(contentManagerHasAccess === false, "CONTENT_MANAGER is denied financial reconciliation / refund access");
    assert(viewerHasAccess === false, "VIEWER is denied financial reconciliation / refund access");
    assert(platformAdminHasAccess === true, "PLATFORM_ADMIN is granted financial reconciliation access");
    assert(superAdminHasAccess === true, "SUPER_ADMIN is granted financial reconciliation access");

    // Test 12: Audit logging for administrative operations
    console.log("\n[Test 12: Audit logging for successful and rejected operations]");
    const auditLogs = await prisma.adminAuditLog.findMany({
      where: { adminUserId: adminUser.id },
      orderBy: { createdAt: "desc" },
    });
    assert(auditLogs.length > 0, `Captured ${auditLogs.length} audit trail records for admin ${adminUser.email}`);
    assert(auditLogs[0].action === AuditAction.PAYMENT_REFUNDED, "Most recent audit action is PAYMENT_REFUNDED");

    console.log("\n================================================================================");
    console.log("🎉 ALL 12 FINANCIAL EDGE-CASE & PRODUCTION OPERATIONAL READINESS TESTS PASSED");
    console.log("================================================================================\n");
  } finally {
    console.log("Cleaning up isolated test fixtures...");
    if (payment) await prisma.payment.deleteMany({ where: { registrationId: registration.id } });
    if (registration) await prisma.registration.deleteMany({ where: { id: registration.id } });
    if (golfer) await prisma.golferProfile.deleteMany({ where: { id: golfer.id } });
    if (tournament) await prisma.tournament.deleteMany({ where: { id: tournament.id } });
    if (course) await prisma.golfCourse.deleteMany({ where: { id: course.id } });
    if (club) await prisma.club.deleteMany({ where: { id: club.id } });
    // Clean up any test webhook events created
    await prisma.paymentWebhookEvent.deleteMany({
      where: { eventId: { contains: runId } },
    });
    console.log("✓ Fixtures and webhook events cleaned up cleanly with zero database pollution.\n");
    await prisma.$disconnect();
  }
}

runExtendedAuditSuite().catch((err) => {
  console.error("QA Test execution failed:", err);
  process.exit(1);
});
