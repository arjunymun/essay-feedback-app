import { NextResponse } from "next/server";

import { generateEssayReport } from "@/lib/analysis/service";
import { extractEssayFromBuffer } from "@/lib/analysis/parsing";
import { ESSAY_UPLOAD_BUCKET } from "@/lib/constants";
import {
  consumeReservedCredit,
  createReviewJob,
  createSubmissionRecord,
  finalizeSubmission,
  markSubmissionFailed,
  releaseReservedCredit,
  reserveCredit,
  setSubmissionStoragePath,
  updateReviewJobStatus,
} from "@/lib/data";
import { flags } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UploadMetadata } from "@/lib/types";
import { generateTrustReportWithReviewService } from "@/lib/review-service";
import { persistTrustReviewArtifacts } from "@/lib/trust-persistence";
import { AppError, slugify } from "@/lib/utils";

export const runtime = "nodejs";

function isMissingTrustSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("review_jobs") ||
    message.includes("documents") ||
    message.includes("review_reports") ||
    message.includes("relation") ||
    message.includes("could not find the table")
  );
}

export async function POST(request: Request) {
  if (!flags.hasSupabasePublic || !flags.hasSupabaseService) {
    return NextResponse.json(
      {
        error:
          "Supabase is not fully configured yet. Add the public and service-role environment variables first.",
      },
      { status: 503 },
    );
  }

  const serverClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before uploading an essay." }, { status: 401 });
  }

  const formData = await request.formData();
  const maybeFile = formData.get("file");
  if (!(maybeFile instanceof File)) {
    return NextResponse.json({ error: "Please attach a DOCX or PDF file." }, { status: 400 });
  }

  const metadata: UploadMetadata = {
    name: maybeFile.name,
    size: maybeFile.size,
    type: maybeFile.type,
  };
  const titleOverride = String(formData.get("title") ?? "").trim();
  const buffer = Buffer.from(await maybeFile.arrayBuffer());
  const admin = createSupabaseAdminClient();

  let reservationId: string | null = null;
  let submissionId: string | null = null;
  let reviewJobId: string | null = null;
  let storagePath: string | null = null;

  try {
    const reservation = await reserveCredit(admin, user.id);
    reservationId = reservation.id;

    const submission = await createSubmissionRecord(admin, {
      user_id: user.id,
      title: titleOverride || maybeFile.name.replace(/\.[^.]+$/, ""),
      file_name: metadata.name,
      mime_type: metadata.type,
      reserved_credit_entry_id: reservation.id,
    });

    submissionId = submission.id;

    if (flags.hasReviewService) {
      try {
        const reviewJob = await createReviewJob(admin, {
          userId: user.id,
          submissionId: submission.id,
          status: "queued",
        });
        reviewJobId = reviewJob.id;
      } catch (error) {
        if (!isMissingTrustSchemaError(error)) {
          throw error;
        }
      }
    }

    storagePath = `${user.id}/${submission.id}/${Date.now()}-${slugify(metadata.name)}`;

    const { error: uploadError } = await admin.storage
      .from(ESSAY_UPLOAD_BUCKET)
      .upload(storagePath, buffer, {
        contentType: metadata.type,
        upsert: false,
      });

    if (uploadError) {
      throw new AppError(uploadError.message, 500);
    }

    await setSubmissionStoragePath(admin, submission.id, storagePath);

    if (reviewJobId) {
      await updateReviewJobStatus(admin, reviewJobId, {
        status: "ingesting",
        startedAt: new Date().toISOString(),
      });
    }

    const extraction = await extractEssayFromBuffer(buffer, metadata);

    if (reviewJobId) {
      await updateReviewJobStatus(admin, reviewJobId, { status: "planning" });
    }

    if (reviewJobId) {
      await updateReviewJobStatus(admin, reviewJobId, { status: "retrieving" });
    }

    const trustReport = await generateTrustReportWithReviewService(
      submission.id,
      user.id,
      extraction,
    ).catch(async (error) => {
        if (reviewJobId) {
          await updateReviewJobStatus(admin, reviewJobId, {
            status: "failed",
            errorMessage:
              error instanceof Error
                ? error.message
                : "The trust review service failed.",
            completedAt: new Date().toISOString(),
          }).catch(() => undefined);
        }
        return null;
      });
    const report = trustReport ?? (await generateEssayReport(extraction));

    if (reviewJobId && report.trustSummary) {
      await updateReviewJobStatus(admin, reviewJobId, { status: "synthesizing" });
      await updateReviewJobStatus(admin, reviewJobId, { status: "criticizing" });
      await persistTrustReviewArtifacts(admin, {
        userId: user.id,
        submissionId: submission.id,
        reviewJobId,
        extraction,
        report,
      }).catch((error) => {
        if (!isMissingTrustSchemaError(error)) {
          throw error;
        }
      });
    }

    if (storagePath) {
      await admin.storage.from(ESSAY_UPLOAD_BUCKET).remove([storagePath]);
    }

    await finalizeSubmission(admin, submission.id, report, {
      title: titleOverride || extraction.title,
      wordCount: extraction.wordCount,
      citationStyle: extraction.citationStyle,
      reportExcerpt: extraction.excerpt,
    });

    if (reviewJobId) {
      await updateReviewJobStatus(admin, reviewJobId, {
        status: "completed",
        traceId: report.reviewTrace?.traceId ?? null,
        completedAt: new Date().toISOString(),
      });
    }

    await consumeReservedCredit(admin, reservation.id, submission.id);

    return NextResponse.json({
      submission: {
        id: submission.id,
        status: "completed",
      },
    });
  } catch (unknownError) {
    const message =
      unknownError instanceof Error
        ? unknownError.message
        : "The essay could not be analyzed.";
    const status = unknownError instanceof AppError ? unknownError.status : 500;

    if (storagePath) {
      await admin.storage.from(ESSAY_UPLOAD_BUCKET).remove([storagePath]).catch(() => undefined);
    }

    if (submissionId) {
      await markSubmissionFailed(admin, submissionId, message).catch(() => undefined);
    }

    if (reviewJobId) {
      await updateReviewJobStatus(admin, reviewJobId, {
        status: "failed",
        errorMessage: message,
        completedAt: new Date().toISOString(),
      }).catch(() => undefined);
    }

    if (reservationId) {
      await releaseReservedCredit(admin, user.id, reservationId, submissionId ?? undefined).catch(
        () => undefined,
      );
    }

    return NextResponse.json(
      {
        error: message,
        code: status === 402 ? "NO_CREDITS" : undefined,
      },
      { status },
    );
  }
}
