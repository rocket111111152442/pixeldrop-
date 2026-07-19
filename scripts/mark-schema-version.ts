import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const SCHEMA_VERSION = "5";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  try {
    await prisma.setting.upsert({
      where: { key: "schema_version" },
      create: { key: "schema_version", value: SCHEMA_VERSION },
      update: { value: SCHEMA_VERSION },
    });
    console.log(`[db-setup] Version du schéma marquée: ${SCHEMA_VERSION}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.warn("[db-setup] Version du schéma non marquée:", e?.message || e);
  process.exit(1);
});
