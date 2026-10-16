const { PrismaClient, TournamentFormat, TournamentAccess, TournamentStatus } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

// Load .env.local if DATABASE_URL is not set in environment
if (!process.env.DATABASE_URL) {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const eq = line.indexOf("=");
      if (eq > 0) {
        const k = line.slice(0, eq).trim();
        let v = line.slice(eq + 1).trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        process.env[k] = v;
      }
    }
  }
}

const prisma = new PrismaClient();

const CLUBS_DATA = [
  {
    slug: "prestige-golfshire-club",
    name: "Prestige Golfshire Club",
    description: "A welcoming setting for competitive rounds and community golf.",
    city: "Indore",
    state: "Madhya Pradesh",
    country: "India",
    timeZone: "Asia/Kolkata",
    heroImageUrl: "https://images.unsplash.com/photo-1758190153295-710199944b73?auto=format&fit=crop&w=2000&q=90",
    course: {
      name: "Prestige Championship Course",
      slug: "prestige-championship-course",
      holesCount: 18,
      par: 72,
    },
  },
  {
    slug: "emerald-greens-golf-resort",
    name: "Emerald Greens Golf Resort",
    description: "A scenic escape for social golf and format-friendly events.",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    timeZone: "Asia/Kolkata",
    heroImageUrl: "https://images.unsplash.com/photo-1592937238247-cd0090e02f65?auto=format&fit=crop&w=2000&q=90",
    course: {
      name: "Emerald Greens Resort Course",
      slug: "emerald-greens-resort-course",
      holesCount: 18,
      par: 72,
    },
  },
  {
    slug: "royal-valley-golf-club",
    name: "Royal Valley Golf Club",
    description: "Club competition, match play, and a year-round golf community.",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    timeZone: "Asia/Kolkata",
    heroImageUrl: "https://images.unsplash.com/photo-1538648759472-7251f7cb2c2f?auto=format&fit=crop&w=2000&q=90",
    course: {
      name: "Royal Valley Championship Links",
      slug: "royal-valley-championship-links",
      holesCount: 18,
      par: 72,
    },
  },
  {
    slug: "sentosa-golf-club",
    name: "Sentosa Golf Club",
    description: "International golf inspiration for players who love to travel.",
    city: "Sentosa Island",
    state: "Singapore",
    country: "Singapore",
    timeZone: "Asia/Singapore",
    heroImageUrl: "https://images.unsplash.com/photo-1709525617119-1eaf632a2a91?auto=format&fit=crop&w=2000&q=90",
    course: {
      name: "Serapong Course",
      slug: "sentosa-serapong-course",
      holesCount: 18,
      par: 72,
    },
  },
  {
    slug: "north-shore-golf-links",
    name: "North Shore Golf Links",
    description: "Classic links-style scenery and destination tournament possibilities.",
    city: "St Andrews",
    state: "Fife",
    country: "Scotland",
    timeZone: "Europe/London",
    heroImageUrl: "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=2000&q=90",
    course: {
      name: "North Shore Old Links",
      slug: "north-shore-old-links",
      holesCount: 18,
      par: 72,
    },
  },
  {
    slug: "lakes-golf-country-club",
    name: "The Lakes Golf & Country Club",
    description: "A place for team formats, club days, and friendly competition.",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    timeZone: "Asia/Kolkata",
    heroImageUrl: "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=2000&q=90",
    course: {
      name: "The Lakes Course",
      slug: "the-lakes-course",
      holesCount: 18,
      par: 72,
    },
  },
];

