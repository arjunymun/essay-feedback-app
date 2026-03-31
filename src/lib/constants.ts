export const APP_NAME = "DraftLens";
export const APP_TAGLINE = "Academic feedback, citation checks, and clearer revisions.";
export const ESSAY_UPLOAD_BUCKET = "essay-uploads";
export const FREE_ANALYSIS_CREDITS = 3;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_WORDS = 8_000;
export const MAX_REWRITE_CHARS = 1_600;
export const SUPPORTED_DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const SUPPORTED_PDF_MIME = "application/pdf";

export const SCORE_KEYS = [
  "thesis",
  "organization",
  "evidence",
  "grammar_style",
  "citation_quality",
] as const;

export const SCORE_LABELS: Record<(typeof SCORE_KEYS)[number], string> = {
  thesis: "Thesis",
  organization: "Organization",
  evidence: "Evidence",
  grammar_style: "Grammar & Style",
  citation_quality: "Citation Quality",
};
