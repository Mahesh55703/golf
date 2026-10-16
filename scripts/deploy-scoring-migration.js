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

console.log("⛳ Deploying additive scoring models schema migration to Neon PostgreSQL...");

try {
  // Use db push with accept-data-loss false to safely apply additive scoring tables
  const output = execSync("npx prisma db push", {
    env: process.env,
    stdio: "inherit",
  });
  console.log("✅ Scoring tables successfully synced to Neon PostgreSQL.");
} catch (err) {
  console.error("❌ Migration error:", err.message);
  process.exit(1);
}
