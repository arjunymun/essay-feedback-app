# DraftLens

DraftLens is a student-facing academic writing feedback app built with `Next.js`, Supabase, and OpenAI. Students can sign in, upload a `.docx` or text-based `.pdf`, receive rubric-based essay feedback, citation verification for `APA` and `MLA`, and generate natural-voice rewrites for selected passages.

## What this MVP includes

- Supabase email and password auth
- Upload flow for `DOCX` and text PDFs
- Essay parsing and validation limits
- OpenAI-powered rubric feedback with a heuristic fallback
- Citation verification through Crossref and OpenAlex
- Saved submission history and per-user credit ledger
- Automatic source-file deletion after processing
- Rewrite endpoint for paragraph-level revisions

## Tech stack

- `Next.js 16` App Router
- `TypeScript`
- `Supabase` Auth, Postgres, and Storage
- `OpenAI Responses API`
- `Tailwind CSS v4`
- `Vitest`

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add your Supabase and OpenAI credentials.
3. Run the SQL migration in `supabase/migrations/20260331_init.sql`.
4. Start the app:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Demo mode

If you start the app without Supabase keys, DraftLens now boots into a demo-friendly mode instead of feeling broken.

- `/dashboard` loads a seeded sample workspace
- `/dashboard/submissions/demo-report` shows a full example report
- `/api/submissions/demo-report/rewrite` stays usable for local rewrite testing

This makes the product easier to show, iterate on, and design before backend credentials are connected.

## Environment variables

See `.env.example` for the full list. The important ones are:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## Available scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`

## Notes

- The original uploaded file is stored briefly in Supabase Storage and removed after analysis completes.
- The dashboard keeps structured report data and short excerpts, not the full essay body.
- If `OPENAI_API_KEY` is missing, DraftLens falls back to heuristic scoring and rewrite suggestions so the rest of the stack remains testable.
