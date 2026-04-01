import { NextResponse } from "next/server";

import { generateEssayReport } from "@/lib/analysis/service";
import { extractEssayFromBuffer } from "@/lib/analysis/parsing";
import { ESSAY_UPLOAD_BUCKET } from "@/lib/constants";
import {
  consumeReservedCredit,
  createSubmissionRecord,
  finalizeSubmission,
  markSubmissionFailed,
  releaseReservedCredit,
  reserveCredit,
  setSubmissionStoragePath,
} from "@/lib/data";
import { flags } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UploadMetadata } from "@/lib/types";
import { AppError, slugify } from "@/lib/utils";

export const runtime = "nodejs";

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

    const extraction = await extractEssayFromBuffer(buffer, metadata);
    const report = await generateEssayReport(extraction);

    if (storagePath) {
      await admin.storage.from(ESSAY_UPLOAD_BUCKET).remove([storagePath]);
    }

    await finalizeSubmission(admin, submission.id, report, {
      title: titleOverride || extraction.title,
      wordCount: extraction.wordCount,
      citationStyle: extraction.citationStyle,
      reportExcerpt: extraction.excerpt,
    });
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
