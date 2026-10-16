const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const enums = await prisma.$queryRaw`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE typname = 'ScorecardStatus'
  `;
  console.log("ScorecardStatus Enum values in DB:", enums.map(e => e.enumlabel));
}

main().finally(() => prisma.$disconnect());
