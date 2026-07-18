import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@pixeldrop.app").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const pseudo = process.env.ADMIN_PSEUDO || "Admin";
  if (!password || password.length < 12) {
    console.log("Admin ignoré : ADMIN_PASSWORD manquant ou trop court (12 caractères minimum).");
    return;
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { hashedPassword, isAdmin: true, banned: false },
    });
    console.log(`Admin mis à jour : ${email}`);
  } else {
    // Évite un conflit de pseudo si "Admin" existe déjà.
    let finalPseudo = pseudo;
    if (await prisma.user.findFirst({ where: { pseudo: finalPseudo } })) {
      finalPseudo = `${pseudo}_${Math.random().toString(36).slice(2, 6)}`;
    }
    await prisma.user.create({
      data: {
        email,
        hashedPassword,
        pseudo: finalPseudo,
        name: finalPseudo,
        isAdmin: true,
        credits: 1_000_000,
        freeGranted: false,
      },
    });
    console.log(`Admin créé : ${email} (mot de passe défini via ADMIN_PASSWORD)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
