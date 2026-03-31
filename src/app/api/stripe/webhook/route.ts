import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getCreditPack } from "@/lib/billing";
import { fulfillCreditPurchase } from "@/lib/data";
import { env, flags } from "@/lib/env";
import { createStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!flags.hasStripeSecret || !flags.hasStripeWebhookSecret || !flags.hasSupabaseService) {
    return NextResponse.json(
      { error: "Stripe webhook handling is not fully configured yet." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const stripe = createStripeClient();
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid Stripe signature.",
      },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const packKey = session.metadata?.pack_key;
    const creditsAwarded = Number(session.metadata?.credits_awarded ?? 0);
    const configuredPack = packKey ? getCreditPack(packKey) : null;

    if (!userId || !packKey || !configuredPack || configuredPack.credits !== creditsAwarded) {
      return NextResponse.json(
        { error: "Stripe session metadata is incomplete." },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();
    await fulfillCreditPurchase(admin, {
      userId,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      packKey,
      creditsAwarded,
      paymentStatus: "completed",
    });
  }

  return NextResponse.json({ received: true });
}
