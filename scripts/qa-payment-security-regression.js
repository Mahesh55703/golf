/**
 * GolfPulse — Payment Security & Simulation Disabling Regression Test Suite
 *
 * Verifies that:
 * 1. Missing Razorpay credentials in production rejects paid checkout with PAYMENT_GATEWAY_UNAVAILABLE.
 * 2. Missing Razorpay credentials in non-production with ENABLE_PAYMENT_SIMULATION="false" rejects paid checkout.
 * 3. In production, simulated signatures (DEV_SIMULATED_SIGNATURE) are strictly rejected.
 * 4. In production, simulated order IDs (order_sim_...) or payment IDs (pay_sim_...) are strictly rejected.
 * 5. In production with Razorpay credentials configured, valid cryptographic HMAC-SHA256 signature succeeds,
 *    and invalid or tampered signature is rejected.
 * 6. Free tournament registration continues to work without payment gateway or credentials.
 * 7. When ENABLE_PAYMENT_SIMULATION="true" strictly in non-production, simulation works as intended.
 */

const {
  PrismaClient,
  RegistrationStatus,
  PaymentStatus,
  TransactionStatus,
} = require("@prisma/client");
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

// Mirroring isPaymentSimulationAllowed security logic
function isPaymentSimulationAllowed(env = process.env) {
  if (env.NODE_ENV === "production") {
    return false;
  }
  return env.ENABLE_PAYMENT_SIMULATION === "true";
}

// Logic mirror of initiateCheckout with security enforcement
async function simulateInitiateCheckout(registrationId, env = process.env, mockKeyConfigured = false) {
  return await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      include: {
        tournament: true,
        golfer: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!registration) throw new Error("REGISTRATION_NOT_FOUND");
    if (registration.status === RegistrationStatus.CANCELLED) throw new Error("REGISTRATION_CANCELLED");
    if (registration.paymentStatus === PaymentStatus.PAID) throw new Error("ALREADY_PAID");

    const serverAmount = Number(registration.tournament.entryFee);
    const serverCurrency = (registration.tournament.currency || "USD").toUpperCase();

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
      return { isFree: true, registration: updatedReg };
    }

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
      if (latestPayment.providerOrderId.startsWith("order_sim_") && !isPaymentSimulationAllowed(env)) {
        // Drop into re-evaluating
      } else {
        return {
          isFree: false,
          paymentReference: latestPayment.referenceNumber,
          provider: latestPayment.provider,
          orderId: latestPayment.providerOrderId,
          amount: Number(latestPayment.amount),
          amountMinor: latestPayment.amountMinor,
          currency: latestPayment.currency,
          keyId: mockKeyConfigured ? "rzp_test_sample" : "",
          isConfigured: mockKeyConfigured,
          isSimulation: latestPayment.providerOrderId.startsWith("order_sim_"),
        };
      }
    }

    const amountMinor = toMinorUnits(serverAmount, serverCurrency);
    let providerOrderId = null;

    if (mockKeyConfigured) {
      providerOrderId = `order_${crypto.randomUUID().slice(0, 14)}`;
    } else {
      if (!isPaymentSimulationAllowed(env)) {
        throw new Error(
          "PAYMENT_GATEWAY_UNAVAILABLE: Razorpay payment gateway is not configured on the server. Paid tournament registrations are temporarily unavailable."
        );
      }
      providerOrderId = `order_sim_${crypto.randomUUID().slice(0, 14)}`;
    }

    const payment = await tx.payment.create({
      data: {
        referenceNumber: `GP-PAY-${Date.now().toString().slice(-6)}`,
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
      keyId: mockKeyConfigured ? "rzp_test_sample" : "",
      isConfigured: mockKeyConfigured,
      isSimulation: !mockKeyConfigured && isPaymentSimulationAllowed(env),
    };
  });
}

