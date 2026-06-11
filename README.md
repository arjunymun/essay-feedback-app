# DraftLens

DraftLens is a trust-first AI review platform for evidence-sensitive documents. The current MVP starts with academic and admissions-style writing: students can sign in, upload a `.docx` or text-based `.pdf`, receive rubric-based feedback, citation verification, claim-level evidence findings, visible uncertainty, trace summaries, and optional rewrites that preserve authorship.

## What this MVP includes

- Supabase email and password auth
- Upload flow for `DOCX` and text PDFs
- Essay parsing and validation limits
- OpenAI-powered rubric feedback with a heuristic fallback
- Citation verification through Crossref and OpenAlex
- Saved submission history and per-user credit ledger
- Stripe test-mode checkout for paid credit packs
- Automatic source-file deletion after processing
- Rewrite endpoint for paragraph-level revisions
- Python FastAPI review service for trust-first review orchestration
- Claim-level findings, evidence links, uncertainty indicators, and review trace summaries
- Supabase pgvector-ready migration for chunks, claims, evidence, evals, and traces
- Service-backed uploads persist documents, chunks, embeddings, claims, evidence, review reports, traces, and usage events when the migration is applied
- Crossref/OpenAlex lookup clients with retry/backoff hooks for citation metadata checks
- 20-case benchmark suite for fake DOI, wrong year, quote drift, entity confusion, unsupported claims, partial evidence, and rewrite-policy regressions

## Tech stack

- `Next.js 16` App Router
- `TypeScript`
- `Supabase` Auth, Postgres, and Storage
- `OpenAI Responses API`
- `FastAPI` review service
- `pgvector`-ready Supabase schema
- `Stripe Checkout`
- `Tailwind CSS v4`
- `Vitest`
- `pytest`

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add your Supabase and OpenAI credentials. The app supports both the newer Supabase `publishable` / `secret` keys and the older `anon` / `service_role` keys.
3. Run the SQL migrations in:
   - `supabase/migrations/20260331_init.sql`
   - `supabase/migrations/20260331_v15_billing.sql`
   - `supabase/migrations/20260523_trust_review_platform.sql`
4. Verify the expected tables are reachable:

```bash
npm run supabase:verify
```

If this fails with `401`, the local Supabase API keys are not valid for the target project or the linked project is not accessible from this environment.
5. Start the app:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Trust-first review service

The legacy in-process analysis path still works. To enable the service-backed trust pipeline locally:

```powershell
python -m venv services/review-api/.venv
services/review-api/.venv/Scripts/python.exe -m pip install -r services/review-api/requirements.txt
cd services/review-api
.venv/Scripts/python.exe -m uvicorn review_api.main:app --reload --port 8000
```

In another terminal:

```powershell
$env:NEXT_PUBLIC_FORCE_DEMO_MODE='true'
$env:REVIEW_SERVICE_URL='http://localhost:8000'
npm.cmd run dev
```

Open `http://localhost:3000/dashboard/submissions/demo-report`.

Useful review-service flags:

- `DRAFTLENS_USE_AGENTIC_PIPELINE=true` enables the composable review wrapper.
- `DRAFTLENS_ENABLE_LIVE_LOOKUPS=false` keeps Crossref/OpenAlex calls off for deterministic local demos.
- `DRAFTLENS_ENABLE_LIVE_LOOKUPS=true` enables live scholarly metadata lookup.
- `CROSSREF_MAILTO` / `OPENALEX_MAILTO` add polite contact metadata for external APIs.

## Demo mode

If you start the app without Supabase keys, DraftLens now boots into a demo-friendly mode instead of feeling broken.

- `/dashboard` loads a seeded sample workspace
- `/dashboard/submissions/demo-report` shows a full example report
- `/api/submissions/demo-report/rewrite` stays usable for local rewrite testing
- Set `NEXT_PUBLIC_FORCE_DEMO_MODE=true` to force the seeded demo even when `.env.local` contains live Supabase credentials.

This makes the product easier to show, iterate on, and design before backend credentials are connected.

## Environment variables

See `.env.example` for the full list. The important ones are:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PROJECT_REF`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_FAST_MODEL`
- `OPENAI_REASONING_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `REVIEW_SERVICE_URL`
- `DRAFTLENS_REVIEW_SECRET`
- `NEXT_PUBLIC_FORCE_DEMO_MODE`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Available scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run build`
- `npm run supabase:verify`

Python service checks:

- `npm run review:test`
- `npm run review:eval`

## What makes this different from generic AI essay tools

- DraftLens separates source existence from claim support.
- Reports include unsupported and uncertain claims instead of hiding weak evidence behind polished prose.
- Rewrites are explicitly optional and non-authoritative.
- The architecture records review steps, latency, and cost so prompt/model changes can be evaluated instead of guessed.
- The Supabase schema models documents, chunks, claims, evidence, traces, and evals as first-class product data.

## Notes

- The original uploaded file is stored briefly in Supabase Storage and removed after analysis completes.
- The dashboard keeps structured report data and short excerpts, not the full essay body.
- If `OPENAI_API_KEY` is missing, DraftLens falls back to heuristic scoring and rewrite suggestions so the rest of the stack remains testable.
- Billing is implemented in Stripe test mode first; switch to live keys only when you are ready for real payments.
- DraftLens is a privacy-aware educational prototype. Do not claim FERPA, GDPR, HIPAA, legal, or institutional compliance unless those controls are separately implemented and validated.
