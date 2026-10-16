const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_MEDIA_SLOTS = [
  { slotKey: "home.hero.main", pageKey: "home", displayName: "Homepage Hero Background", description: "Main header background visual on the landing page", aspectRatio: "21:9", recommendedWidth: 2200, recommendedHeight: 940, defaultUrl: "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=2200&q=90" },
  { slotKey: "home.quick.1", pageKey: "home", displayName: "Quick Card 1 — Stroke Play", description: "Card visual for Stroke Play format on homepage", aspectRatio: "16:9", recommendedWidth: 600, recommendedHeight: 340, defaultUrl: "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=600&q=80" },
  { slotKey: "home.quick.2", pageKey: "home", displayName: "Quick Card 2 — Match Play", description: "Card visual for Match Play format on homepage", aspectRatio: "16:9", recommendedWidth: 600, recommendedHeight: 340, defaultUrl: "https://images.unsplash.com/photo-1747321752143-aa29fe158a6f?auto=format&fit=crop&w=600&q=80" },
  { slotKey: "home.quick.3", pageKey: "home", displayName: "Quick Card 3 — Team Scramble", description: "Card visual for Team Scramble format on homepage", aspectRatio: "16:9", recommendedWidth: 600, recommendedHeight: 340, defaultUrl: "https://images.unsplash.com/photo-1758190153295-710199944b73?auto=format&fit=crop&w=600&q=80" },
  { slotKey: "home.quick.4", pageKey: "home", displayName: "Quick Card 4 — Stableford", description: "Card visual for Stableford format on homepage", aspectRatio: "16:9", recommendedWidth: 600, recommendedHeight: 340, defaultUrl: "https://images.unsplash.com/photo-1709525617119-1eaf632a2a91?auto=format&fit=crop&w=600&q=80" },
  { slotKey: "home.quick.5", pageKey: "home", displayName: "Quick Card 5 — Juniors & Amateurs", description: "Card visual for Juniors & Amateurs on homepage", aspectRatio: "16:9", recommendedWidth: 600, recommendedHeight: 340, defaultUrl: "https://images.unsplash.com/photo-1697448525888-8d682a1215a4?auto=format&fit=crop&w=600&q=80" },
  { slotKey: "home.quick.6", pageKey: "home", displayName: "Quick Card 6 — Destination Golf", description: "Card visual for Destination Golf on homepage", aspectRatio: "16:9", recommendedWidth: 600, recommendedHeight: 340, defaultUrl: "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=600&q=80" },
  { slotKey: "home.news.1", pageKey: "home", displayName: "Section News 1 — Metropolitan Championship", description: "News banner for Winter Championship", aspectRatio: "16:9", recommendedWidth: 800, recommendedHeight: 450, defaultUrl: "https://images.unsplash.com/photo-1611374243147-44a702c2d44c?auto=format&fit=crop&w=800&q=80" },
  { slotKey: "home.news.2", pageKey: "home", displayName: "Section News 2 — Junior Development", description: "News banner for Junior Golf announcement", aspectRatio: "16:9", recommendedWidth: 800, recommendedHeight: 450, defaultUrl: "https://images.unsplash.com/photo-1747321752143-aa29fe158a6f?auto=format&fit=crop&w=800&q=80" },
  { slotKey: "home.news.3", pageKey: "home", displayName: "Section News 3 — Agronomy Report", description: "News banner for course agronomy update", aspectRatio: "16:9", recommendedWidth: 800, recommendedHeight: 450, defaultUrl: "https://images.unsplash.com/photo-1697448525888-8d682a1215a4?auto=format&fit=crop&w=800&q=80" },
  { slotKey: "home.feed.1", pageKey: "home", displayName: "Section Feed — Championship Morning", description: "Featured large feed showcase", aspectRatio: "16:9", recommendedWidth: 900, recommendedHeight: 500, defaultUrl: "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=900&q=80" },
  { slotKey: "home.feed.2", pageKey: "home", displayName: "Section Feed — Final Round Putt", description: "Secondary feed card", aspectRatio: "16:9", recommendedWidth: 900, recommendedHeight: 500, defaultUrl: "https://images.unsplash.com/photo-1709525617119-1eaf632a2a91?auto=format&fit=crop&w=900&q=80" },
  { slotKey: "home.feed.3", pageKey: "home", displayName: "Section Feed — Trophy Presentation", description: "Secondary feed card", aspectRatio: "16:9", recommendedWidth: 900, recommendedHeight: 500, defaultUrl: "https://images.unsplash.com/photo-1538648759472-7251f7cb2c2f?auto=format&fit=crop&w=900&q=80" },
  { slotKey: "home.feed.4", pageKey: "home", displayName: "Section Feed — 18th Fairway Sundown", description: "Secondary feed card", aspectRatio: "16:9", recommendedWidth: 900, recommendedHeight: 500, defaultUrl: "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=900&q=80" },
  { slotKey: "global.video.poster", pageKey: "home", displayName: "Course Video Poster", description: "Poster thumbnail displayed before the course video loads", aspectRatio: "16:9", recommendedWidth: 1800, recommendedHeight: 1012, defaultUrl: "https://images.unsplash.com/photo-1597369237991-5c95d1b6e0c8?auto=format&fit=crop&w=1800&q=85" },
  { slotKey: "about.hero.main", pageKey: "about", displayName: "About Us Hero Background", description: "Header visual on the About Us page", aspectRatio: "21:9", recommendedWidth: 2200, recommendedHeight: 900, defaultUrl: "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=2200&q=90" },
  { slotKey: "faq.hero.main", pageKey: "faq", displayName: "FAQ Hero Background", description: "Header visual on the FAQ page", aspectRatio: "21:9", recommendedWidth: 2200, recommendedHeight: 900, defaultUrl: "https://images.unsplash.com/photo-1592937238247-cd0090e02f65?auto=format&fit=crop&w=2200&q=90" },
  { slotKey: "leaderboards.hero.main", pageKey: "leaderboards", displayName: "Leaderboards Hero Background", description: "Header visual on the Leaderboards page", aspectRatio: "21:9", recommendedWidth: 2200, recommendedHeight: 900, defaultUrl: "https://images.unsplash.com/photo-1747321752143-aa29fe158a6f?auto=format&fit=crop&w=2200&q=90" },
  { slotKey: "contact.hero.main", pageKey: "contact", displayName: "Contact Hero Background", description: "Header visual on the Contact page", aspectRatio: "21:9", recommendedWidth: 2200, recommendedHeight: 900, defaultUrl: "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=2200&q=90" },
  { slotKey: "tournaments.hero.main", pageKey: "tournaments", displayName: "Tournaments Directory Hero", description: "Hero header for Tournaments listing", aspectRatio: "21:9", recommendedWidth: 2200, recommendedHeight: 900, defaultUrl: "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=2200&q=90" },
  { slotKey: "tournaments.indore-open-2026.hero", pageKey: "tournaments", displayName: "Indore Open 2026 Hero", description: "Main header and card visual for PGA Metropolitan Winter Championship", aspectRatio: "16:9", recommendedWidth: 1200, recommendedHeight: 675, defaultUrl: "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=1200&q=85" },
  { slotKey: "tournaments.monsoon-stableford.hero", pageKey: "tournaments", displayName: "Monsoon Stableford Challenge Hero", description: "Header and card visual for Monsoon Stableford Challenge", aspectRatio: "16:9", recommendedWidth: 1000, recommendedHeight: 560, defaultUrl: "https://images.unsplash.com/photo-1592937238247-cd0090e02f65?auto=format&fit=crop&w=1000&q=85" },
  { slotKey: "tournaments.club-championship.hero", pageKey: "tournaments", displayName: "The Club Championship Hero", description: "Header and card visual for The Club Championship", aspectRatio: "16:9", recommendedWidth: 1000, recommendedHeight: 560, defaultUrl: "https://images.unsplash.com/photo-1611374243147-44a702c2d44c?auto=format&fit=crop&w=1000&q=85" },
  { slotKey: "tournaments.singapore-amateur.hero", pageKey: "tournaments", displayName: "Singapore Amateur Invitational Hero", description: "Header and card visual for Singapore Amateur Invitational", aspectRatio: "16:9", recommendedWidth: 1000, recommendedHeight: 560, defaultUrl: "https://images.unsplash.com/photo-1758190153295-710199944b73?auto=format&fit=crop&w=1000&q=85" },
  { slotKey: "tournaments.winter-scramble.hero", pageKey: "tournaments", displayName: "Winter Team Scramble Hero", description: "Header and card visual for Winter Team Scramble", aspectRatio: "16:9", recommendedWidth: 1000, recommendedHeight: 560, defaultUrl: "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=1000&q=85" },
  { slotKey: "tournaments.scottish-links.hero", pageKey: "tournaments", displayName: "Highlands Links Classic Hero", description: "Header and card visual for Highlands Links Classic", aspectRatio: "16:9", recommendedWidth: 1000, recommendedHeight: 560, defaultUrl: "https://images.unsplash.com/photo-1538648759472-7251f7cb2c2f?auto=format&fit=crop&w=1000&q=85" },
  { slotKey: "clubs.hero.main", pageKey: "clubs", displayName: "Clubs Directory Hero", description: "Hero header visual for Clubs directory page", aspectRatio: "21:9", recommendedWidth: 2200, recommendedHeight: 900, defaultUrl: "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=2200&q=90" },
  { slotKey: "clubs.prestige-golfshire-club.hero", pageKey: "clubs", displayName: "Prestige Golfshire Club Hero", description: "Hero visual for Prestige Golfshire Club profile", aspectRatio: "16:9", recommendedWidth: 2000, recommendedHeight: 1125, defaultUrl: "https://images.unsplash.com/photo-1758190153295-710199944b73?auto=format&fit=crop&w=2000&q=90" },
  { slotKey: "clubs.emerald-greens-golf-resort.hero", pageKey: "clubs", displayName: "Emerald Greens Golf Resort Hero", description: "Hero visual for Emerald Greens Golf Resort profile", aspectRatio: "16:9", recommendedWidth: 2000, recommendedHeight: 1125, defaultUrl: "https://images.unsplash.com/photo-1592937238247-cd0090e02f65?auto=format&fit=crop&w=2000&q=90" },
  { slotKey: "clubs.royal-valley-golf-club.hero", pageKey: "clubs", displayName: "Royal Valley Golf Club Hero", description: "Hero visual for Royal Valley Golf Club profile", aspectRatio: "16:9", recommendedWidth: 2000, recommendedHeight: 1125, defaultUrl: "https://images.unsplash.com/photo-1538648759472-7251f7cb2c2f?auto=format&fit=crop&w=2000&q=90" },
  { slotKey: "clubs.sentosa-golf-club.hero", pageKey: "clubs", displayName: "Sentosa Golf Club Hero", description: "Hero visual for Sentosa Golf Club profile", aspectRatio: "16:9", recommendedWidth: 2000, recommendedHeight: 1125, defaultUrl: "https://images.unsplash.com/photo-1709525617119-1eaf632a2a91?auto=format&fit=crop&w=2000&q=90" },
  { slotKey: "clubs.north-shore-golf-links.hero", pageKey: "clubs", displayName: "North Shore Golf Links Hero", description: "Hero visual for North Shore Golf Links profile", aspectRatio: "16:9", recommendedWidth: 2000, recommendedHeight: 1125, defaultUrl: "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=2000&q=90" },
  { slotKey: "clubs.lakes-golf-country-club.hero", pageKey: "clubs", displayName: "The Lakes Golf & Country Club Hero", description: "Hero visual for The Lakes Golf & Country Club profile", aspectRatio: "16:9", recommendedWidth: 2000, recommendedHeight: 1125, defaultUrl: "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=2000&q=90" },
  { slotKey: "gallery.hero.main", pageKey: "gallery", displayName: "Gallery Hero Background", description: "Hero header for Section Photo Gallery", aspectRatio: "21:9", recommendedWidth: 2200, recommendedHeight: 900, defaultUrl: "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=2200&q=90" }
];

