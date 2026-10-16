const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

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

const cmd = process.argv.slice(2).join(" ") || "npx prisma migrate status";
console.log(`Executing: ${cmd}`);

try {
  const out = execSync(cmd, { env: process.env, encoding: "utf8" });
  console.log(out);
} catch (err) {
  console.error("Command error output:\n", err.stdout || err.stderr || err.message);
  process.exit(1);
}
