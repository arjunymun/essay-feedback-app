import { APP_NAME } from "@/lib/constants";

const supabaseProjectRef =
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF?.trim() || "";
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  (supabaseProjectRef ? `https://${supabaseProjectRef}.supabase.co` : "");
const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "";
const supabaseServiceKey =
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  "";

export const env = {
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_PROJECT_REF: supabaseProjectRef,
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: supabasePublicKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublicKey,
  SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
  SUPABASE_SECRET_KEY: supabaseServiceKey,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY?.trim() || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET?.trim() || "",
  OPENAI_USER_AGENT: `${APP_NAME}/0.1`,
};

export const flags = {
  hasSupabasePublic:
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  hasSupabaseService:
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
  hasOpenAI: Boolean(env.OPENAI_API_KEY),
  hasStripePublishable: Boolean(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
  hasStripeSecret: Boolean(env.STRIPE_SECRET_KEY),
  hasStripeWebhookSecret: Boolean(env.STRIPE_WEBHOOK_SECRET),
  hasStripe: Boolean(env.STRIPE_SECRET_KEY),
  isDemoMode:
    !(
      Boolean(env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ),
};