const TOURNAMENTS_DATA = [
  {
    slug: "indore-open-2026",
    name: "PGA Metropolitan Winter Championship",
    clubSlug: "prestige-golfshire-club",
    startDate: new Date("2026-11-14T08:00:00Z"),
    endDate: new Date("2026-11-15T18:00:00Z"),
    format: TournamentFormat.STROKE_PLAY,
    access: TournamentAccess.PUBLIC,
    status: TournamentStatus.REGISTRATION_OPEN,
    entryFee: 150.0,
    currency: "USD",
    fieldCapacity: 120,
    handicapRequired: true,
    maxHandicapLimit: 18.0,
    featured: true,
    heroImageUrl: "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=1200&q=85",
    description: "The marquee winter tournament for PGA Metropolitan sectional competitors, featuring two rounds of premier stroke play.",
  },
  {
    slug: "monsoon-stableford",
    name: "Monsoon Stableford Challenge",
    clubSlug: "emerald-greens-golf-resort",
    startDate: new Date("2026-11-22T08:00:00Z"),
    endDate: new Date("2026-11-22T17:00:00Z"),
    format: TournamentFormat.STABLEFORD,
    access: TournamentAccess.PUBLIC,
    status: TournamentStatus.REGISTRATION_OPEN,
    entryFee: 25.0,
    currency: "USD",
    fieldCapacity: 96,
    handicapRequired: false,
    featured: false,
    heroImageUrl: "https://images.unsplash.com/photo-1592937238247-cd0090e02f65?auto=format&fit=crop&w=1000&q=85",
    description: "A scenic single-day Stableford points challenge welcoming golfers of all skill levels on lush monsoon fairways.",
  },
  {
    slug: "club-championship",
    name: "The Club Championship",
    clubSlug: "royal-valley-golf-club",
    startDate: new Date("2026-12-05T08:00:00Z"),
    endDate: new Date("2026-12-06T18:00:00Z"),
    format: TournamentFormat.MATCH_PLAY,
    access: TournamentAccess.MEMBERS_ONLY,
    status: TournamentStatus.REGISTRATION_OPEN,
    entryFee: 20.0,
    currency: "USD",
    fieldCapacity: 64,
    handicapRequired: true,
    maxHandicapLimit: 24.0,
    featured: false,
    heroImageUrl: "https://images.unsplash.com/photo-1611374243147-44a702c2d44c?auto=format&fit=crop&w=1000&q=85",
    description: "Exclusive annual club championship match play bracket to crown Royal Valley's club champions.",
  },
  {
    slug: "singapore-amateur",
    name: "Singapore Amateur Invitational",
    clubSlug: "sentosa-golf-club",
    startDate: new Date("2027-01-16T08:00:00Z"),
    endDate: new Date("2027-01-17T18:00:00Z"),
    format: TournamentFormat.STROKE_PLAY,
    access: TournamentAccess.PUBLIC,
    status: TournamentStatus.PUBLISHED, // Coming soon
    entryFee: 280.0,
    currency: "USD",
    fieldCapacity: 144,
    handicapRequired: true,
    maxHandicapLimit: 12.0,
    featured: false,
    heroImageUrl: "https://images.unsplash.com/photo-1758190153295-710199944b73?auto=format&fit=crop&w=1000&q=85",
    description: "Premier international destination tournament contested across 36 championship holes in Singapore.",
  },
  {
    slug: "winter-scramble",
    name: "Winter Team Scramble",
    clubSlug: "lakes-golf-country-club",
    startDate: new Date("2026-12-19T09:00:00Z"),
    endDate: new Date("2026-12-19T16:00:00Z"),
    format: TournamentFormat.SCRAMBLE,
    access: TournamentAccess.PUBLIC,
    status: TournamentStatus.REGISTRATION_OPEN,
    entryFee: 65.0,
    currency: "USD",
    fieldCapacity: 80,
    handicapRequired: false,
    featured: false,
    heroImageUrl: "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=1000&q=85",
    description: "Friendly 4-player team scramble tournament with prizes for longest drive, closest-to-pin, and lowest team gross.",
  },
  {
    slug: "scottish-links",
    name: "Highlands Links Classic",
    clubSlug: "north-shore-golf-links",
    startDate: new Date("2027-04-09T08:00:00Z"),
    endDate: new Date("2027-04-11T18:00:00Z"),
    format: TournamentFormat.STROKE_PLAY,
    access: TournamentAccess.PUBLIC,
    status: TournamentStatus.PUBLISHED, // Coming soon
    entryFee: 250.0,
    currency: "USD",
    fieldCapacity: 128,
    handicapRequired: true,
    maxHandicapLimit: 15.0,
    featured: false,
    heroImageUrl: "https://images.unsplash.com/photo-1538648759472-7251f7cb2c2f?auto=format&fit=crop&w=1000&q=85",
    description: "Historic 54-hole Scottish links competition through rolling dunes and seaside fairways.",
  },
];