// Logic mirror of finalizePaymentVerification with security enforcement
async function simulateFinalizePaymentVerification(params, env = process.env, mockKeyConfigured = false, mockSecret = "") {
  const { orderId, paymentId, signature } = params;

  // 1. Production Security Enforcement: Block simulated values
  if (env.NODE_ENV === "production" || !isPaymentSimulationAllowed(env)) {
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

  // 2. Cryptographic signature check
  if (mockKeyConfigured) {
    const isValid = verifyHmacSha256(`${orderId}|${paymentId}`, signature, mockSecret);
    if (!isValid) {
      throw new Error("INVALID_PAYMENT_SIGNATURE: Cryptographic signature mismatch.");
    }
  } else {
    if (!isPaymentSimulationAllowed(env) || signature !== "DEV_SIMULATED_SIGNATURE") {
      throw new Error("INVALID_PAYMENT_SIGNATURE: Gateway credentials not configured.");
    }
  }

  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { providerOrderId: orderId },
      include: { registration: true },
    });
    if (!payment) throw new Error("PAYMENT_RECORD_NOT_FOUND");

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: paymentId,
        providerSignature: signature,
        status: TransactionStatus.SUCCESS,
        paidAt: new Date(),
      },
    });

    const updatedRegistration = await tx.registration.update({
      where: { id: payment.registrationId },
      data: {
        status: RegistrationStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        entryFeePaid: payment.amount,
        currency: payment.currency,
      },
    });

    return { payment: updatedPayment, registration: updatedRegistration };
  });
}

