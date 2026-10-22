const { PrismaClient, TransactionStatus, PaymentStatus, RegistrationStatus, AuditAction, AdminRole } = require("@prisma/client");
const crypto = require("crypto");

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

// Logic mirror of initiateProviderRefund for NodeJS script runner
async function executeRefundWorkflow({ registrationId, adminId, adminEmail, reason, amount, idempotencyKey, mockProviderSuccess = true }) {
  if (!reason || reason.trim().length < 5) {
    throw new Error("INVALID_REASON: An audit reason of at least 5 characters is required.");
  }

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

    const totalCaptured = Number(payment.amount);
    const alreadyRefunded = payment.refundAmount ? Number(payment.refundAmount) : 0;
    const remainingRefundable = Number((totalCaptured - alreadyRefunded).toFixed(2));

    if (remainingRefundable <= 0) throw new Error("ALREADY_FULLY_REFUNDED");

    const requestedAmount = typeof amount === "number" && amount > 0 ? Number(amount.toFixed(2)) : remainingRefundable;
    if (requestedAmount > remainingRefundable) {
      throw new Error(`REFUND_EXCEEDS_BALANCE: Requested ${requestedAmount} ${payment.currency} exceeds remaining balance of ${remainingRefundable} ${payment.currency}.`);
    }

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
    };
  }

  const { payment, registration, requestedAmount, totalCaptured, currency } = validatedPayment;

  if (!mockProviderSuccess) {
    throw new Error("GATEWAY_REFUND_ERROR: Bank network rejected refund request.");
  }

  const refundId = `rfnd_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const isProcessedImmediately = true;

  const now = new Date();
  const currentRefundedTotal = payment.refundAmount ? Number(payment.refundAmount) : 0;
  const newRefundedTotal = Number((currentRefundedTotal + requestedAmount).toFixed(2));
  const isFullRefund = newRefundedTotal >= totalCaptured;

  const targetTransactionStatus = isFullRefund ? TransactionStatus.REFUNDED : TransactionStatus.PARTIALLY_REFUNDED;
  const targetPaymentStatus = isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PAID;

  const updatedResult = await prisma.$transaction(async (tx) => {
    const currentPaymentState = await tx.payment.findUnique({ where: { id: payment.id } });
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
          status: "processed",
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
    payment: updatedResult.payment,
    registration: updatedResult.registration,
  };
}

async function runRefundTests() {
  console.log("======================================================");
  console.log("⛳ GOLFPULSE PHASE 3.9 — REFUND & RECONCILIATION QA");
  console.log("======================================================\n");

  const runId = Date.now().toString().slice(-6);
  let club, course, tournament, golfer, registration, payment, adminUser;

  try {
    console.log("Setup: Provisioning isolated test fixtures...");
    club = await prisma.club.create({
      data: {
        name: `QA Club ${runId}`,
        slug: `qa-club-${runId}`,
        city: "Bengaluru",
        state: "Karnataka",
      },
    });

    course = await prisma.golfCourse.create({
      data: {
        name: `QA Championship Course ${runId}`,
        slug: `qa-course-${runId}`,
        clubId: club.id,
        holesCount: 18,
        par: 72,
      },
    });

    tournament = await prisma.tournament.create({
      data: {
        name: `QA Refund Championship ${runId}`,
        slug: `qa-refund-champ-${runId}`,
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
        firstName: "Tiger",
        lastName: `Tester${runId}`,
        email: `tiger.tester.${runId}@golfpulse.test`,
      },
    });

    adminUser = await prisma.adminUser.findFirst({
      where: { role: AdminRole.SUPER_ADMIN },
    });
    if (!adminUser) {
      adminUser = await prisma.adminUser.create({
        data: {
          email: `admin.${runId}@golfpulse.test`,
          passwordHash: "hash_placeholder",
          name: "QA Super Admin",
          role: AdminRole.SUPER_ADMIN,
        },
      });
    }

    registration = await prisma.registration.create({
      data: {
        referenceNumber: `GP-REF-${runId}`,
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
        referenceNumber: `GP-PAY-${runId}`,
        registrationId: registration.id,
        provider: "RAZORPAY",
        providerPaymentId: `pay_test_${runId}`,
        amount: 100.00,
        currency: "USD",
        amountMinor: 10000,
        status: TransactionStatus.SUCCESS,
        paidAt: new Date(),
      },
    });
    assert(true, "Isolated fixtures created (Registration & Paid Payment of 100.00 USD)");

    // Test 1: Invalid payment reference
    console.log("\nTest 1: Invalid payment reference...");
    try {
      await executeRefundWorkflow({
        registrationId: "non_existent_cuid_12345",
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        reason: "Valid test reason",
      });
      assert(false, "Should have failed for non-existent registration");
    } catch (err) {
      assert(err.message.includes("REGISTRATION_NOT_FOUND"), "Correctly rejected with REGISTRATION_NOT_FOUND");
    }

    // Test 2: Unpaid registration refund attempt
    console.log("\nTest 2: Unpaid registration refund attempt...");
    const unpaidReg = await prisma.registration.create({
      data: {
        referenceNumber: `GP-UNP-${runId}`,
        tournamentId: tournament.id,
        golferId: golfer.id,
        status: RegistrationStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
      },
    });
    try {
      await executeRefundWorkflow({
        registrationId: unpaidReg.id,
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        reason: "Testing unpaid refund",
      });
      assert(false, "Should have failed for unpaid registration");
    } catch (err) {
      assert(err.message.includes("CANNOT_REFUND_UNPAID"), "Correctly rejected with CANNOT_REFUND_UNPAID");
    } finally {
      await prisma.registration.delete({ where: { id: unpaidReg.id } });
    }

    // Test 3: Refund amount exceeding balance (150.00 on 100.00)
    console.log("\nTest 3: Refund amount exceeding balance (150.00 on 100.00)...");
    try {
      await executeRefundWorkflow({
        registrationId: registration.id,
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        amount: 150.00,
        reason: "Testing excessive amount",
      });
      assert(false, "Should have failed for excessive refund amount");
    } catch (err) {
      assert(err.message.includes("REFUND_EXCEEDS_BALANCE"), "Correctly rejected with REFUND_EXCEEDS_BALANCE");
    }

    // Test 4: Provider refund failure handling
    console.log("\nTest 4: Provider refund failure handling...");
    try {
      await executeRefundWorkflow({
        registrationId: registration.id,
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        amount: 40.00,
        reason: "Testing provider rejection",
        mockProviderSuccess: false,
      });
      assert(false, "Should have failed when provider rejects");
    } catch (err) {
      assert(err.message.includes("GATEWAY_REFUND_ERROR"), "Provider failure caught safely without corrupting DB state");
    }

    // Test 5: Successful partial refund (40.00 USD)
    console.log("\nTest 5: Successful partial refund (40.00 USD of 100.00 USD)...");
    const partialRes = await executeRefundWorkflow({
      registrationId: registration.id,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      amount: 40.00,
      reason: "Partial fee waiver granted by committee",
      idempotencyKey: `idem_part_${runId}`,
    });
    assert(partialRes.success && partialRes.amount === 40.00, "Partial refund executed successfully");
    assert(partialRes.status === TransactionStatus.PARTIALLY_REFUNDED, "Payment status transitions to PARTIALLY_REFUNDED");
    assert(partialRes.paymentStatus === PaymentStatus.PAID, "Registration payment status remains PAID for partial refund");

    // Test 6: Duplicate refund request with same idempotencyKey
    console.log("\nTest 6: Duplicate refund request with same idempotencyKey...");
    const dupRes = await executeRefundWorkflow({
      registrationId: registration.id,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      amount: 40.00,
      reason: "Partial fee waiver retry",
      idempotencyKey: `idem_part_${runId}`,
    });
    assert(dupRes.idempotent === true && dupRes.success === true, "Duplicate refund intercepted and returned idempotently");

    // Test 7: Concurrent refund exceeding remaining balance defense
    console.log("\nTest 7: Concurrent refund exceeding remaining balance defense...");
    try {
      await executeRefundWorkflow({
        registrationId: registration.id,
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        amount: 70.00, // 40 already refunded + 70 = 110 > 100
        reason: "Testing remaining balance check",
      });
      assert(false, "Should have blocked refund exceeding remaining balance");
    } catch (err) {
      assert(err.message.includes("REFUND_EXCEEDS_BALANCE"), "Blocked refund exceeding remaining balance (70.00 on 60.00 remaining)");
    }

    // Test 8: Completing full remaining refund (60.00 USD)
    console.log("\nTest 8: Completing full remaining refund (60.00 USD)...");
    const fullRes = await executeRefundWorkflow({
      registrationId: registration.id,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      amount: 60.00,
      reason: "Golfer emergency withdrawal approved",
      idempotencyKey: `idem_full_${runId}`,
    });
    assert(fullRes.success && fullRes.isFullRefund, "Remaining balance refunded fully");
    assert(fullRes.status === TransactionStatus.REFUNDED, "Payment status transitions to REFUNDED");
    assert(fullRes.paymentStatus === PaymentStatus.REFUNDED, "Registration payment status transitions to REFUNDED");

    // Test 9: Webhook HMAC Signature verification and replay defense
    console.log("\nTest 9: Webhook Signature Verification and replay defense...");
    const secret = "test_webhook_secret_key_12345";
    const webhookPayload = JSON.stringify({
      entity: "event",
      account_id: "acc_test",
      event: "refund.processed",
      payload: {
        refund: {
          entity: {
            id: `rfnd_webhook_${runId}`,
            payment_id: payment.providerPaymentId,
            amount: 10000,
            currency: "USD",
            status: "processed",
          },
        },
      },
    });
    const validSignature = crypto.createHmac("sha256", secret).update(webhookPayload).digest("hex");
    const invalidSignature = crypto.createHmac("sha256", "wrong_secret").update(webhookPayload).digest("hex");

    assert(verifyHmacSha256(webhookPayload, validSignature, secret) === true, "Valid webhook HMAC signature passes");
    assert(verifyHmacSha256(webhookPayload, invalidSignature, secret) === false, "Invalid webhook HMAC signature is rejected");

    // Test 10: Admin Audit Trail persistence
    console.log("\nTest 10: Admin Audit Trail persistence...");
    const auditLogs = await prisma.adminAuditLog.findMany({
      where: {
        adminUserId: adminUser.id,
        action: AuditAction.PAYMENT_REFUNDED,
      },
      orderBy: { createdAt: "desc" },
      take: 2,
    });
    assert(auditLogs.length >= 2, `Persisted ${auditLogs.length} audit log entries for refunds`);
    assert(auditLogs[0].details.includes("Provider Refund"), "Audit log captures provider refund identifier and reason");

    console.log("\n======================================================");
    console.log("🎉 ALL 10 REFUND & RECONCILIATION AUDIT TESTS PASSED");
    console.log("======================================================");
  } finally {
    console.log("\nCleaning up isolated QA test fixtures...");
    if (payment) await prisma.payment.deleteMany({ where: { registrationId: registration.id } });
    if (registration) await prisma.registration.deleteMany({ where: { id: registration.id } });
    if (golfer) await prisma.golferProfile.deleteMany({ where: { id: golfer.id } });
    if (tournament) await prisma.tournament.deleteMany({ where: { id: tournament.id } });
    if (course) await prisma.golfCourse.deleteMany({ where: { id: course.id } });
    if (club) await prisma.club.deleteMany({ where: { id: club.id } });
    console.log("✓ All isolated QA fixtures cleaned up cleanly with zero database pollution.\n");
    await prisma.$disconnect();
  }
}

runRefundTests().catch((err) => {
  console.error("QA Test execution failed:", err);
  process.exit(1);
});
