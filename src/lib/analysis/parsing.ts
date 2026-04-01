import mammoth from "mammoth";
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

import {
  MAX_FILE_SIZE_BYTES,
  MAX_WORDS,
  SUPPORTED_DOCX_MIME,
  SUPPORTED_PDF_MIME,
} from "@/lib/constants";
import {
  detectCitationStyle,
  extractInTextCitations,
  extractReferenceEntries,
} from "@/lib/analysis/citations";
import type { EssayExtraction, UploadMetadata } from "@/lib/types";
import { AppError, buildExcerpt, compactText, countWords } from "@/lib/utils";

function inferTitle(text: string, fallback: string) {
  const line = text
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.length >= 12 && entry.length <= 90);

  if (!line) {
    return fallback.replace(/\.[^.]+$/, "");
  }

  return line;
}

export function validateUploadMeta(metadata: UploadMetadata) {
  if (!metadata.name) {
    throw new AppError("Please choose a document to analyze.");
  }

  if (metadata.size > MAX_FILE_SIZE_BYTES) {
    throw new AppError("Files must be 10 MB or smaller.");
  }

  if (![SUPPORTED_DOCX_MIME, SUPPORTED_PDF_MIME].includes(metadata.type)) {
    throw new AppError("Only DOCX and text-based PDF files are supported in v1.");
  }
}

async function extractDocxText(buffer: Buffer) {
  const { value } = await mammoth.extractRawText({ buffer });
  return compactText(value);
}

async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();
  const text = compactText(parsed.text ?? "");

  if (text.replace(/\s+/g, "").length < 40) {
    throw new AppError(
      "This PDF appears to be image-only or scanned. Please upload a text-based PDF or DOCX file.",
    );
  }

  return text;
}

export async function extractEssayFromBuffer(
  buffer: Buffer,
  metadata: UploadMetadata,
): Promise<EssayExtraction> {
  validateUploadMeta(metadata);

  const text =
    metadata.type === SUPPORTED_DOCX_MIME
      ? await extractDocxText(buffer)
      : await extractPdfText(buffer);

  if (!text || text.length < 120) {
    throw new AppError("The uploaded document did not contain enough readable text.");
  }

  const wordCount = countWords(text);
  if (wordCount > MAX_WORDS) {
    throw new AppError(
      "This document is too long for v1. Please keep essays under about 8,000 words.",
    );
  }

  const citationStyle = detectCitationStyle(text);
  const referenceEntries = extractReferenceEntries(text);
  const inTextCitations = extractInTextCitations(text, citationStyle);

  return {
    title: inferTitle(text, metadata.name),
    text,
    wordCount,
    citationStyle,
    referenceEntries,
    inTextCitations,
    excerpt: buildExcerpt(text, 260),
  };
}