async function seed() {
  console.log(`Seeding ${DEFAULT_MEDIA_SLOTS.length} media slots...`);
  for (const s of DEFAULT_MEDIA_SLOTS) {
    await prisma.mediaSlot.upsert({
      where: { slotKey: s.slotKey },
      update: s,
      create: s,
    });
  }

  const galleryCount = await prisma.galleryItem.count();
  if (galleryCount === 0) {
    console.log("Seeding initial gallery items...");
    const defaultGallery = [
      { title: "Morning on the fairway", category: "COURSE LANDSCAPES", fallbackUrl: "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=1400&q=90", className: "gallery-item gallery-item-large", order: 1 },
      { title: "Sunset over the championship greens", category: "AERIAL PERSPECTIVE", fallbackUrl: "https://images.unsplash.com/photo-1709525617119-1eaf632a2a91?auto=format&fit=crop&w=1000&q=85", className: "gallery-item", order: 2 },
      { title: "The perfect roll on the green", category: "EQUIPMENT & FOCUS", fallbackUrl: "https://images.unsplash.com/photo-1597369237991-5c95d1b6e0c8?auto=format&fit=crop&w=1000&q=85", className: "gallery-item", order: 3 },
      { title: "Pond reflection on the fairway", category: "DESTINATION GOLF", fallbackUrl: "https://images.unsplash.com/photo-1758190153295-710199944b73?auto=format&fit=crop&w=1200&q=85", className: "gallery-item gallery-item-wide", order: 4 },
      { title: "Addressing the championship putt", category: "THE GAME", fallbackUrl: "https://images.unsplash.com/photo-1747321752143-aa29fe158a6f?auto=format&fit=crop&w=1000&q=85", className: "gallery-item", order: 5 },
      { title: "Lakeside morning round", category: "THE LANDSCAPE", fallbackUrl: "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=1000&q=85", className: "gallery-item", order: 6 },
    ];
    for (const item of defaultGallery) {
      await prisma.galleryItem.create({ data: item });
    }
  }

  console.log("✅ Seed completed successfully!");
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
