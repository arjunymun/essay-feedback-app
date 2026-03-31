import Stripe from "stripe";

import { env, flags } from "@/lib/env";

let stripeClient: Stripe | null = null;

export function createStripeClient() {
  if (!flags.hasStripeSecret) {
    throw new Error("Stripe secret key is missing.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}