async function seedGolfData() {
  console.log("⛳ Starting GolfPulse Core Golf Domain seed...");

  let clubsCreated = 0;
  let clubsUpdated = 0;
  let coursesCreated = 0;
  let tournamentsCreated = 0;
  let tournamentsUpdated = 0;

  const clubMap = new Map();
  const courseMap = new Map();

  // 1. Seed Clubs & Courses
  for (const c of CLUBS_DATA) {
    const club = await prisma.club.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        city: c.city,
        state: c.state,
        country: c.country,
        timeZone: c.timeZone,
        heroImageUrl: c.heroImageUrl,
      },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        city: c.city,
        state: c.state,
        country: c.country,
        timeZone: c.timeZone,
        heroImageUrl: c.heroImageUrl,
      },
    });

    clubMap.set(c.slug, club);

    // Upsert Default Course
    const course = await prisma.golfCourse.upsert({
      where: { slug: c.course.slug },
      update: {
        name: c.course.name,
        clubId: club.id,
        holesCount: c.course.holesCount,
        par: c.course.par,
        timeZone: c.timeZone,
      },
      create: {
        slug: c.course.slug,
        name: c.course.name,
        clubId: club.id,
        holesCount: c.course.holesCount,
        par: c.course.par,
        timeZone: c.timeZone,
      },
    });

    courseMap.set(c.slug, course);
    clubsCreated++;
  }

  // 2. Seed Tournaments
  for (const t of TOURNAMENTS_DATA) {
    const club = clubMap.get(t.clubSlug);
    const course = courseMap.get(t.clubSlug);

    const existing = await prisma.tournament.findUnique({
      where: { slug: t.slug },
    });

    const tournament = await prisma.tournament.upsert({
      where: { slug: t.slug },
      update: {
        name: t.name,
        description: t.description,
        hostClubId: club?.id,
        defaultCourseId: course?.id,
        startDate: t.startDate,
        endDate: t.endDate,
        format: t.format,
        access: t.access,
        status: t.status,
        entryFee: t.entryFee,
        currency: t.currency,
        fieldCapacity: t.fieldCapacity,
        handicapRequired: t.handicapRequired,
        maxHandicapLimit: t.maxHandicapLimit,
        featured: t.featured,
        heroImageUrl: t.heroImageUrl,
        publishedAt: new Date(),
      },
      create: {
        slug: t.slug,
        name: t.name,
        description: t.description,
        hostClubId: club?.id,
        defaultCourseId: course?.id,
        startDate: t.startDate,
        endDate: t.endDate,
        format: t.format,
        access: t.access,
        status: t.status,
        entryFee: t.entryFee,
        currency: t.currency,
        fieldCapacity: t.fieldCapacity,
        handicapRequired: t.handicapRequired,
        maxHandicapLimit: t.maxHandicapLimit,
        featured: t.featured,
        heroImageUrl: t.heroImageUrl,
        publishedAt: new Date(),
      },
    });

    if (existing) {
      tournamentsUpdated++;
    } else {
      tournamentsCreated++;
    }

    // Seed default round 1
    await prisma.round.upsert({
      where: {
        tournamentId_roundNumber: {
          tournamentId: tournament.id,
          roundNumber: 1,
        },
      },
      update: {
        name: "Round 1",
        roundDate: t.startDate,
        courseId: course?.id,
      },
      create: {
        tournamentId: tournament.id,
        roundNumber: 1,
        name: "Round 1",
        roundDate: t.startDate,
        courseId: course?.id,
      },
    });
  }

  console.log(`✅ Seed complete:`);
  console.log(`   Clubs upserted: ${clubMap.size}`);
  console.log(`   Courses upserted: ${courseMap.size}`);
  console.log(`   Tournaments: ${tournamentsCreated} created, ${tournamentsUpdated} updated`);
}

module.exports = { seedGolfData };

// Self-executing if run directly via Node
if (require.main === module) {
  seedGolfData()
    .catch((e) => {
      console.error("❌ Seed error:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