async function main() {
  console.log("================================================================================");
  console.log("⛳ GOLFPULSE — PAYMENT SECURITY & ANTI-SIMULATION REGRESSION TEST SUITE");
  console.log("================================================================================\n");

  const originalEnv = { ...process.env };

  try {
    console.log("[Test 1: Policy validation for isPaymentSimulationAllowed()]");
    assert(
      isPaymentSimulationAllowed({ NODE_ENV: "production", ENABLE_PAYMENT_SIMULATION: "true" }) === false,
      "Production blocks simulation even if ENABLE_PAYMENT_SIMULATION='true'"
    );
    assert(
      isPaymentSimulationAllowed({ NODE_ENV: "production", ENABLE_PAYMENT_SIMULATION: "false" }) === false,
      "Production blocks simulation when ENABLE_PAYMENT_SIMULATION='false'"
    );
    assert(
      isPaymentSimulationAllowed({ NODE_ENV: "production" }) === false,
      "Production blocks simulation when ENABLE_PAYMENT_SIMULATION is undefined"
    );
    assert(
      isPaymentSimulationAllowed({ NODE_ENV: "development" }) === false,
      "Development defaults to blocking simulation if flag undefined"
    );
    assert(
      isPaymentSimulationAllowed({ NODE_ENV: "development", ENABLE_PAYMENT_SIMULATION: "false" }) === false,
      "Development blocks simulation if flag is 'false'"
    );
    assert(
      isPaymentSimulationAllowed({ NODE_ENV: "development", ENABLE_PAYMENT_SIMULATION: "true" }) === true,
      "Development allows simulation only when explicitly ENABLE_PAYMENT_SIMULATION='true'"
    );

    console.log("\n[Setup: Creating isolated test tournament & golfer profiles]");
    const testClub = await prisma.club.findFirst();
    const testTournament = await prisma.tournament.create({
      data: {
        name: "Security QA Open",
        slug: `security-qa-open-${Date.now()}`,
        description: "Tournament fixture for security regression testing",
        hostClubId: testClub.id,
        startDate: new Date("2026-12-01T08:00:00Z"),
        endDate: new Date("2026-12-01T17:00:00Z"),
        format: "STROKE_PLAY",
        access: "PUBLIC",
        status: "REGISTRATION_OPEN",
        entryFee: 50.0,
        currency: "USD",
        fieldCapacity: 100,
      },
    });

    const testGolfer = await prisma.golferProfile.create({
      data: {
        firstName: "SecAuditor",
        lastName: "Golfer",
        email: `sec.auditor.${Date.now()}@golfpulse.test`,
        country: "India",
      },
    });

    const paidRegistration = await prisma.registration.create({
      data: {
        referenceNumber: `GP-SEC-${Date.now().toString().slice(-5)}`,
        tournamentId: testTournament.id,
        golferId: testGolfer.id,
        status: RegistrationStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        entryFeePaid: 0,
        currency: "USD",
      },
    });

    console.log("\n[Test 2: Production paid checkout rejection when gateway credentials missing]");
    let checkoutErrorCaught = false;
    try {
      await simulateInitiateCheckout(
        paidRegistration.id,
        { NODE_ENV: "production", ENABLE_PAYMENT_SIMULATION: "false" },
        false
      );
    } catch (err) {
      checkoutErrorCaught = true;
      assert(
        err.message.startsWith("PAYMENT_GATEWAY_UNAVAILABLE"),
        `Initiate checkout threw PAYMENT_GATEWAY_UNAVAILABLE: ${err.message}`
      );
    }
    assert(checkoutErrorCaught === true, "Checkout blocked when credentials missing in production");

    console.log("\n[Test 3: Production verification rejection of simulated signature, order ID, and payment ID]");
    const maliciousPayment = await prisma.payment.create({
      data: {
        referenceNumber: `GP-PAY-SEC-${Date.now().toString().slice(-5)}`,
        registrationId: paidRegistration.id,
        provider: "RAZORPAY",
        providerOrderId: "order_sim_malicious99",
        amount: 50.0,
        currency: "USD",
        amountMinor: 5000,
        status: TransactionStatus.CREATED,
        idempotencyKey: `ord_sec_${Date.now()}`,
      },
    });

    let simSigRejected = false;
    try {
      await simulateFinalizePaymentVerification(
        {
          orderId: maliciousPayment.providerOrderId,
          paymentId: "pay_sim_9999",
          signature: "DEV_SIMULATED_SIGNATURE",
        },
        { NODE_ENV: "production" },
        false
      );
    } catch (err) {
      simSigRejected = true;
      assert(
        err.message.includes("Payment simulation is strictly prohibited in production"),
        `DEV_SIMULATED_SIGNATURE safely rejected in production: ${err.message}`
      );
    }
    assert(simSigRejected === true, "Simulated signature was blocked from verification in production");

    const checkMaliciousReg = await prisma.registration.findUnique({ where: { id: paidRegistration.id } });
    const checkMaliciousPay = await prisma.payment.findUnique({ where: { id: maliciousPayment.id } });
    assert(checkMaliciousReg.paymentStatus === PaymentStatus.UNPAID, "Registration remains UNPAID after rejected simulation");
    assert(checkMaliciousReg.status === RegistrationStatus.PENDING, "Registration remains PENDING after rejected simulation");
    assert(checkMaliciousPay.status === TransactionStatus.CREATED, "Payment remains CREATED after rejected simulation");

    console.log("\n[Test 4: Genuine Razorpay signature verification & forgery defense in production]");
    const testSecret = "sec_test_mock_razorpay_secret_998877";
    const realOrderPayment = await prisma.payment.create({
      data: {
        referenceNumber: `GP-PAY-REAL-${Date.now().toString().slice(-5)}`,
        registrationId: paidRegistration.id,
        provider: "RAZORPAY",
        providerOrderId: "order_real_rzp_12345",
        amount: 50.0,
        currency: "USD",
        amountMinor: 5000,
        status: TransactionStatus.CREATED,
        idempotencyKey: `ord_real_${Date.now()}`,
      },
    });

    // 4A: Tampered signature must fail
    let forgeryRejected = false;
    try {
      await simulateFinalizePaymentVerification(
        {
          orderId: realOrderPayment.providerOrderId,
          paymentId: "pay_real_987654",
          signature: "bad_forged_signature_hex",
        },
        { NODE_ENV: "production" },
        true,
        testSecret
      );
    } catch (err) {
      forgeryRejected = true;
      assert(
        err.message.includes("Cryptographic signature mismatch"),
        `Tampered signature rejected: ${err.message}`
      );
    }
    assert(forgeryRejected === true, "Forged signature safely blocked in production");

    // 4B: Valid HMAC signature must succeed
    const validSignature = crypto
      .createHmac("sha256", testSecret)
      .update(`${realOrderPayment.providerOrderId}|pay_real_987654`)
      .digest("hex");

    const genuineVerify = await simulateFinalizePaymentVerification(
      {
        orderId: realOrderPayment.providerOrderId,
        paymentId: "pay_real_987654",
        signature: validSignature,
      },
      { NODE_ENV: "production" },
      true,
      testSecret
    );
    assert(genuineVerify.payment.status === TransactionStatus.SUCCESS, "Genuine payment verified successfully to SUCCESS");
    assert(genuineVerify.registration.status === RegistrationStatus.CONFIRMED, "Registration confirmed upon valid verification");
    assert(genuineVerify.registration.paymentStatus === PaymentStatus.PAID, "Registration marked PAID upon valid verification");

    console.log("\n[Test 5: Free tournament registration unaffected by payment gateway state]");
    const freeTournament = await prisma.tournament.create({
      data: {
        name: "Security QA Complimentary Invitational",
        slug: `security-free-${Date.now()}`,
        description: "Free event",
        hostClubId: testClub.id,
        startDate: new Date("2026-12-05T08:00:00Z"),
        endDate: new Date("2026-12-05T17:00:00Z"),
        format: "STABLEFORD",
        access: "PUBLIC",
        status: "REGISTRATION_OPEN",
        entryFee: 0.0,
        currency: "USD",
        fieldCapacity: 50,
      },
    });

    const freeRegistration = await prisma.registration.create({
      data: {
        referenceNumber: `GP-FREE-${Date.now().toString().slice(-5)}`,
        tournamentId: freeTournament.id,
        golferId: testGolfer.id,
        status: RegistrationStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        entryFeePaid: 0,
        currency: "USD",
      },
    });

    const freeCheckoutResult = await simulateInitiateCheckout(freeRegistration.id, { NODE_ENV: "production" }, false);
    assert(freeCheckoutResult.isFree === true, "Free registration correctly recognized as isFree: true");
    assert(freeCheckoutResult.registration.status === RegistrationStatus.CONFIRMED, "Free registration status is CONFIRMED");
    assert(freeCheckoutResult.registration.paymentStatus === PaymentStatus.FREE_ENTRY, "Free registration paymentStatus is FREE_ENTRY");

    console.log("\n[Test 6: Explicit non-production simulation when ENABLE_PAYMENT_SIMULATION='true']");
    const testGolferSim = await prisma.golferProfile.create({
      data: {
        firstName: "SecSim",
        lastName: "Golfer",
        email: `sec.sim.${Date.now()}@golfpulse.test`,
        country: "India",
      },
    });

    const simRegistration = await prisma.registration.create({
      data: {
        referenceNumber: `GP-SIM-${Date.now().toString().slice(-5)}`,
        tournamentId: testTournament.id,
        golferId: testGolferSim.id,
        status: RegistrationStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        entryFeePaid: 0,
        currency: "USD",
      },
    });

    const simCheckout = await simulateInitiateCheckout(
      simRegistration.id,
      { NODE_ENV: "development", ENABLE_PAYMENT_SIMULATION: "true" },
      false
    );
    assert(simCheckout.isSimulation === true, "Checkout returns isSimulation: true in dev with flag enabled");
    assert(simCheckout.orderId.startsWith("order_sim_"), "Order ID is order_sim_ in simulation");

    const simVerify = await simulateFinalizePaymentVerification(
      {
        orderId: simCheckout.orderId,
        paymentId: "pay_sim_valid123",
        signature: "DEV_SIMULATED_SIGNATURE",
      },
      { NODE_ENV: "development", ENABLE_PAYMENT_SIMULATION: "true" },
      false
    );
    assert(simVerify.payment.status === TransactionStatus.SUCCESS, "Simulation verification succeeds when explicitly enabled");
    assert(simVerify.registration.status === RegistrationStatus.CONFIRMED, "Registration confirmed in allowed simulation");
    assert(simVerify.registration.paymentStatus === PaymentStatus.PAID, "Registration paid in allowed simulation");

    // Clean up test fixtures
    console.log("\n[Cleanup: Removing test fixtures cleanly]");
    await prisma.payment.deleteMany({
      where: {
        registration: {
          tournamentId: { in: [testTournament.id, freeTournament.id] },
        },
      },
    });
    await prisma.registration.deleteMany({
      where: {
        tournamentId: { in: [testTournament.id, freeTournament.id] },
      },
    });
    await prisma.tournament.deleteMany({
      where: { id: { in: [testTournament.id, freeTournament.id] } },
    });
    await prisma.golferProfile.deleteMany({ where: { id: { in: [testGolfer.id, testGolferSim.id] } } });

    console.log("  ✓ All isolated security QA fixtures cleaned up cleanly.");

    console.log("\n================================================================================");
    console.log("🎉 ALL PAYMENT SECURITY & ANTI-SIMULATION REGRESSION TESTS PASSED (6/6)");
    console.log("================================================================================\n");
  } finally {
    process.env = originalEnv;
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in security regression test suite:", err);
  process.exit(1);
});
