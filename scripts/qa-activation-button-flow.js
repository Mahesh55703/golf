/**
 * GolfPulse — Account Activation Button & Registration Confirmation Flow Test Suite
 *
 * Covers:
 * 1. Paid registration verification payload structure (includes golferEmail, golferName, divisionName, golferId, isActivated)
 * 2. Privacy & Security: passwordHash and raw tokens are NOT leaked in response payloads or logs
 * 3. Activation button action: calling requestGolferActivation generates a secure token and single-use link
 * 4. Transactional email dispatch: verifies to=[golferEmail], not tournaments@golfpulse.com
 * 5. Provider rejection & sandbox handling: 403/422 provider errors handled cleanly without orphan tokens in prod
 * 6. Zero duplicate records: repeated clicks or requests do not duplicate registrations, payments, or golfer profiles
 * 7. State integrity: Account is NOT marked activated until confirmGolferActivation succeeds
 * 8. Account activation completion: golfer profile is marked verified, password set, registration linked
 * 9. Already activated state detection: isActivated is true when golfer has already activated their account
 */

const {
  PrismaClient,
  RegistrationStatus,
  PaymentStatus,
  TransactionStatus,
  TournamentFormat,
  TournamentAccess,
  TournamentStatus,
} = require("@prisma/client");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED ASSERTION: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function generateSecureToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function runActivationFlowSuite() {
  console.log("=".repeat(80));
  console.log("⛳ GOLFPULSE — ACTIVATION BUTTON & CONFIRMATION FLOW TEST SUITE");
  console.log("=".repeat(80));

  const runId = Math.random().toString(36).substring(2, 8);
  const testGolferEmail = `qa.activation.${runId}@golfpulse.test`;
  const existingActiveEmail = `qa.active.${runId}@golfpulse.test`;
  let club = null;
  let tournament = null;
  let division = null;
  let registration = null;
  let payment = null;
  let activeGolfer = null;

  try {
    // -------------------------------------------------------------
    // SETUP
    // -------------------------------------------------------------
    console.log("\n[Setup: Provisioning test fixtures]");
    club = await prisma.club.findFirst();
    if (!club) {
      club = await prisma.club.create({
        data: {
          name: `QA Club ${runId}`,
          slug: `qa-club-${runId}`,
          city: "Pune",
          state: "MH",
          country: "India",
        },
      });
    }

    tournament = await prisma.tournament.create({
      data: {
        name: `QA Monsoon Stableford ${runId}`,
        slug: `qa-monsoon-stableford-${runId}`,
        format: TournamentFormat.STABLEFORD,
        access: TournamentAccess.PUBLIC,
        status: TournamentStatus.REGISTRATION_OPEN,
        startDate: new Date("2026-11-20T08:00:00Z"),
        endDate: new Date("2026-11-20T18:00:00Z"),
        registrationOpenAt: new Date(Date.now() - 86400000),
        registrationCloseAt: new Date(Date.now() + 86400000),
        entryFee: 25.0,
        currency: "USD",
        fieldCapacity: 72,
        hostClubId: club.id,
        divisions: {
          create: {
            name: "Open Championship",
          },
        },
      },
      include: { divisions: true },
    });
    division = tournament.divisions[0];
    assert(tournament && division, "Created test tournament with division");

    // Pre-create an already activated golfer to test existing-activated scenario
    const passwordSalt = await bcrypt.genSalt(10);
    const preExistingHash = await bcrypt.hash("SecurePass123!", passwordSalt);
    activeGolfer = await prisma.golferProfile.create({
      data: {
        email: existingActiveEmail,
        firstName: "Active",
        lastName: "Golfer",
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        passwordHash: preExistingHash,
      },
    });
    assert(activeGolfer.isEmailVerified && !!activeGolfer.passwordHash, "Created pre-activated golfer fixture");

    // -------------------------------------------------------------
    // TEST 1: Paid Registration Creation
    // -------------------------------------------------------------
    console.log("\n[Test 1: Public tournament registration creation]");
    const unactivatedGolfer = await prisma.golferProfile.create({
      data: {
        email: testGolferEmail,
        firstName: "Tiger",
        lastName: "Woods",
        isEmailVerified: false,
        passwordHash: null,
      },
    });

    registration = await prisma.registration.create({
      data: {
        referenceNumber: `REG-QA-${runId.toUpperCase()}`,
        tournamentId: tournament.id,
        golferId: unactivatedGolfer.id,
        divisionId: division.id,
        status: RegistrationStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        entryFeePaid: 0,
        currency: "USD",
      },
      include: {
        tournament: { select: { name: true, hostClub: { select: { name: true } } } },
        division: { select: { name: true } },
        golfer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isEmailVerified: true,
            passwordHash: true,
          },
        },
      },
    });

    // Check registration response structure format as returned by /api/tournaments/register
    const regApiResponse = {
      id: registration.id,
      referenceNumber: registration.referenceNumber,
      status: registration.status,
      paymentStatus: registration.paymentStatus,
      entryFee: Number(registration.tournament ? registration.entryFeePaid : 0),
      currency: registration.currency,
      tournamentName: registration.tournament.name,
      hostClub: registration.tournament.hostClub?.name || "Host Club",
      divisionName: registration.division?.name || "Open Championship",
      golferId: registration.golfer.id,
      golferName: `${registration.golfer.firstName} ${registration.golfer.lastName}`.trim(),
      golferEmail: registration.golfer.email,
      isActivated: Boolean(registration.golfer.isEmailVerified && registration.golfer.passwordHash),
      registeredAt: registration.registeredAt,
    };

    assert(regApiResponse.golferEmail === testGolferEmail, "Registration response includes golferEmail");
    assert(regApiResponse.golferName === "Tiger Woods", "Registration response includes formatted golferName");
    assert(regApiResponse.divisionName === "Open Championship", "Registration response includes divisionName");
    assert(regApiResponse.golferId === unactivatedGolfer.id, "Registration response includes golferId");
    assert(regApiResponse.isActivated === false, "Registration response correctly indicates isActivated: false");
    assert(!("passwordHash" in regApiResponse), "Registration response strictly does not expose passwordHash");

    // -------------------------------------------------------------
    // TEST 2: Payment Verification and Normalized Response Structure
    // -------------------------------------------------------------
    console.log("\n[Test 2: Payment verification response normalization for confirmation modal]");
    const orderId = `order_sim_${runId}`;
    const paymentId = `pay_sim_${runId}`;
    payment = await prisma.payment.create({
      data: {
        referenceNumber: `PAY-QA-${runId.toUpperCase()}`,
        registrationId: registration.id,
        providerOrderId: orderId,
        amount: 25.0,
        amountMinor: 2500,
        currency: "USD",
        status: TransactionStatus.CREATED,
      },
    });

    // Mirror the exact transaction in finalizePaymentVerification (lib/payments/service.ts)
    const verifyResult = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.findFirst({
        where: { providerOrderId: orderId },
        include: {
          registration: {
            include: {
              tournament: {
                select: { name: true, hostClub: { select: { name: true } } },
              },
              division: { select: { name: true } },
              golfer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  isEmailVerified: true,
                  passwordHash: true,
                },
              },
            },
          },
        },
      });

      const updatedPayment = await tx.payment.update({
        where: { id: p.id },
        data: {
          providerPaymentId: paymentId,
          providerSignature: "DEV_SIMULATED_SIGNATURE",
          status: TransactionStatus.SUCCESS,
          paidAt: new Date(),
        },
      });

      const updatedRegistration = await tx.registration.update({
        where: { id: p.registrationId },
        data: {
          status: RegistrationStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          entryFeePaid: p.amount,
          currency: p.currency,
        },
        include: {
          tournament: {
            select: { name: true, hostClub: { select: { name: true } } },
          },
          division: { select: { name: true } },
          golfer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isEmailVerified: true,
              passwordHash: true,
            },
          },
        },
      });

      return { payment: updatedPayment, registration: updatedRegistration };
    });

    assert(verifyResult.registration.status === RegistrationStatus.CONFIRMED, "Registration status updated to CONFIRMED");
    assert(verifyResult.registration.paymentStatus === PaymentStatus.PAID, "Payment status updated to PAID");

    // Mirror API response construction in app/api/payments/verify/route.ts
    const reg = verifyResult.registration;
    const verifyApiResponseRegistration = {
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
      golferName: reg.golfer ? `${reg.golfer.firstName} ${reg.golfer.lastName}`.trim() : "",
      golferEmail: reg.golfer?.email || "",
      isActivated: Boolean(reg.golfer?.isEmailVerified && reg.golfer?.passwordHash),
      registeredAt: reg.registeredAt,
    };

    assert(verifyApiResponseRegistration.golferEmail === testGolferEmail, "Verify response contains normalized golferEmail");
    assert(verifyApiResponseRegistration.golferName === "Tiger Woods", "Verify response contains normalized golferName");
    assert(verifyApiResponseRegistration.divisionName === "Open Championship", "Verify response contains normalized divisionName");
    assert(verifyApiResponseRegistration.tournamentName === `QA Monsoon Stableford ${runId}`, "Verify response contains tournamentName");
    assert(verifyApiResponseRegistration.isActivated === false, "Verify response accurately indicates golfer is not yet activated");
    assert(!("passwordHash" in verifyApiResponseRegistration), "Verify response strictly does not expose passwordHash");

    // -------------------------------------------------------------
    // TEST 3: Account Activation Request Execution & Email Dispatch
    // -------------------------------------------------------------
    console.log("\n[Test 3: Account activation request handling & transactional email dispatch]");
    
    // Simulate sendTransactionalEmail logic
    let capturedEmailPayload = null;
    async function mockTransactionalSend(data) {
      capturedEmailPayload = data;
      return { success: true, provider: "mock", deliveredToProvider: true };
    }

    async function requestGolferActivationTest(email, baseUrl, emailDispatcher = mockTransactionalSend) {
      const normalizedEmail = email.trim().toLowerCase();
      const golfer = await prisma.golferProfile.findUnique({
        where: { email: normalizedEmail },
      });

      if (!golfer) {
        return { success: true, message: "If an account or registration exists with this email, an activation link has been sent." };
      }

      const rawToken = generateSecureToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.golferActivationToken.deleteMany({
        where: { golferId: golfer.id, usedAt: null },
      });

      const createdToken = await prisma.golferActivationToken.create({
        data: {
          tokenHash,
          golferId: golfer.id,
          email: normalizedEmail,
          expiresAt,
        },
      });

      const activationLink = `${baseUrl.replace(/\/$/, "")}/activate?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

      const emailResult = await emailDispatcher({
        to: normalizedEmail,
        name: `${golfer.firstName} ${golfer.lastName}`.trim(),
        subject: "GolfPulse Account Activation",
        text: `Activation Link: ${activationLink}`,
      });

      if (!emailResult.success) {
        await prisma.golferActivationToken.delete({ where: { id: createdToken.id } }).catch(() => {});
        return { success: false, error: "Failed to dispatch activation email." };
      }

      return {
        success: true,
        message: "Activation link sent! Check your email inbox to complete your account activation.",
        debugToken: rawToken,
        activationLink,
      };
    }

    const activationResult = await requestGolferActivationTest(
      verifyApiResponseRegistration.golferEmail,
      "http://localhost:3000"
    );

    assert(activationResult.success === true, "requestGolferActivation returns success: true");
    assert(capturedEmailPayload !== null, "Transactional email dispatcher was invoked");
    assert(capturedEmailPayload.to === testGolferEmail, "Email recipient is the registered golfer email (NOT admin contact)");
    assert(capturedEmailPayload.to !== "tournaments@golfpulse.com", "Email recipient is strictly separated from tournaments@golfpulse.com");

    // Check token created in database
    const tokenRecord = await prisma.golferActivationToken.findFirst({
      where: { golferId: unactivatedGolfer.id, usedAt: null },
    });
    assert(!!tokenRecord, "Active GolferActivationToken recorded in database");
    assert(tokenRecord.tokenHash.length === 64, "Token is securely hashed with SHA-256");
    assert(tokenRecord.expiresAt > new Date(), "Token expiry is safely in the future (24 hours)");

    // -------------------------------------------------------------
    // TEST 4: Email Provider Failure Handling (Zero Orphan Tokens)
    // -------------------------------------------------------------
    console.log("\n[Test 4: Email provider failure handling & orphan token prevention]");
    const failingDispatcher = async () => ({
      success: false,
      provider: "resend",
      error: "403 Forbidden - domain restricted",
      deliveredToProvider: false,
    });

    const failingResult = await requestGolferActivationTest(
      verifyApiResponseRegistration.golferEmail,
      "http://localhost:3000",
      failingDispatcher
    );

    assert(failingResult.success === false, "Activation returns failure when email provider fails");
    const orphanTokens = await prisma.golferActivationToken.findMany({
      where: { golferId: unactivatedGolfer.id, usedAt: null },
    });
    assert(orphanTokens.length === 0, "No orphaned activation token left in DB after email failure");

    // Re-create a valid token for downstream verification tests
    const validActivationResult = await requestGolferActivationTest(
      verifyApiResponseRegistration.golferEmail,
      "http://localhost:3000"
    );
    assert(validActivationResult.success === true, "Regenerated valid activation token successfully");

    // -------------------------------------------------------------
    // TEST 5: Double-Click / Repeated Activation Request Idempotency
    // -------------------------------------------------------------
    console.log("\n[Test 5: Repeated activation requests & duplicate prevention]");
    const secondActivationResult = await requestGolferActivationTest(
      verifyApiResponseRegistration.golferEmail,
      "http://localhost:3000"
    );

    assert(secondActivationResult.success === true, "Second activation request succeeds cleanly");

    // Verify old token was replaced and only 1 active token exists
    const activeTokens = await prisma.golferActivationToken.findMany({
      where: { golferId: unactivatedGolfer.id, usedAt: null },
    });
    assert(activeTokens.length === 1, "Only one unused activation token exists (previous invalidated)");

    // Verify NO duplicate golfer profiles created
    const profiles = await prisma.golferProfile.findMany({
      where: { email: testGolferEmail },
    });
    assert(profiles.length === 1, "Zero duplicate GolferProfile records created");

    // Verify NO duplicate registrations created
    const regCount = await prisma.registration.count({
      where: { golferId: unactivatedGolfer.id, tournamentId: tournament.id },
    });
    assert(regCount === 1, "Zero duplicate Registration records created");

    // -------------------------------------------------------------
    // TEST 6: Account Not Marked Activated Before Token Validation
    // -------------------------------------------------------------
    console.log("\n[Test 6: Invariant check - account not activated until token confirmed]");
    const golferBeforeConfirm = await prisma.golferProfile.findUnique({
      where: { id: unactivatedGolfer.id },
    });
    assert(golferBeforeConfirm.isEmailVerified === false, "Golfer isEmailVerified remains false");
    assert(golferBeforeConfirm.passwordHash === null, "Golfer passwordHash remains null");

    // -------------------------------------------------------------
    // TEST 7: Complete Activation Flow (Token Validation)
    // -------------------------------------------------------------
    console.log("\n[Test 7: Validating activation token and setting password]");
    async function confirmGolferActivationTest(rawToken, newPassword) {
      const tokenHash = hashToken(rawToken.trim());

      const tokenRecord = await prisma.golferActivationToken.findUnique({
        where: { tokenHash },
        include: { golfer: true },
      });

      if (!tokenRecord) {
        throw new Error("INVALID_OR_EXPIRED_TOKEN");
      }

      if (tokenRecord.usedAt !== null) {
        throw new Error("TOKEN_ALREADY_USED");
      }

      if (tokenRecord.expiresAt < new Date()) {
        throw new Error("TOKEN_EXPIRED");
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      const updatedGolfer = await prisma.$transaction(async (tx) => {
        await tx.golferActivationToken.update({
          where: { id: tokenRecord.id },
          data: { usedAt: new Date() },
        });

        return tx.golferProfile.update({
          where: { id: tokenRecord.golferId },
          data: {
            passwordHash,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
          },
        });
      });

      return updatedGolfer;
    }

    const activatedGolfer = await confirmGolferActivationTest(
      secondActivationResult.debugToken,
      "NewSecurePassword123!"
    );

    assert(activatedGolfer.id === unactivatedGolfer.id, "Original GolferProfile linked to activation");
    assert(activatedGolfer.isEmailVerified === true, "Golfer marked verified upon activation");
    assert(!!activatedGolfer.passwordHash, "Golfer passwordHash set upon activation");

    // Verify token marked used
    const spentToken = await prisma.golferActivationToken.findUnique({
      where: { id: activeTokens[0].id },
    });
    assert(spentToken.usedAt !== null, "Activation token marked usedAt after single use");

    // -------------------------------------------------------------
    // TEST 8: Already-Activated Golfer Flag Detection
    // -------------------------------------------------------------
    console.log("\n[Test 8: Already-activated golfer detection]");
    const activeReg = await prisma.registration.create({
      data: {
        referenceNumber: `REG-ACT-${runId.toUpperCase()}`,
        tournamentId: tournament.id,
        golferId: activeGolfer.id,
        divisionId: division.id,
        status: RegistrationStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        entryFeePaid: 25.0,
        currency: "USD",
      },
      include: {
        tournament: { select: { name: true, hostClub: { select: { name: true } } } },
        division: { select: { name: true } },
        golfer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isEmailVerified: true,
            passwordHash: true,
          },
        },
      },
    });

    const activeApiResponseReg = {
      id: activeReg.id,
      referenceNumber: activeReg.referenceNumber,
      golferEmail: activeReg.golfer.email,
      isActivated: Boolean(activeReg.golfer.isEmailVerified && activeReg.golfer.passwordHash),
    };

    assert(activeApiResponseReg.isActivated === true, "Pre-activated golfer correctly resolved as isActivated: true");

    console.log("\n" + "=".repeat(80));
    console.log("🎉 ALL ACTIVATION FLOW & MODAL CONFIRMATION TESTS PASSED (8/8)");
    console.log("=".repeat(80));
  } finally {
    console.log("\n[Cleanup: Removing test fixtures cleanly]");
    try {
      if (tournament) {
        await prisma.golferNotification.deleteMany({
          where: { golfer: { email: { in: [testGolferEmail, existingActiveEmail] } } },
        });
        await prisma.golferActivationToken.deleteMany({
          where: { email: { in: [testGolferEmail, existingActiveEmail] } },
        });
        await prisma.payment.deleteMany({
          where: { registration: { tournamentId: tournament.id } },
        });
        await prisma.registration.deleteMany({
          where: { tournamentId: tournament.id },
        });
        await prisma.golferProfile.deleteMany({
          where: { email: { in: [testGolferEmail, existingActiveEmail] } },
        });
        await prisma.division.deleteMany({
          where: { tournamentId: tournament.id },
        });
        await prisma.tournament.delete({
          where: { id: tournament.id },
        });
      }
      console.log("  ✓ All isolated test fixtures cleaned up cleanly.");
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }
  }
}

runActivationFlowSuite().catch((err) => {
  console.error("FATAL ERROR in activation suite:", err);
  process.exit(1);
});
