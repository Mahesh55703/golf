/**
 * Phase 4.3 QA & Regression Test Suite:
 * Tournament Lifecycle Synchronization & Server-Side Registration Enforcement
 */

const fs = require("fs");
const path = require("path");

// Load .env.local if present
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
      process.env[key] = val;
    }
  }
}

const { PrismaClient, TournamentStatus, RegistrationStatus, PaymentStatus } = require("@prisma/client");
const prisma = new PrismaClient();

// Test runner tracking
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("⛳ GOLFPULSE TOURNAMENT LIFECYCLE AUDIT & QA SUITE");
  console.log("=======================================================\n");

  // Dynamic import of compiled/ts lifecycle helper
  // Since we are running in node, let's load deriveTournamentLifecycle
  const { deriveTournamentLifecycle } = require(path.join(__dirname, "..", "lib", "tournament-lifecycle.ts"));

  // -------------------------------------------------------------
  // TEST GROUP 1: Canonical Lifecycle Presentation & Eligibility
  // -------------------------------------------------------------
  console.log("--- 1. Canonical Lifecycle Derivation Unit Tests ---");

  // 1. In Progress tournament
  const inProgressRes = deriveTournamentLifecycle({
    status: TournamentStatus.IN_PROGRESS,
    startDate: "2026-11-14T08:00:00Z",
    endDate: "2026-11-15T18:00:00Z",
    fieldCapacity: 120,
    registrationsCount: 2,
  });
  assert(inProgressRes.canRegister === false, "In Progress tournament disallows registration");
  assert(inProgressRes.displayStatus === "In progress", "In Progress display status is 'In progress'");
  assert(inProgressRes.badgeLabel === "In progress", "In Progress badge label is 'In progress'");
  assert(inProgressRes.badgeStyle === "status-inprogress", "In Progress badge style is 'status-inprogress'");
  assert(inProgressRes.ctaLabel === "Tournament in progress", "In Progress CTA is 'Tournament in progress'");
  assert(inProgressRes.rejectionCode === "TOURNAMENT_IN_PROGRESS", "In Progress rejection code is 'TOURNAMENT_IN_PROGRESS'");

  // 2. Published upcoming tournament (not yet open)
  const publishedRes = deriveTournamentLifecycle({
    status: TournamentStatus.PUBLISHED,
    startDate: "2027-01-16T08:00:00Z",
    endDate: "2027-01-17T18:00:00Z",
    fieldCapacity: 144,
    registrationsCount: 0,
  });
  assert(publishedRes.canRegister === false, "Published tournament disallows registration");
  assert(publishedRes.displayStatus === "Coming soon", "Published display status is 'Coming soon'");
  assert(publishedRes.badgeLabel === "Coming soon", "Published badge label is 'Coming soon'");
  assert(publishedRes.ctaLabel === "Notify me when open", "Published CTA is 'Notify me when open'");
  assert(publishedRes.rejectionCode === "REGISTRATION_NOT_YET_OPEN", "Published rejection code is 'REGISTRATION_NOT_YET_OPEN'");

  // 3. Open registration tournament
  const openRes = deriveTournamentLifecycle({
    status: TournamentStatus.REGISTRATION_OPEN,
    startDate: "2026-11-22T08:00:00Z",
    endDate: "2026-11-22T18:00:00Z",
    fieldCapacity: 96,
    registrationsCount: 1,
  });
  assert(openRes.canRegister === true, "Registration open tournament permits registration");
  assert(openRes.displayStatus === "Registration open", "Open display status is 'Registration open'");
  assert(openRes.badgeLabel === "Registration open", "Open badge label is 'Registration open'");
  assert(openRes.badgeStyle === "status-open", "Open badge style is 'status-open'");
  assert(openRes.ctaLabel === "Register for tournament", "Open CTA is 'Register for tournament'");
  assert(openRes.isCtaDisabled === false, "Open CTA is enabled");

  // 4. Manually closed upcoming tournament
  const closedRes = deriveTournamentLifecycle({
    status: TournamentStatus.REGISTRATION_CLOSED,
    startDate: "2026-12-05T08:00:00Z",
    endDate: "2026-12-06T18:00:00Z",
    fieldCapacity: 64,
    registrationsCount: 10,
  });
  assert(closedRes.canRegister === false, "Closed tournament disallows registration");
  assert(closedRes.displayStatus === "Registration closed", "Closed display status is 'Registration closed'");
  assert(closedRes.badgeLabel === "Registration closed", "Closed badge label is 'Registration closed'");
  assert(closedRes.badgeStyle === "status-closed", "Closed badge style is 'status-closed'");
  assert(closedRes.ctaLabel === "Registration closed", "Closed CTA is 'Registration closed'");
  assert(closedRes.rejectionCode === "REGISTRATION_CLOSED", "Closed rejection code is 'REGISTRATION_CLOSED'");

  // 5. Completed tournament (FINALIZED)
  const completedRes = deriveTournamentLifecycle({
    status: TournamentStatus.FINALIZED,
    startDate: "2026-10-01T08:00:00Z",
    endDate: "2026-10-02T18:00:00Z",
    fieldCapacity: 50,
    registrationsCount: 50,
  });
  assert(completedRes.canRegister === false, "Completed tournament disallows registration");
  assert(completedRes.displayStatus === "Completed", "Completed display status is 'Completed'");
  assert(completedRes.badgeLabel === "Completed", "Completed badge label is 'Completed'");
  assert(completedRes.badgeStyle === "status-completed", "Completed badge style is 'status-completed'");
  assert(completedRes.ctaLabel === "Tournament completed", "Completed CTA is 'Tournament completed'");
  assert(completedRes.rejectionCode === "TOURNAMENT_COMPLETED", "Completed rejection code is 'TOURNAMENT_COMPLETED'");

  // 6. Cancelled tournament
  const cancelledRes = deriveTournamentLifecycle({
    status: TournamentStatus.CANCELLED,
    startDate: "2026-12-25T08:00:00Z",
    endDate: "2026-12-26T18:00:00Z",
    fieldCapacity: 80,
    registrationsCount: 5,
  });
  assert(cancelledRes.canRegister === false, "Cancelled tournament disallows registration");
  assert(cancelledRes.displayStatus === "Cancelled", "Cancelled display status is 'Cancelled'");
  assert(cancelledRes.badgeLabel === "Cancelled", "Cancelled badge label is 'Cancelled'");
  assert(cancelledRes.badgeStyle === "status-cancelled", "Cancelled badge style is 'status-cancelled'");
  assert(cancelledRes.ctaLabel === "Tournament cancelled", "Cancelled CTA is 'Tournament cancelled'");
  assert(cancelledRes.rejectionCode === "TOURNAMENT_CANCELLED", "Cancelled rejection code is 'TOURNAMENT_CANCELLED'");

  // 7. Full capacity tournament
  const fullRes = deriveTournamentLifecycle({
    status: TournamentStatus.REGISTRATION_OPEN,
    startDate: "2026-12-19T08:00:00Z",
    endDate: "2026-12-19T18:00:00Z",
    fieldCapacity: 80,
    registrationsCount: 80, // Full
  });
  assert(fullRes.canRegister === false, "Full tournament disallows registration");
  assert(fullRes.displayStatus === "Full", "Full tournament display status is 'Full'");
  assert(fullRes.badgeLabel === "Full", "Full tournament badge label is 'Full'");
  assert(fullRes.badgeStyle === "status-full", "Full tournament badge style is 'status-full'");
  assert(fullRes.ctaLabel === "Tournament at capacity", "Full tournament CTA is 'Tournament at capacity'");
  assert(fullRes.rejectionCode === "TOURNAMENT_CAPACITY_FULL", "Full tournament rejection code is 'TOURNAMENT_CAPACITY_FULL'");

  // 8. Registration window start and end boundaries
  const testRefTime = new Date("2026-11-01T12:00:00Z");

  // 8a. Before window opens
  const beforeWindowRes = deriveTournamentLifecycle({
    status: TournamentStatus.REGISTRATION_OPEN,
    startDate: "2026-11-20T08:00:00Z",
    endDate: "2026-11-21T18:00:00Z",
    registrationOpenAt: "2026-11-05T00:00:00Z", // In future relative to testRefTime
    registrationCloseAt: "2026-11-18T23:59:59Z",
    fieldCapacity: 100,
    registrationsCount: 0,
    referenceDate: testRefTime,
  });
  assert(beforeWindowRes.canRegister === false, "Before window opens disallows registration");
  assert(beforeWindowRes.badgeLabel === "Opens soon", "Before window badge is 'Opens soon'");
  assert(beforeWindowRes.rejectionCode === "REGISTRATION_NOT_YET_OPEN", "Rejection code before window is 'REGISTRATION_NOT_YET_OPEN'");

  // 8b. Within window
  const inWindowRes = deriveTournamentLifecycle({
    status: TournamentStatus.REGISTRATION_OPEN,
    startDate: "2026-11-20T08:00:00Z",
    endDate: "2026-11-21T18:00:00Z",
    registrationOpenAt: "2026-10-15T00:00:00Z", // Past
    registrationCloseAt: "2026-11-15T23:59:59Z", // Future
    fieldCapacity: 100,
    registrationsCount: 10,
    referenceDate: testRefTime,
  });
  assert(inWindowRes.canRegister === true, "Within registration window permits registration");
  assert(inWindowRes.badgeLabel === "Registration open", "Within window badge is 'Registration open'");

  // 8c. After deadline elapsed
  const afterDeadlineRes = deriveTournamentLifecycle({
    status: TournamentStatus.REGISTRATION_OPEN,
    startDate: "2026-11-20T08:00:00Z",
    endDate: "2026-11-21T18:00:00Z",
    registrationOpenAt: "2026-10-01T00:00:00Z",
    registrationCloseAt: "2026-10-25T23:59:59Z", // In past relative to testRefTime
    fieldCapacity: 100,
    registrationsCount: 20,
    referenceDate: testRefTime,
  });
  assert(afterDeadlineRes.canRegister === false, "After deadline disallows registration");
  assert(afterDeadlineRes.badgeLabel === "Registration closed", "After deadline badge is 'Registration closed'");
  assert(afterDeadlineRes.rejectionCode === "REGISTRATION_DEADLINE_PASSED", "Rejection code after deadline is 'REGISTRATION_DEADLINE_PASSED'");

  // -------------------------------------------------------------
  // TEST GROUP 2: PGA Metropolitan Winter Championship Neon Audit
  // -------------------------------------------------------------
  console.log("\n--- 2. PGA Metropolitan Winter Championship DB State Audit ---");

  const metropolitan = await prisma.tournament.findFirst({
    where: { slug: "indore-open-2026" },
    include: {
      registrations: {
        include: { golfer: true, payments: true },
      },
      hostClub: true,
    },
  });

  assert(Boolean(metropolitan), "PGA Metropolitan Winter Championship record found in Neon");
  if (metropolitan) {
    assert(metropolitan.status === TournamentStatus.IN_PROGRESS, `DB stored status is IN_PROGRESS (actual: ${metropolitan.status})`);
    assert(metropolitan.fieldCapacity === 120, "Capacity is 120");
    assert(metropolitan.registrations.length === 2, `Confirmed player registrations count is 2 (actual: ${metropolitan.registrations.length})`);

    const metroLifecycle = deriveTournamentLifecycle({
      status: metropolitan.status,
      startDate: metropolitan.startDate,
      endDate: metropolitan.endDate,
      registrationOpenAt: metropolitan.registrationOpenAt,
      registrationCloseAt: metropolitan.registrationCloseAt,
      fieldCapacity: metropolitan.fieldCapacity,
      registrationsCount: metropolitan.registrations.length,
      timeZone: metropolitan.timeZone,
      publishedAt: metropolitan.publishedAt,
    });

    assert(metroLifecycle.canRegister === false, "Metropolitan registration eligibility is FALSE");
    assert(metroLifecycle.displayStatus === "In progress", "Metropolitan display status is 'In progress'");
    assert(metroLifecycle.badgeLabel === "In progress", "Metropolitan badge is 'In progress' (never 'Registration open')");
    assert(metroLifecycle.badgeStyle === "status-inprogress", "Metropolitan badge style is 'status-inprogress'");
    assert(metroLifecycle.ctaLabel === "Tournament in progress", "Metropolitan CTA is 'Tournament in progress' (never 'Notify me when open')");
    assert(metroLifecycle.isCtaDisabled === true, "Metropolitan CTA is disabled");

    // Verify existing confirmed registrations were not altered
    const paidReg = metropolitan.registrations.find((r) => r.paymentStatus === "PAID");
    assert(Boolean(paidReg), "Legitimate existing PAID registration is preserved");
    if (paidReg) {
      assert(paidReg.status === "CONFIRMED", "Existing registration remains CONFIRMED");
    }
  }

  // -------------------------------------------------------------
  // TEST GROUP 3: Server-Side Registration API Enforcement
  // -------------------------------------------------------------
  console.log("\n--- 3. Server-Side Registration & Payment Rejection Checks ---");

  // Mirror of initiateCheckout server-side transaction logic from lib/payments/service.ts
  async function simulateInitiateCheckout(registrationId) {
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
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });

      if (!registration) throw new Error("REGISTRATION_NOT_FOUND");
      if (registration.status === RegistrationStatus.CANCELLED || registration.status === RegistrationStatus.WITHDRAWN) {
        throw new Error("REGISTRATION_CANCELLED");
      }
      if (registration.paymentStatus === PaymentStatus.PAID) throw new Error("ALREADY_PAID");

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

      return { isFree: false, registrationId: registration.id, amount: serverAmount, currency: serverCurrency };
    });
  }

  // 3a. Check that initiateCheckout rejects on an IN_PROGRESS tournament registration
  // Let's create a temporary unpaid test registration on the metropolitan tournament to verify checkout rejection
  const tempTestGolfer = await prisma.golferProfile.upsert({
    where: { email: "qa-test-temp@golfpulse.test" },
    update: {},
    create: {
      email: "qa-test-temp@golfpulse.test",
      firstName: "QA",
      lastName: "Tester",
      handicapIndex: 10.0,
      handicapStatus: "VERIFIED",
    },
  });

  // Ensure no stale reg exists
  await prisma.registration.deleteMany({
    where: { golferId: tempTestGolfer.id, tournamentId: metropolitan.id },
  });

  const tempPendingReg = await prisma.registration.create({
    data: {
      referenceNumber: `GP-QA-TEMP-${Date.now().toString().slice(-4)}`,
      tournamentId: metropolitan.id,
      golferId: tempTestGolfer.id,
      status: RegistrationStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      entryFeePaid: 150.0,
      currency: "USD",
    },
  });

  let checkoutRejected = false;
  let checkoutErrorMsg = "";
  try {
    await simulateInitiateCheckout(tempPendingReg.id);
  } catch (err) {
    checkoutRejected = true;
    checkoutErrorMsg = err.message;
  }

  assert(checkoutRejected === true, "simulateInitiateCheckout rejected pending order for IN_PROGRESS tournament");
  assert(checkoutErrorMsg === "TOURNAMENT_IN_PROGRESS", `Rejection reason was TOURNAMENT_IN_PROGRESS (got: ${checkoutErrorMsg})`);

  // Clean up temporary test registration and golfer
  await prisma.registration.delete({ where: { id: tempPendingReg.id } });
  await prisma.golferProfile.delete({ where: { id: tempTestGolfer.id } });

  // -------------------------------------------------------------
  // TEST GROUP 4: Registration API Logic Verification
  // -------------------------------------------------------------
  console.log("\n--- 4. Direct Registration API Handler Invariant Checks ---");

  // Helper function replicating the POST /api/tournaments/register transaction logic
  async function testRegisterSimulation(slug, golferEmail) {
    const tournament = await prisma.tournament.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
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
    });

    if (!tournament) return { status: 404, error: "TOURNAMENT_NOT_FOUND" };

    const lifecycle = deriveTournamentLifecycle({
      status: tournament.status,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      registrationOpenAt: tournament.registrationOpenAt,
      registrationCloseAt: tournament.registrationCloseAt,
      fieldCapacity: tournament.fieldCapacity,
      registrationsCount: tournament._count.registrations,
      timeZone: tournament.timeZone,
      publishedAt: tournament.publishedAt,
    });

    if (!lifecycle.canRegister) {
      return { status: 409, error: lifecycle.rejectionCode };
    }

    return { status: 200, success: true };
  }

  // Check Metropolitan Winter Championship registration rejection
  const regResult = await testRegisterSimulation("indore-open-2026", "new-golfer@golfpulse.test");
  assert(regResult.status === 409, "Registration API rejects registration for indore-open-2026 with 409");
  assert(regResult.error === "TOURNAMENT_IN_PROGRESS", "Registration API returns TOURNAMENT_IN_PROGRESS error");

  // Check an open registration event
  const openTournament = await prisma.tournament.findFirst({
    where: { status: TournamentStatus.REGISTRATION_OPEN },
  });
  if (openTournament) {
    const openRegResult = await testRegisterSimulation(openTournament.slug, "new-golfer@golfpulse.test");
    assert(openRegResult.status === 200, `Registration API accepts registration for REGISTRATION_OPEN event (${openTournament.slug})`);
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log("=======================================================\n");

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("QA execution crashed:", err);
  prisma.$disconnect();
  process.exit(1);
});
