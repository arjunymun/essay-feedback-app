import { describe, expect, it } from "vitest";

import { buildReviewServicePayload } from "@/lib/review-service";
import type { EssayExtraction } from "@/lib/types";

describe("review service payload", () => {
  it("preserves raw citation entries and in-text citation signals", () => {
    const extraction: EssayExtraction = {
      title: "Evidence Draft",
      text: "This essay argues for better evidence.\n\nReferences\n\nSmith, J. (2023). Study.",
      wordCount: 12,
      citationStyle: "apa",
      referenceEntries: [
        {
          raw: "Smith, J. (2023). Study.",
          cleaned: "Smith, J. (2023). Study.",
          titleHint: "Study",
          yearHint: 2023,
        },
      ],
      inTextCitations: ["(Smith, 2023)"],
      excerpt: "This essay argues for better evidence.",
    };

    expect(buildReviewServicePayload("sub_1", "user_1", extraction)).toMatchObject({
      submissionId: "sub_1",
      userId: "user_1",
      citationStyle: "apa",
      referenceEntries: ["Smith, J. (2023). Study."],
      inTextCitations: ["(Smith, 2023)"],
    });
  });
});
