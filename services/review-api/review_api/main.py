from __future__ import annotations

import os

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .agentic import run_agentic_trust_review
from .pipeline import rewrite_excerpt, run_trust_review
from .schemas import ReviewRequest, RewriteRequest, RewriteResponse, TrustReviewReport

app = FastAPI(
    title="DraftLens Review API",
    version="0.1.0",
    description="Trust-first document review pipeline for DraftLens.",
)

_allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["POST"],
    allow_headers=["x-draftlens-review-secret", "content-type"],
)


def _verify_secret(x_draftlens_review_secret: str | None) -> None:
    expected = os.getenv("DRAFTLENS_REVIEW_SECRET", "").strip()
    if not expected:
        raise HTTPException(status_code=500, detail="Review service secret is not configured.")
    if x_draftlens_review_secret != expected:
        raise HTTPException(status_code=401, detail="Invalid review service secret.")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "draftlens-review-api"}


@app.post("/v1/reviews/analyze", response_model=TrustReviewReport, response_model_by_alias=True)
async def analyze(
    request: ReviewRequest,
    x_draftlens_review_secret: str | None = Header(default=None),
) -> TrustReviewReport:
    _verify_secret(x_draftlens_review_secret)
    if os.getenv("DRAFTLENS_USE_AGENTIC_PIPELINE", "true").lower() in {"0", "false", "no"}:
        return run_trust_review(request)
    return await run_agentic_trust_review(request)


@app.post("/v1/rewrite", response_model=RewriteResponse, response_model_by_alias=True)
def rewrite(
    request: RewriteRequest,
    x_draftlens_review_secret: str | None = Header(default=None),
) -> RewriteResponse:
    _verify_secret(x_draftlens_review_secret)
    return rewrite_excerpt(request.excerpt)
