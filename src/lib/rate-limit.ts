// Limiteur de débit en mémoire (par instance serverless — suffisant pour
// bloquer le spam/bruteforce basique sans dépendance externe).

type Bucket = { n: number; reset: number };
const buckets = new Map<string, Bucket>();

function sweep() {
  if (buckets.size < 5000) return;
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (now > b.reset) buckets.delete(k);
  }
}

/** true = autorisé, false = trop de requêtes */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  sweep();
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  if (b.n >= max) return false;
  b.n++;
  return true;
}

/** IP approximative du client (derrière le proxy Vercel). */
export function ipOf(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : "unknown").trim().slice(0, 45);
}

/** Réponse 429 standard. */
export function tooMany() {
  return Response.json(
    { error: "Trop de requêtes, réessaie dans un instant." },
    { status: 429 },
  );
}
