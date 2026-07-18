import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ipOf, rateLimit } from "@/lib/rate-limit";
import { consumeEmailCode } from "@/lib/email-verification";

// Les providers OAuth ne sont activés que si leurs identifiants sont présents,
// pour que l'application démarre même partiellement configurée.
const providers: NextAuthConfig["providers"] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET) {
  providers.push(
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

// Connexion classique email + mot de passe (toujours disponible).
providers.push(
  Credentials({
    name: "Email et mot de passe",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Mot de passe", type: "password" },
      emailCode: { label: "Code email", type: "text" },
    },
    async authorize(credentials, request) {
      const email = String(credentials?.email || "").toLowerCase().trim();
      const password = String(credentials?.password || "");
      const emailCode = String(credentials?.emailCode || "");
      if (!email || !password) return null;
      if (!rateLimit(`login:${ipOf(request)}:${email}`, 10, 15 * 60_000)) return null;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.hashedPassword) return null;

      const ok = await bcrypt.compare(password, user.hashedPassword);
      if (!ok) return null;

      const codeOk =
        (await consumeEmailCode(email, "login", emailCode)) ||
        (await consumeEmailCode(email, "register", emailCode));
      if (!codeOk) return null;

      if (!user.emailVerified) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
);

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    // En cas d'erreur (ex. base injoignable), on renvoie vers le portail
    // d'accueil avec un message lisible plutôt que la page d'erreur brute.
    error: "/",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      // À la connexion, ou périodiquement, on recharge les infos de jeu.
      if (user?.id) token.uid = user.id;
      const uid = (token.uid as string) || undefined;
      if (uid) {
        const dbUser = await prisma.user.findUnique({
          where: { id: uid },
          select: { isAdmin: true, pseudo: true, banned: true, email: true },
        });
        if (dbUser) {
          token.isAdmin =
            dbUser.isAdmin ||
            (!!process.env.ADMIN_EMAIL &&
              dbUser.email?.toLowerCase() ===
                process.env.ADMIN_EMAIL.toLowerCase());
          token.pseudo = dbUser.pseudo;
          token.banned = dbUser.banned;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) || "";
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.pseudo = (token.pseudo as string) || "";
        session.user.banned = Boolean(token.banned);
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Donne un pseudo lisible aux nouveaux comptes OAuth.
      if (!user.id) return;
      const base =
        (user.name || user.email?.split("@")[0] || "Pixel")
          .replace(/[^a-zA-Z0-9_]/g, "")
          .slice(0, 16) || "Pixel";
      const pseudo = `${base}_${Math.random().toString(36).slice(2, 6)}`;
      const isAdmin =
        !!process.env.ADMIN_EMAIL &&
        user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
      await prisma.user.update({
        where: { id: user.id },
        data: { pseudo, isAdmin: Boolean(isAdmin) },
      });
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
