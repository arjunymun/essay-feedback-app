import { describe, expect, it } from "vitest";

import {
  buildCitationSummary,
  calculateCitationQualityScore,
  detectCitationStyle,
  extractReferenceEntries,
  extractInTextCitations,
} from "@/lib/analysis/citations";

describe("citation utilities", () => {
  it("detects APA documents from a References heading", () => {
    const style = detectCitationStyle(`Essay body

References

Smith, J. (2023). Example title. Journal of Writing.`);

    expect(style).toBe("apa");
  });

  it("detects MLA documents from a Works Cited heading", () => {
    const style = detectCitationStyle(`Essay body

Works Cited

Smith, Jane. Example Title. Journal of Writing, 2023.`);

    expect(style).toBe("mla");
  });

  it("extracts reference entries from the bibliography section", () => {
    const entries = extractReferenceEntries(`Body paragraph

References

Smith, J. (2023). Example title. Journal of Writing.

Jones, A. (2021). Another source. College Review.`);

    expect(entries).toHaveLength(2);
    expect(entries[0]?.titleHint).toContain("Example title");
  });

  it("finds in-text citations with APA patterns", () => {
    const citations = extractInTextCitations(
      "This claim is supported by recent work (Smith, 2023).",
      "apa",
    );

    expect(citations).toEqual(["(Smith, 2023)"]);
  });

  it("builds a readable citation summary", () => {
    const summary = buildCitationSummary(
      [
        {
          entry: "A",
          status: "matched",
          confidence: 92,
          source: "crossref",
          notes: "ok",
        },
        {
          entry: "B",
          status: "possible_match",
          confidence: 63,
          source: "openalex",
          notes: "check",
        },
      ],
      "apa",
    );

    expect(summary).toContain("1 reference matched strongly");
  });

  it("scores citation quality higher when strong matches exist", () => {
    const high = calculateCitationQualityScore(
      [
        {
          entry: "A",
          status: "matched",
          confidence: 90,
          source: "crossref",
          notes: "ok",
        },
      ],
      1,
    );

    const low = calculateCitationQualityScore([], 0);

    expect(high).toBeGreaterThan(low);
  });
});
