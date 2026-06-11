# DraftLens Trust-First Upgrade Plan

DraftLens now has the first implementation slice of the trust-first platform plan:

- The existing Next.js/Supabase/Stripe/auth product spine remains intact.
- A Python FastAPI review service lives in `services/review-api`.
- `REVIEW_SERVICE_URL` enables service-backed review while the current JS analysis remains the fallback.
- Reports can now carry claim-level findings, evidence, uncertainty, trust summaries, and trace steps.
- Demo mode includes a seeded trust-first report so the product can be shown without live credentials.
- Supabase migration `20260523_trust_review_platform.sql` adds review jobs, documents, chunks, claims, evidence, traces, usage events, eval cases, and pgvector-ready retrieval.
- Service-backed uploads now persist documents, chunks, optional OpenAI embeddings, claims, evidence, review reports, trace summaries, and model usage events after that migration is applied.
- The review service now has an agentic wrapper with deterministic fallback, model-routing trace steps, safe-failure policy records, and optional Crossref/OpenAlex live lookup clients.
- The benchmark harness now includes 20 deceptive/easy regression cases and reports pass rate, unsupported-claim flagging, latency, and cost.

## Local Demo

Run the service:

```bash
cd services/review-api
python -m uvicorn review_api.main:app --reload --port 8000
```

Run the web app with demo mode and the review service enabled:

```bash
NEXT_PUBLIC_FORCE_DEMO_MODE=true REVIEW_SERVICE_URL=http://localhost:8000 npm run dev
```

On Windows PowerShell:

```powershell
$env:NEXT_PUBLIC_FORCE_DEMO_MODE='true'
$env:REVIEW_SERVICE_URL='http://localhost:8000'
npm.cmd run dev
```

Open `http://localhost:3000/dashboard/submissions/demo-report`.

## Supabase Gate

Target DraftLens project ref: `qhjsrxmjbbluswomychr`.

Run:

```bash
npm run supabase:verify
```

This must pass before claiming the live Supabase vertical slice is complete. If it returns `401`, rotate/regenerate the project API keys or reconnect Codex/Supabase permissions for that project before applying the trust-platform migration.

## Next Build Steps

- Apply and verify the Supabase migration on the target project before claiming live uploads are production-ready.
- Add a read-side API/UI for stored provenance artifacts beyond the current report JSON.
- Replace deterministic extraction/verifier heuristics with OpenAI Responses structured calls behind the same schema.
- Add authenticated upload E2E coverage once test-user credentials are available.
- Deploy the web app and review service, then smoke-test the deployed service-backed demo path.
