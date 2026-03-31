import { SCORE_KEYS } from "@/lib/constants";

export type ScoreKey = (typeof SCORE_KEYS)[number];
export type CitationStyle = "apa" | "mla" | "unknown";
export type CitationVerificationStatus =
  | "matched"
  | "possible_match"
  | "not_found"
  | "malformed";
export type SubmissionStatus = "processing" | "completed" | "failed";
export type CreditLedgerKind =
  | "seed"
  | "reserved"
  | "consumed"
  | "released"
  | "adjustment"
  | "purchase";

export type CreditPurchaseStatus =
  | "pending"
  | "completed"
  | "fulfilled";

export interface RubricScore {
  key: ScoreKey;
  label: string;
  score: number;
  summary: string;
}

export interface CitationEntry {
  raw: string;
  cleaned: string;
  titleHint?: string | null;
  yearHint?: number | null;
}

export interface CitationVerificationResult {
  entry: string;
  status: CitationVerificationStatus;
  confidence: number;
  source: "crossref" | "openalex" | "none";
  title?: string | null;
  authors?: string | null;
  year?: number | null;
  url?: string | null;
  notes: string;
}

export interface RewriteSuggestion {
  originalExcerpt: string;
  improvedVersion: string;
  rationale: string;
}

export interface EssayReport {
  summary: string;
  overallScore: number;
  citationStyle: CitationStyle;
  rubric: RubricScore[];
  strengths: string[];
  highestPriorityFixes: string[];
  rewriteSuggestions: RewriteSuggestion[];
  citationVerification: CitationVerificationResult[];
}

export interface SubmissionRecord {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  mime_type: string;
  status: SubmissionStatus;
  citation_style: CitationStyle;
  word_count: number;
  overall_score: number | null;
  report_json: EssayReport | null;
  report_excerpt: string | null;
  storage_object_path: string | null;
  source_deleted_at: string | null;
  error_message: string | null;
  reserved_credit_entry_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CreditLedgerEntry {
  id: string;
  user_id: string;
  submission_id: string | null;
  kind: CreditLedgerKind;
  delta: number;
  note: string | null;
  created_at: string;
}

export interface CreditSummary {
  remaining: number;
  totalAwarded: number;
  totalConsumed: number;
  totalPurchased: number;
  totalFreeCredits: number;
}

export interface CreditPurchaseRecord {
  id: string;
  user_id: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  pack_key: string;
  credits_awarded: number;
  payment_status: CreditPurchaseStatus;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditPackDefinition {
  key: string;
  name: string;
  description: string;
  credits: number;
  unitAmount: number;
  currency: string;
}

export interface UploadMetadata {
  name: string;
  size: number;
  type: string;
}

export interface EssayExtraction {
  title: string;
  text: string;
  wordCount: number;
  citationStyle: CitationStyle;
  referenceEntries: CitationEntry[];
  inTextCitations: string[];
  excerpt: string;
}
