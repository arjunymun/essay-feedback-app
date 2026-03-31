import type {
  CreditSummary,
  EssayReport,
  SubmissionRecord,
} from "@/lib/types";

export const DEMO_USER = {
  id: "demo-user",
  email: "demo@draftlens.local",
};

export const DEMO_CREDIT_SUMMARY: CreditSummary = {
  remaining: 3,
  totalAwarded: 3,
  totalConsumed: 0,
};

export const DEMO_REPORT: EssayReport = {
  summary:
    "This draft has a clear policy direction and some usable evidence, but it becomes most persuasive when the thesis is stated earlier and each source is tied back to the claim more directly.",
  overallScore: 84,
  citationStyle: "apa",
  rubric: [
    {
      key: "thesis",
      label: "Thesis",
      score: 82,
      summary:
        "The core argument is visible, but it lands more cleanly once the opening paragraph states the central claim in a single sentence.",
    },
    {
      key: "organization",
      label: "Organization",
      score: 86,
      summary:
        "The sections follow a logical progression from problem to evidence to recommendation.",
    },
    {
      key: "evidence",
      label: "Evidence",
      score: 81,
      summary:
        "The paper uses relevant support, though a few claims still need a sentence explaining why the evidence matters.",
    },
    {
      key: "grammar_style",
      label: "Grammar & Style",
      score: 88,
      summary:
        "The tone is mostly polished and readable, with a handful of sentences that can be made more direct.",
    },
    {
      key: "citation_quality",
      label: "Citation Quality",
      score: 83,
      summary:
        "The reference list is mostly consistent, and the metadata lookup found credible matches for the strongest sources.",
    },
  ],
  strengths: [
    "The draft already sounds like a real academic argument instead of a loose collection of notes.",
    "Evidence choices are relevant to the topic and point in the same overall direction.",
    "The conclusion gives the paper a clear sense of purpose and payoff.",
  ],
  highestPriorityFixes: [
    "Move the main claim into the first paragraph so readers know the paper’s position sooner.",
    "After each cited source, add one sentence explaining exactly how that evidence supports the argument.",
    "Trim the longest sentences so the strongest ideas do not get buried in extra phrasing.",
  ],
  rewriteSuggestions: [
    {
      originalExcerpt:
        "Because climate pressure on coastal infrastructure is increasing in a way that many municipal systems are not fully prepared for, cities should begin adaptation planning earlier than they currently do.",
      improvedVersion:
        "Because climate pressure on coastal infrastructure is rising faster than many municipal systems can handle, cities should begin adaptation planning earlier.",
      rationale:
        "The revision keeps the same argument but removes filler phrasing and lands the recommendation faster.",
    },
    {
      originalExcerpt:
        "This evidence is useful in demonstrating that delayed planning creates not only higher long-term costs but also weaker public confidence in government response.",
      improvedVersion:
        "This evidence shows that delayed planning raises long-term costs and weakens public confidence in government response.",
      rationale:
        "The sentence becomes clearer when the verb is more direct and the claim is less padded.",
    },
  ],
  citationVerification: [
    {
      entry:
        "Smith, J. (2023). Resilient shorelines and urban adaptation. Journal of Climate Policy.",
      status: "matched",
      confidence: 92,
      source: "crossref",
      title: "Resilient shorelines and urban adaptation",
      authors: "Smith",
      year: 2023,
      url: "https://doi.org/10.0000/demo-shorelines",
      notes: "Strong Crossref-style metadata match in demo mode.",
    },
    {
      entry:
        "Lee, A. (2022). Public trust after flooding events. Urban Governance Review.",
      status: "possible_match",
      confidence: 67,
      source: "openalex",
      title: "Public trust after flooding events",
      authors: "Lee",
      year: 2022,
      url: "https://openalex.org/W0000000000",
      notes: "Likely match, but the journal metadata needs a manual spot-check.",
    },
  ],
};

export const DEMO_SUBMISSION: SubmissionRecord = {
  id: "demo-report",
  user_id: DEMO_USER.id,
  title: "Climate Adaptation for Coastal Cities",
  file_name: "coastal-cities-demo.docx",
  mime_type:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  status: "completed",
  citation_style: "apa",
  word_count: 1642,
  overall_score: DEMO_REPORT.overallScore,
  report_json: DEMO_REPORT,
  report_excerpt:
    "A sample policy essay showing rubric scoring, citation checks, and rewrite suggestions in demo mode.",
  storage_object_path: null,
  source_deleted_at: new Date().toISOString(),
  error_message: null,
  reserved_credit_entry_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
};

export function listDemoSubmissions() {
  return [DEMO_SUBMISSION];
}

export function getDemoSubmissionById(id: string) {
  return id === DEMO_SUBMISSION.id ? DEMO_SUBMISSION : null;
}
