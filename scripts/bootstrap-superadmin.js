const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables from .env.local
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

async function bootstrap() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || 'Super Administrator';

  if (!email || !password) {
    console.error('Usage: node scripts/bootstrap-superadmin.js <email> <password> [name]');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  // Check if a SUPER_ADMIN already exists
  const existingSuperAdmin = await prisma.adminUser.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (existingSuperAdmin) {
    console.error(`Error: A SUPER_ADMIN already exists (${existingSuperAdmin.email}). Bootstrap aborted.`);
    process.exit(1);
  }

  const existingEmail = await prisma.adminUser.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existingEmail) {
    console.error(`Error: User with email ${email} already exists.`);
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const admin = await prisma.adminUser.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash,
      name,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      action: 'USER_ROLE_CHANGE',
      details: `Initial SUPER_ADMIN bootstrapped: ${admin.email}`,
      adminUserId: admin.id,
      targetEmail: admin.email,
    },
  });

  console.log(`\n✅ Success! Super Admin created successfully.`);
  console.log(`Email: ${admin.email}`);
  console.log(`Role: ${admin.role}`);
  console.log(`ID: ${admin.id}\n`);
}

bootstrap()
  .catch((e) => {
    console.error('Bootstrap failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
