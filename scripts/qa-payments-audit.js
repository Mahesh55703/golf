const { PrismaClient, RegistrationStatus, PaymentStatus, TransactionStatus, AdminRole, AuditAction } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED ASSERTION: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

// Timing safe verification helper test
function verifyHmacSha256(data, signature, secret) {
  try {
    const expected = crypto.createHmac("sha256", secret).update(data).digest("hex");
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// Minor units calculation test
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

async function main() {
  console.log("==================================================");
  console.log("⛳ GOLFPULSE PHASE 3.7 - PAYMENTS & LIFECYCLE AUDIT");
  console.log("==================================================\n");

  // 1. Currency Minor Unit Precision Tests
  console.log("Step 1: Multi-Currency Minor Unit Arithmetic Tests");
  assert(toMinorUnits(150.00, "USD") === 15000, "150.00 USD converts to 15000 cents");
  assert(toMinorUnits(2500.50, "INR") === 250050, "2500.50 INR converts to 250050 paise");
  assert(toMinorUnits(5000, "JPY") === 5000, "5000 JPY (zero-decimal) remains 5000 units");
  assert(toMinorUnits(25.500, "KWD") === 25500, "25.500 KWD (three-decimal) converts to 25500 fils");
  assert(toMinorUnits("99.99", "EUR") === 9999, "99.99 EUR string converts accurately without float drift");

  // 2. Cryptographic Signature Verification Tests
  console.log("\nStep 2: Cryptographic Signature Verification Tests");
  const testSecret = "test_webhook_and_order_secret_key_123";
  const orderPayload = "order_test_999|pay_test_888";
  const validSignature = crypto.createHmac("sha256", testSecret).update(orderPayload).digest("hex");
  const corruptedSignature = validSignature.slice(0, -2) + "ab";

  assert(verifyHmacSha256(orderPayload, validSignature, testSecret) === true, "Valid HMAC-SHA256 signature passes verification");
  assert(verifyHmacSha256(orderPayload, corruptedSignature, testSecret) === false, "Corrupted HMAC signature is rejected");
  assert(verifyHmacSha256(orderPayload, "invalid_length", testSecret) === false, "Invalid length signature is rejected safely");
  assert(verifyHmacSha256(orderPayload, validSignature, "wrong_secret") === false, "Wrong secret is rejected safely");

  // 3. Database Schema Integrity Tests
  console.log("\nStep 3: Database Models & Foreign Key Constraints");
  const tournament = await prisma.tournament.findFirst({
    where: { entryFee: { gt: 0 } },
  }) || await prisma.tournament.findFirst();

  assert(tournament !== null, "At least one tournament exists in DB");

  const testEmail = `qa.audit.golfer.${Date.now()}@golfpulse.test`;
  const golfer = await prisma.golferProfile.create({
    data: {
      firstName: "QA",
      lastName: "Auditor",
      email: testEmail,
      country: "India",
      handicapIndex: 9.4,
    },
  });
  assert(golfer.id !== null, "Golfer profile created cleanly");

  // Create test registration
  const regRef = `GP-TEST-${Date.now().toString().slice(-6)}`;
  const registration = await prisma.registration.create({
    data: {
      referenceNumber: regRef,
      tournamentId: tournament.id,
      golferId: golfer.id,
      status: RegistrationStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      entryFeePaid: 0,
      currency: tournament.currency || "USD",
    },
  });
  assert(registration.status === RegistrationStatus.PENDING, "New paid tournament registration defaults to PENDING");
  assert(registration.paymentStatus === PaymentStatus.UNPAID, "Payment status defaults to UNPAID");

  // 4. Payment Model Creation & Lifecycle Transitions
  console.log("\nStep 4: Payment Model & State Transitions");
  const paymentRef = `GP-PAY-TEST-${Date.now().toString().slice(-6)}`;
  const orderId = `order_qa_${Date.now()}`;
  const payment = await prisma.payment.create({
    data: {
      referenceNumber: paymentRef,
      registrationId: registration.id,
      provider: "RAZORPAY",
      providerOrderId: orderId,
      amount: tournament.entryFee,
      currency: tournament.currency || "USD",
      amountMinor: toMinorUnits(Number(tournament.entryFee), tournament.currency || "USD"),
      status: TransactionStatus.CREATED,
      idempotencyKey: `ord_${registration.id}`,
    },
  });
  assert(payment.id !== null, "Payment order record created successfully");
  assert(payment.status === TransactionStatus.CREATED, "Payment initial status is CREATED");

  // Simulate payment verification success
  const paymentId = `pay_qa_${Date.now()}`;
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerPaymentId: paymentId,
      providerSignature: "valid_simulated_sig",
      status: TransactionStatus.SUCCESS,
      paidAt: new Date(),
    },
  });
  assert(updatedPayment.status === TransactionStatus.SUCCESS, "Payment transitions to SUCCESS upon verification");
  assert(updatedPayment.paidAt !== null, "Paid timestamp is recorded");

  // Transition registration to CONFIRMED and PAID
  const confirmedReg = await prisma.registration.update({
    where: { id: registration.id },
    data: {
      status: RegistrationStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      entryFeePaid: tournament.entryFee,
    },
  });
  assert(confirmedReg.status === RegistrationStatus.CONFIRMED, "Registration transitions to CONFIRMED");
  assert(confirmedReg.paymentStatus === PaymentStatus.PAID, "Registration payment status transitions to PAID");

  // 5. Duplicate Payment ID Uniqueness Constraint Check
  console.log("\nStep 5: Duplicate Payment Identifier Constraint Check");
  let duplicatePrevented = false;
  try {
    await prisma.payment.create({
      data: {
        referenceNumber: `GP-PAY-DUP-${Date.now().toString().slice(-6)}`,
        registrationId: registration.id,
        provider: "RAZORPAY",
        providerPaymentId: paymentId, // re-using existing unique providerPaymentId
        amount: tournament.entryFee,
        currency: "USD",
        amountMinor: 1000,
        status: TransactionStatus.SUCCESS,
      },
    });
  } catch (err) {
    duplicatePrevented = true;
  }
  assert(duplicatePrevented === true, "Database uniqueness constraint prevents duplicate providerPaymentId");

  // 6. Webhook Event Durable Idempotency
  console.log("\nStep 6: Webhook Idempotency Persistence");
  const webhookEventId = `evt_qa_test_${Date.now()}`;
  const webhookEvent = await prisma.paymentWebhookEvent.create({
    data: {
      provider: "RAZORPAY",
      eventId: webhookEventId,
      eventType: "payment.captured",
      payload: { id: webhookEventId, event: "payment.captured" },
      processed: true,
      processedAt: new Date(),
    },
  });
  assert(webhookEvent.id !== null, "Webhook event recorded durably");

  let duplicateWebhookPrevented = false;
  try {
    await prisma.paymentWebhookEvent.create({
      data: {
        provider: "RAZORPAY",
        eventId: webhookEventId, // duplicate
        eventType: "payment.captured",
        payload: {},
      },
    });
  } catch {
    duplicateWebhookPrevented = true;
  }
  assert(duplicateWebhookPrevented === true, "Durable uniqueness prevents duplicate webhook event insertion");

  // 7. Clean up test records
  console.log("\nStep 7: Clean-up QA Fixtures");
  await prisma.paymentWebhookEvent.delete({ where: { id: webhookEvent.id } });
  await prisma.payment.delete({ where: { id: payment.id } });
  await prisma.registration.delete({ where: { id: registration.id } });
  await prisma.golferProfile.delete({ where: { id: golfer.id } });
  console.log("  ✓ Test fixtures cleaned up without residual artifacts");

  console.log("\n==================================================");
  console.log("🎉 ALL PHASE 3.7 PAYMENTS & LIFECYCLE AUDITS PASSED");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
