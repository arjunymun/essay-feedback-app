# DraftLens Portfolio Assets

Use these generated assets for the portfolio site, GitHub README, release page, or a short project walkthrough.

## Captured Assets

All assets live in `docs/demo-assets`.

- `homepage-desktop.png` - full landing page screenshot.
- `homepage-3d.png` - focused provenance-map screenshot.
- `homepage-mobile.png` - mobile landing page screenshot.
- `homepage-mobile-menu.png` - mobile navigation screenshot.
- `sample-report-desktop.png` - full trust report screenshot.
- `homepage-3d.webm` - short animated clip of the 3D provenance map.
- `sample-report-scroll.webm` - short scroll clip through the sample trust report.
- `homepage-mobile.webm` - short mobile homepage/menu clip.

Regenerate them with:

```powershell
$env:PORTFOLIO_CAPTURE_URL="http://127.0.0.1:3101"
npm.cmd run portfolio:capture
```

For best results, run against a production server:

```powershell
npm.cmd run build
npm.cmd run start -- --hostname 127.0.0.1 --port 3101
```

## 2-Minute Demo Script

Scene 1, 0:00-0:15:
"DraftLens is a trust-first document review platform for academic and evidence-sensitive writing. It does not just summarize a file; it breaks a draft into claims, evidence, citations, confidence, and revision guidance."

Scene 2, 0:15-0:35:
Show the landing page and report preview.
"The product keeps the original MVP spine: accounts, uploads, credits, saved history, citation checks, and a demo-friendly sample report."

Scene 3, 0:35-0:55:
Show `homepage-3d.webm`.
"This provenance map shows the review model: claims, citations, evidence, traces, and critic checks all connect back to the same review core."

Scene 4, 0:55-1:30:
Show `sample-report-scroll.webm`.
"The report is organized around trust. Supported, partial, unsupported, and uncertain findings are visible at the claim level, with evidence links and source confidence separated from writing-quality feedback."

Scene 5, 1:30-1:50:
Show the trace/cost/report sections.
"DraftLens records review stages, model usage, latency, and trace summaries so prompt and model changes can be evaluated instead of guessed."

Scene 6, 1:50-2:05:
Show architecture/docs or README.
"Technically, this combines Next.js, Supabase, FastAPI, OpenAI model routing, Crossref/OpenAlex verification, pgvector-ready schema, E2E tests, and a benchmark eval harness."

Scene 7, 2:05-2:15:
"The result is not a generic AI essay bot. It is a trust-first document intelligence system built around provenance, uncertainty, and reviewer control."

## Portfolio Caption

DraftLens is a trust-first AI document review platform that turns uploaded drafts into claim-level review reports with citation verification, provenance, uncertainty indicators, optional rewrites, trace summaries, and benchmark evals.
