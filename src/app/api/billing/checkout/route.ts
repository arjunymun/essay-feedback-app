import { NextResponse } from "next/server";

import { getCreditPack } from "@/lib/billing";
import { env, flags } from "@/lib/env";
import { createStripeClient } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!flags.hasStripeSecret) {
    return NextResponse.json(
      { error: "Stripe is not configured for checkout yet." },
      { status: 503 },
    );
  }

  if (!flags.hasSupabasePublic) {
    return NextResponse.json(
      { error: "Supabase is not configured yet." },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before buying credits." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { packKey?: string }
    | null;
  const pack = getCreditPack(payload?.packKey ?? "");

  if (!pack) {
    return NextResponse.json({ error: "Unknown credit pack." }, { status: 400 });
  }

  const stripe = createStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    success_url: `${env.NEXT_PUBLIC_APP_URL}/account?billing=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/pricing?billing=cancelled`,
    metadata: {
      user_id: user.id,
      pack_key: pack.key,
      credits_awarded: String(pack.credits),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: pack.currency,
          unit_amount: pack.unitAmount,
          product_data: {
            name: `${pack.name} (${pack.credits} analyses)`,
            description: pack.description,
          },
        },
      },
    ],
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    checkoutUrl: session.url,
    sessionId: session.id,
  });
}
