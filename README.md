# 🟦 PixelDrop

Une place de marché de pixels : **1 000 000 de pixels** à conquérir sur une grille
1000×1000. Chaque nouveau joueur reçoit **10 pixels gratuits**, choisit sa couleur,
peut attacher un **lien** ou un **message** à chaque pixel, et achète des packs et
des items (bombes, boucliers, pixels dorés) via **Stripe**.

Stack : **Next.js 16 · React 19 · Prisma 7 (PostgreSQL) · Auth.js (NextAuth v5) ·
Stripe · Tailwind 4**.

---

## 1. Installation

```bash
npm install
cp .env.example .env      # puis remplis les valeurs (voir §2)
npm run db:push           # crée les tables dans PostgreSQL
npm run db:seed           # crée le compte administrateur
npm run dev               # http://localhost:3000
```

Il te faut une base **PostgreSQL** (gratuit : [Neon](https://neon.tech),
[Supabase](https://supabase.com) ou Vercel Postgres). Mets l'URL dans `DATABASE_URL`.

---

## 2. Variables d'environnement (`.env`)

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `AUTH_SECRET` | Secret Auth.js — `node -e "console.log(crypto.randomBytes(32).toString('base64'))"` |
| `AUTH_URL` / `NEXTAUTH_URL` | URL publique (local : `http://localhost:3000`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Connexion Google (mise en avant) |
| `AUTH_MICROSOFT_ENTRA_ID_ID` / `_SECRET` | Connexion Microsoft |
| `AUTH_APPLE_ID` / `AUTH_APPLE_SECRET` | Connexion Apple |
| `SMTP_USER` / `SMTP_PASS` | Envoi des codes email pour l'inscription et la connexion classique |
| `MAIL_FROM` | Adresse affichée comme expéditeur des emails |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Compte admin (créé par le seed, mot de passe 12 caractères minimum) |
| `SETUP_TOKEN` | Token secret optionnel pour lancer `/api/setup` sans session admin |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clés Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook Stripe |
| `NEXT_PUBLIC_CURRENCY` | Devise (`eur` par défaut) |

Les providers de connexion ne s'affichent que s'ils sont configurés. Le
**compte email + mot de passe** envoie un code à 6 chiffres par email à
l'inscription et à chaque connexion ; configure donc le SMTP avant d'ouvrir la
connexion classique aux joueurs.

### Vérification email avec Gmail
1. Active la validation en 2 étapes sur le compte Gmail utilisé pour l'envoi.
2. Crée un mot de passe d'application Gmail.
3. Dans Vercel et dans `.env`, renseigne `SMTP_USER`, `SMTP_PASS` et `MAIL_FROM`.
4. Pour Gmail, garde `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465` et `SMTP_SECURE=true`.

### Connexion Google (recommandé, le plus simple)
1. [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) → *Create OAuth client ID* → type *Web application*.
2. Redirect URI : `http://localhost:3000/api/auth/callback/google` (et l'équivalent prod).
3. Copie l'ID et le secret dans `.env`.

### Connexion Microsoft
Portail Azure → *App registrations* → Redirect URI
`http://localhost:3000/api/auth/callback/microsoft-entra-id`.

### Connexion Apple ⚠️
Nécessite un **compte Apple Developer payant (99 $/an)** et la génération d'une clé
signée (Sign in with Apple). C'est de loin la plus lourde à configurer — laisse ces
champs vides si tu ne l'utilises pas, le bouton n'apparaîtra pas.

---

## 3. Paiements Stripe

On utilise **Stripe Checkout standard** (un seul compte, *pas* Stripe Connect) — la
configuration est simple.

1. Récupère tes clés **test** sur [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys).
2. Pour tester les webhooks en local :
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copie le `whsec_...` affiché dans `STRIPE_WEBHOOK_SECRET`.
3. En production, crée le webhook dans le dashboard Stripe vers
   `https://TON-DOMAINE/api/stripe/webhook` (événement `checkout.session.completed`).

Les crédits/items sont accordés **par le webhook** après paiement confirmé.

### Grille tarifaire (modifiable dans `src/lib/products.ts`)
- 10 px = 1.00 · 50 px = 4.50 · 100 px = 8.00 · 500 px = 35.00 · 1000 px = 60.00 €
- 💣 Bombe (0.50) · 💣×5 (2.00) · 💥 Méga-bombe (2.00) · 🛡️ Bouclier (1.00) · ⭐ Pixel doré (1.50)

---

## 4. Compte administrateur

Le compte dont l'email vaut `ADMIN_EMAIL` a tous les droits :
- voir tous les comptes et statistiques (revenus, remplissage) ;
- offrir des pixels / items à n'importe qui ;
- **bannir** un compte → supprime automatiquement **tous ses pixels** ;
- poser des pixels à l'infini, en supprimer n'importe lequel, effacer des zones.

Connexion : `/login` avec `ADMIN_EMAIL` + `ADMIN_PASSWORD`, puis va sur `/admin`.

---

## 5. Déploiement (Vercel)
1. Pousse le repo sur GitHub, importe-le dans Vercel.
2. Renseigne toutes les variables d'environnement.
3. Mets `AUTH_URL`/`NEXTAUTH_URL` sur l'URL de prod et ajoute les redirect URIs
   correspondants côté Google/Microsoft/Apple.
4. Build : `npm run build` (lance `prisma generate` puis `next build`).
5. Applique le schéma : `npm run db:push` (ou une migration) contre la base de prod,
   puis `npm run db:seed`.

---

## Comment on joue
- **🖌️ Poser** : choisis une couleur, clique une case libre (coûte 1 pixel).
- **🔍 Infos** : clique un pixel pour voir son propriétaire, son message et son lien.
- **💣 / 💥 Bombe** : détruit les pixels adverses (sauf ceux protégés par 🛡️).
- **⭐ Pixel doré / 🛡️ Bouclier** : items cochables dans les options avant de poser.
- Molette = zoom, glisser = se déplacer sur la carte.
