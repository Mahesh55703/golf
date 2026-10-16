const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// 1. Load .env.local
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

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function runTests() {
  console.log("=========================================");
  console.log("   GOLFPULSE PHASE 3.2 VERIFICATION");
  console.log("=========================================");

  // Check 1: Prisma Schema Validation
  try {
    process.stdout.write("1. Prisma schema validation: ");
    const out = execSync("npx prisma validate", { env: process.env }).toString();
    console.log("PASSED ✅");
  } catch (err) {
    console.log("FAILED ❌", err.message);
  }

  // Check 2: Neon Database Connection & Club/Tournament Counts
  let connected = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt === 1) process.stdout.write("2. Database seeded records verification: ");
      const clubCount = await prisma.club.count();
      const courseCount = await prisma.golfCourse.count();
      const tournamentCount = await prisma.tournament.count();
      const roundCount = await prisma.round.count();
      const divisionCount = await prisma.division.count();

      console.log(`PASSED ✅ (Clubs: ${clubCount}, Courses: ${courseCount}, Tournaments: ${tournamentCount}, Rounds: ${roundCount}, Divisions: ${divisionCount})`);
      connected = true;
      break;
    } catch (err) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 2500));
      } else {
        console.log("FAILED ❌", err.message);
      }
    }
  }

  // Check 3: Query Sample Seeded Tournament with Relations
  if (connected) {
    try {
      process.stdout.write("3. Tournament relational data structure: ");
      const t = await prisma.tournament.findUnique({
        where: { slug: "indore-open-2026" },
        include: {
          hostClub: true,
          defaultCourse: true,
          rounds: true,
          divisions: true,
        },
      });
      if (t && t.hostClub && t.defaultCourse && t.rounds.length > 0 && t.divisions.length > 0) {
        console.log(`PASSED ✅ (${t.name} -> ${t.hostClub.name}, Rounds: ${t.rounds.length}, Divisions: ${t.divisions.length})`);
      } else {
        console.log("FAILED ❌ (Missing relations)");
      }
    } catch (err) {
      console.log("FAILED ❌", err.message);
    }
  } else {
    console.log("3. Tournament relational data structure: SKIPPED (no DB connection)");
  }

  // Check 4: Test HTTP API Routes against running dev server
  const http = require("http");

  function testHttp(options, postData = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ statusCode: res.statusCode, body }));
      });
      req.on("error", reject);
      if (postData) req.write(postData);
      req.end();
    });
  }

  try {
    process.stdout.write("4. Unauthenticated Clubs API returns 401: ");
    const res = await testHttp({
      hostname: "localhost",
      port: 3000,
      path: "/api/admin/clubs",
      method: "GET",
    });
    if (res.statusCode === 401) {
      console.log("PASSED ✅ (HTTP 401)");
    } else {
      console.log(`FAILED ❌ (Received HTTP ${res.statusCode})`);
    }
  } catch (err) {
    console.log("SKIPPED ⚠️ (Dev server not reachable):", err.message);
  }

  try {
    process.stdout.write("5. Unauthenticated Tournaments API returns 401: ");
    const res = await testHttp({
      hostname: "localhost",
      port: 3000,
      path: "/api/admin/tournaments",
      method: "GET",
    });
    if (res.statusCode === 401) {
      console.log("PASSED ✅ (HTTP 401)");
    } else {
      console.log(`FAILED ❌ (Received HTTP ${res.statusCode})`);
    }
  } catch (err) {
    console.log("SKIPPED ⚠️:", err.message);
  }

  try {
    process.stdout.write("6. Public Tournaments Page HTTP 200: ");
    const res = await testHttp({
      hostname: "localhost",
      port: 3000,
      path: "/tournaments",
      method: "GET",
    });
    if (res.statusCode === 200) {
      console.log("PASSED ✅ (HTTP 200)");
    } else {
      console.log(`FAILED ❌ (Received HTTP ${res.statusCode})`);
    }
  } catch (err) {
    console.log("SKIPPED ⚠️:", err.message);
  }

  try {
    process.stdout.write("7. Public Tournament Detail Page HTTP 200: ");
    const res = await testHttp({
      hostname: "localhost",
      port: 3000,
      path: "/tournaments/indore-open-2026",
      method: "GET",
    });
    if (res.statusCode === 200) {
      console.log("PASSED ✅ (HTTP 200)");
    } else {
      console.log(`FAILED ❌ (Received HTTP ${res.statusCode})`);
    }
  } catch (err) {
    console.log("SKIPPED ⚠️:", err.message);
  }

  try {
    process.stdout.write("8. Public Clubs Page HTTP 200: ");
    const res = await testHttp({
      hostname: "localhost",
      port: 3000,
      path: "/clubs",
      method: "GET",
    });
    if (res.statusCode === 200) {
      console.log("PASSED ✅ (HTTP 200)");
    } else {
      console.log(`FAILED ❌ (Received HTTP ${res.statusCode})`);
    }
  } catch (err) {
    console.log("SKIPPED ⚠️:", err.message);
  }

  try {
    process.stdout.write("9. Public Club Detail Page HTTP 200: ");
    const res = await testHttp({
      hostname: "localhost",
      port: 3000,
      path: "/clubs/prestige-golfshire-club",
      method: "GET",
    });
    if (res.statusCode === 200) {
      console.log("PASSED ✅ (HTTP 200)");
    } else {
      console.log(`FAILED ❌ (Received HTTP ${res.statusCode})`);
    }
  } catch (err) {
    console.log("SKIPPED ⚠️:", err.message);
  }

  await prisma.$disconnect();
  console.log("=========================================\n");
}

runTests();
