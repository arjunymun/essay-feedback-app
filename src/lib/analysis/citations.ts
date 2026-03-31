import type {
  CitationEntry,
  CitationStyle,
  CitationVerificationResult,
} from "@/lib/types";
import { average, clamp, compactText } from "@/lib/utils";

const REFERENCES_HEADING = /^\s*(references|works cited|bibliography)\s*$/im;

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractYear(value: string) {
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function extractTitleHint(entry: string) {
  const segments = entry
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const titleSegment = segments.find(
    (segment) =>
      segment.length > 6 &&
      !/^\(?\d{4}\)?$/.test(segment) &&
      !/^[A-Z][a-z]+,\s*[A-Z]/.test(segment),
  );

  if (titleSegment) {
    return titleSegment;
  }

  return segments[0] ?? entry;
}

function titleTokenScore(left: string, right: string) {
  const leftTokens = new Set(normalizeTitle(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeTitle(right).split(" ").filter(Boolean));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;

  return shared / Math.max(leftTokens.size, rightTokens.size);
}

function buildCandidateScore(
  entry: CitationEntry,
  candidate: { title?: string | null; year?: number | null; author?: string | null },
) {
  const titleScore = titleTokenScore(entry.titleHint ?? entry.cleaned, candidate.title ?? "");
  const yearScore =
    entry.yearHint && candidate.year
      ? entry.yearHint === candidate.year
        ? 1
        : Math.abs(entry.yearHint - candidate.year) <= 1
          ? 0.6
          : 0
      : 0.3;
  const authorScore =
    candidate.author && entry.cleaned.toLowerCase().includes(candidate.author.toLowerCase())
      ? 1
      : 0.25;

  return average([titleScore, yearScore, authorScore]);
}

export function detectCitationStyle(text: string): CitationStyle {
  if (/works cited/i.test(text)) {
    return "mla";
  }

  if (/^\s*references\s*$/im.test(text)) {
    return "apa";
  }

  if (/\([A-Z][A-Za-z-]+,\s*(19|20)\d{2}\)/.test(text)) {
    return "apa";
  }

  if (/\([A-Z][A-Za-z-]+\s+\d+(?:-\d+)?\)/.test(text)) {
    return "mla";
  }

  return "unknown";
}

export function extractReferenceEntries(text: string): CitationEntry[] {
  const normalized = compactText(text);
  const match = REFERENCES_HEADING.exec(normalized);

  if (!match) {
    return [];
  }

  const referenceSection = normalized.slice(match.index + match[0].length).trim();
  if (!referenceSection) {
    return [];
  }

  const paragraphs = referenceSection
    .split(/\n{2,}/)
    .map((entry) => entry.replace(/\n/g, " ").trim())
    .filter(Boolean);

  const entries =
    paragraphs.length > 1
      ? paragraphs
      : referenceSection
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

  return entries.map((entry) => ({
    raw: entry,
    cleaned: entry,
    titleHint: extractTitleHint(entry),
    yearHint: extractYear(entry),
  }));
}

export function extractInTextCitations(text: string, style: CitationStyle) {
  if (style === "apa") {
    return text.match(/\([A-Z][A-Za-z' -]+,\s*(19|20)\d{2}(?:,\s*p+\.?\s*\d+)?\)/g) ?? [];
  }

  if (style === "mla") {
    return text.match(/\([A-Z][A-Za-z' -]+\s+\d+(?:-\d+)?\)/g) ?? [];
  }

  return text.match(/\([^)]{4,80}\)/g) ?? [];
}

async function searchCrossref(entry: CitationEntry) {
  const response = await fetch(
    `https://api.crossref.org/works?rows=3&query.bibliographic=${encodeURIComponent(entry.cleaned)}`,
    {
      headers: {
        "User-Agent": "DraftLens/0.1 (essay feedback project)",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    message?: {
      items?: Array<{
        title?: string[];
        DOI?: string;
        URL?: string;
        author?: Array<{ family?: string; given?: string }>;
        published?: { "date-parts"?: number[][] };
      }>;
    };
  };

  const candidates =
    payload.message?.items?.map((item) => {
      const year = item.published?.["date-parts"]?.[0]?.[0] ?? null;
      const author = item.author?.[0]?.family ?? null;
      const title = item.title?.[0] ?? null;

      return {
        author,
        title,
        year,
        url: item.URL ?? (item.DOI ? `https://doi.org/${item.DOI}` : null),
      };
    }) ?? [];

  if (!candidates.length) {
    return null;
  }

  const best = candidates
    .map((candidate) => ({
      candidate,
      score: buildCandidateScore(entry, candidate),
    }))
    .sort((left, right) => right.score - left.score)[0];

  return best;
}

async function searchOpenAlex(entry: CitationEntry) {
  const response = await fetch(
    `https://api.openalex.org/works?per-page=3&search=${encodeURIComponent(entry.cleaned)}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    results?: Array<{
      display_name?: string;
      publication_year?: number;
      primary_location?: { landing_page_url?: string | null };
      authorships?: Array<{ author?: { display_name?: string } }>;
    }>;
  };

  const candidates =
    payload.results?.map((item) => ({
      title: item.display_name ?? null,
      year: item.publication_year ?? null,
      author: item.authorships?.[0]?.author?.display_name ?? null,
      url: item.primary_location?.landing_page_url ?? null,
    })) ?? [];

  if (!candidates.length) {
    return null;
  }

  const best = candidates
    .map((candidate) => ({
      candidate,
      score: buildCandidateScore(entry, candidate),
    }))
    .sort((left, right) => right.score - left.score)[0];

  return best;
}

export async function verifyCitationEntry(
  entry: CitationEntry,
): Promise<CitationVerificationResult> {
  if (entry.cleaned.length < 18) {
    return {
      entry: entry.raw,
      status: "malformed",
      confidence: 0,
      source: "none",
      notes: "The reference is too short to validate reliably.",
    };
  }

  try {
    const crossref = await searchCrossref(entry);
    if (crossref && crossref.score >= 0.72) {
      return {
        entry: entry.raw,
        status: "matched",
        confidence: clamp(Math.round(crossref.score * 100), 0, 100),
        source: "crossref",
        title: crossref.candidate.title,
        authors: crossref.candidate.author,
        year: crossref.candidate.year,
        url: crossref.candidate.url,
        notes: "Matched against Crossref metadata.",
      };
    }

    const openAlex = await searchOpenAlex(entry);
    if (openAlex && openAlex.score >= 0.64) {
      return {
        entry: entry.raw,
        status: openAlex.score >= 0.78 ? "matched" : "possible_match",
        confidence: clamp(Math.round(openAlex.score * 100), 0, 100),
        source: "openalex",
        title: openAlex.candidate.title,
        authors: openAlex.candidate.author,
        year: openAlex.candidate.year,
        url: openAlex.candidate.url,
        notes:
          openAlex.score >= 0.78
            ? "Matched against OpenAlex metadata."
            : "Found a plausible OpenAlex match, but the metadata overlap is limited.",
      };
    }
  } catch {
    return {
      entry: entry.raw,
      status: "possible_match",
      confidence: 35,
      source: "none",
      notes: "Citation lookup failed, so this reference needs a manual check.",
    };
  }

  return {
    entry: entry.raw,
    status: "not_found",
    confidence: 18,
    source: "none",
    notes: "No strong metadata match was found in Crossref or OpenAlex.",
  };
}

export async function verifyCitationEntries(entries: CitationEntry[]) {
  const results: CitationVerificationResult[] = [];

  for (const entry of entries) {
    results.push(await verifyCitationEntry(entry));
  }

  return results;
}

export function calculateCitationQualityScore(
  results: CitationVerificationResult[],
  inTextCitationCount: number,
) {
  if (!results.length) {
    return inTextCitationCount > 0 ? 58 : 35;
  }

  const matchedCount = results.filter((result) => result.status === "matched").length;
  const possibleCount = results.filter(
    (result) => result.status === "possible_match",
  ).length;
  const malformedCount = results.filter(
    (result) => result.status === "malformed",
  ).length;

  const ratio =
    (matchedCount +
      possibleCount * 0.6 +
      Math.max(inTextCitationCount - results.length, 0) * 0.1) /
    results.length;

  return clamp(Math.round(40 + ratio * 55 - malformedCount * 6), 20, 96);
}

export function buildCitationSummary(
  results: CitationVerificationResult[],
  style: CitationStyle,
) {
  if (!results.length) {
    return `No ${style === "mla" ? "Works Cited" : "References"} entries were found, so the app could not validate source metadata.`;
  }

  const matchedCount = results.filter((result) => result.status === "matched").length;
  const possibleCount = results.filter(
    (result) => result.status === "possible_match",
  ).length;
  const malformedCount = results.filter(
    (result) => result.status === "malformed",
  ).length;

  return `${matchedCount} reference${matchedCount === 1 ? "" : "s"} matched strongly, ${possibleCount} need a manual spot-check, and ${malformedCount} look malformed.`;
}
