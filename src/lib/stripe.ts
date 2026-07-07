import Stripe from "stripe";

let cached: Stripe | null = null;

// Instancié paresseusement pour ne pas planter le build si la clé
// n'est pas encore configurée.
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY manquant");
  }
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return cached;
}

export const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY || "eur").toLowerCase();
