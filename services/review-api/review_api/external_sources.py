from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import quote_plus

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from .schemas import CitationVerification


DOI_RE = re.compile(r"\b10\.\d{4,9}/[-._;()/:A-Z0-9]+\b", re.I)
YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")


@dataclass(frozen=True)
class SourceLookupConfig:
    user_agent: str = "DraftLens/0.1"
    mailto: str | None = None
    timeout_seconds: float = 8.0

    @property
    def headers(self) -> dict[str, str]:
        value = self.user_agent
        if self.mailto:
            value = f"{value} (mailto:{self.mailto})"
        return {"User-Agent": value, "Accept": "application/json"}


def extract_doi(entry: str) -> str | None:
    match = DOI_RE.search(entry)
    return match.group(0).rstrip(".") if match else None


def extract_year(entry: str) -> int | None:
    match = YEAR_RE.search(entry)
    return int(match.group(0)) if match else None


def extract_title_hint(entry: str) -> str | None:
    segments = [segment.strip() for segment in entry.split(".") if segment.strip()]
    for segment in segments:
        if len(segment) > 8 and not re.fullmatch(r"\(?\d{4}\)?", segment):
            if not re.match(r"^[A-Z][a-z]+,\s*[A-Z]", segment):
                return segment[:220]
    return segments[0][:220] if segments else None


def _year_from_crossref(message: dict) -> int | None:
    for key in ("published-print", "published-online", "published", "created"):
        parts = message.get(key, {}).get("date-parts")
        if parts and parts[0]:
            try:
                return int(parts[0][0])
            except (TypeError, ValueError):
                return None
    return None


def _title_from_crossref(message: dict) -> str | None:
    titles = message.get("title")
    if isinstance(titles, list) and titles:
        return str(titles[0])[:220]
    return None


@retry(
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.TransportError)),
    wait=wait_exponential(multiplier=0.4, min=0.4, max=2),
    stop=stop_after_attempt(3),
    reraise=True,
)
async def _get_json(client: httpx.AsyncClient, url: str) -> dict | None:
    response = await client.get(url)
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.json()


async def lookup_crossref_by_doi(
    client: httpx.AsyncClient,
    doi: str,
) -> CitationVerification | None:
    payload = await _get_json(
        client,
        f"https://api.crossref.org/works/{quote_plus(doi)}",
    )
    if not payload:
        return None
    message = payload.get("message", {})
    title = _title_from_crossref(message)
    year = _year_from_crossref(message)
    return CitationVerification(
        entry=doi,
        status="matched",
        confidence=92,
        source="crossref",
        title=title,
        year=year,
        url=f"https://doi.org/{doi}",
        notes="Crossref returned DOI metadata. This verifies source existence, not claim support.",
    )


async def lookup_openalex_by_title(
    client: httpx.AsyncClient,
    title_hint: str,
    expected_year: int | None,
) -> CitationVerification | None:
    payload = await _get_json(
        client,
        "https://api.openalex.org/works"
        f"?search={quote_plus(title_hint)}&per-page=1",
    )
    if not payload:
        return None
    results = payload.get("results") or []
    if not results:
        return None

    work = results[0]
    year = work.get("publication_year")
    title = str(work.get("title") or title_hint)[:220]
    confidence = 78
    status = "matched"
    notes = "OpenAlex returned a likely work match. This verifies source metadata, not claim support."

    if expected_year and year and int(year) != expected_year:
        confidence = 48
        status = "possible_match"
        notes = (
            f"OpenAlex found a title-like match, but the year differs "
            f"({expected_year} cited vs. {year} found)."
        )

    return CitationVerification(
        entry=title_hint,
        status=status,
        confidence=confidence,
        source="openalex",
        title=title,
        year=int(year) if year else expected_year,
        url=work.get("id") or work.get("doi"),
        notes=notes,
    )


async def verify_references_live(
    entries: list[str],
    config: SourceLookupConfig,
) -> list[CitationVerification | None]:
    results: list[CitationVerification | None] = []
    async with httpx.AsyncClient(
        headers=config.headers,
        timeout=config.timeout_seconds,
        follow_redirects=True,
    ) as client:
        for entry in entries:
            doi = extract_doi(entry)
            title_hint = extract_title_hint(entry)
            expected_year = extract_year(entry)

            if doi:
                try:
                    result = await lookup_crossref_by_doi(client, doi)
                    if result:
                        results.append(result.model_copy(update={"entry": entry}))
                        continue
                except (httpx.HTTPError, ValueError):
                    pass

            if title_hint:
                try:
                    result = await lookup_openalex_by_title(
                        client,
                        title_hint,
                        expected_year,
                    )
                    if result:
                        results.append(result.model_copy(update={"entry": entry}))
                        continue
                except (httpx.HTTPError, ValueError):
                    pass

            results.append(None)
    return results
