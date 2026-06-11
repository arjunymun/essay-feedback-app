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
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_PROJECT_REF: supabaseProjectRef,
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: supabasePublicKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublicKey,
  SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
  SUPABASE_SECRET_KEY: supabaseServiceKey,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
  OPENAI_FAST_MODEL: process.env.OPENAI_FAST_MODEL?.trim() || "gpt-5.4-mini",
  OPENAI_REASONING_MODEL: process.env.OPENAI_REASONING_MODEL?.trim() || "gpt-5.5",
  OPENAI_EMBEDDING_MODEL:
    process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small",
  REVIEW_SERVICE_URL: process.env.REVIEW_SERVICE_URL?.trim() || "",
  DRAFTLENS_REVIEW_SECRET: process.env.DRAFTLENS_REVIEW_SECRET?.trim() || "",
  NEXT_PUBLIC_FORCE_DEMO_MODE:
    process.env.NEXT_PUBLIC_FORCE_DEMO_MODE?.trim() || "false",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY?.trim() || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET?.trim() || "",
  OPENAI_USER_AGENT: `${APP_NAME}/0.1`,
};

export const flags = {
  hasSupabasePublic:
    env.NEXT_PUBLIC_FORCE_DEMO_MODE !== "true" &&
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  hasSupabaseService:
    env.NEXT_PUBLIC_FORCE_DEMO_MODE !== "true" &&
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
  hasOpenAI: Boolean(env.OPENAI_API_KEY),
  hasReviewService: Boolean(env.REVIEW_SERVICE_URL),
  hasStripePublishable: Boolean(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
  hasStripeSecret: Boolean(env.STRIPE_SECRET_KEY),
  hasStripeWebhookSecret: Boolean(env.STRIPE_WEBHOOK_SECRET),
  hasStripe: Boolean(env.STRIPE_SECRET_KEY),
  isDemoMode:
    env.NEXT_PUBLIC_FORCE_DEMO_MODE === "true" ||
    !(
      Boolean(env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ),
};
