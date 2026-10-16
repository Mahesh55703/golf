const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING NEON POSTGRESQL STATE ===");

  // 1. Migrations
  const migrations = await prisma.$queryRaw`
    SELECT migration_name, finished_at, applied_steps_count 
    FROM _prisma_migrations 
    ORDER BY finished_at ASC
  `;
  console.log("\nApplied Migrations in _prisma_migrations:");
  console.table(migrations);

  // 2. Counts for all core domain tables
  const counts = {
    adminUsers: await prisma.adminUser.count(),
    adminSessions: await prisma.adminSession.count(),
    mediaAssets: await prisma.mediaAsset.count(),
    mediaSlots: await prisma.mediaSlot.count(),
    clubs: await prisma.club.count(),
    courses: await prisma.golfCourse.count(),
    courseHoles: await prisma.courseHole.count(),
    teeSets: await prisma.teeSet.count(),
    tournaments: await prisma.tournament.count(),
    rounds: await prisma.round.count(),
    divisions: await prisma.division.count(),
    golfers: await prisma.golferProfile.count(),
    registrations: await prisma.registration.count(),
    scorecards: await prisma.scorecard.count(),
    holeScores: await prisma.holeScore.count(),
    scorecardAuditLogs: await prisma.scorecardAuditLog.count(),
    competitionResults: await prisma.competitionResult.count(),
  };

  console.log("\nRecord counts across all database tables:");
  console.table(counts);

  // 3. Confirm Scoring Tables exist in information_schema
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name ASC
  `;
  console.log("\nPublic tables in Neon DB:");
  console.log(tables.map(t => t.table_name).join(", "));
}

main()
  .catch(err => {
    console.error("Error checking DB state:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
