import { describe, expect, it } from "vitest";

import { buildFallbackEssayReport } from "@/lib/analysis/fallback";
import { validateUploadMeta } from "@/lib/analysis/parsing";
import { SUPPORTED_DOCX_MIME } from "@/lib/constants";
import type { EssayExtraction } from "@/lib/types";

describe("upload validation", () => {
  it("accepts a supported DOCX file", () => {
    expect(() =>
      validateUploadMeta({
        name: "essay.docx",
        size: 1024,
        type: SUPPORTED_DOCX_MIME,
      }),
    ).not.toThrow();
  });

  it("rejects unsupported file types", () => {
    expect(() =>
      validateUploadMeta({
        name: "essay.txt",
        size: 200,
        type: "text/plain",
      }),
    ).toThrowError(/DOCX and text-based PDF/i);
  });
});

describe("fallback analysis", () => {
  it("returns the full rubric shape for a parsed essay", () => {
    const extraction: EssayExtraction = {
      title: "Climate and Coastal Cities",
      text: `This essay argues that coastal cities need more aggressive climate adaptation.

The paper draws on multiple sources to compare flooding risks and infrastructure responses.

References

Smith, J. (2023). Resilient shorelines. Journal of Climate Policy.`,
      wordCount: 42,
      citationStyle: "apa",
      referenceEntries: [
        {
          raw: "Smith, J. (2023). Resilient shorelines. Journal of Climate Policy.",
          cleaned: "Smith, J. (2023). Resilient shorelines. Journal of Climate Policy.",
          titleHint: "Resilient shorelines",
          yearHint: 2023,
        },
      ],
      inTextCitations: ["(Smith, 2023)"],
      excerpt:
        "This essay argues that coastal cities need more aggressive climate adaptation.",
    };

    const report = buildFallbackEssayReport(extraction);

    expect(report.rubric).toHaveLength(5);
    expect(report.highestPriorityFixes.length).toBeGreaterThanOrEqual(3);
    expect(report.citationStyle).toBe("apa");
  });
});
