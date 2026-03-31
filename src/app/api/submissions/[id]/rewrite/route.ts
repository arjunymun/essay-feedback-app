import { NextResponse } from "next/server";
import { z } from "zod";

import { buildFallbackRewrite, rewriteExcerptWithOpenAI } from "@/lib/analysis/openai";
import { MAX_REWRITE_CHARS } from "@/lib/constants";
import { getSubmissionForUser } from "@/lib/data";
import { getDemoSubmissionById } from "@/lib/demo";
import { flags } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const rewriteInputSchema = z.object({
  excerpt: z.string().trim().min(30).max(MAX_REWRITE_CHARS),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = rewriteInputSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paste a passage between 30 and 1,600 characters." },
      { status: 400 },
    );
  }

  if (!flags.hasSupabasePublic) {
    const submission = getDemoSubmissionById(id);
    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const rewrite =
      (await rewriteExcerptWithOpenAI(parsed.data.excerpt).catch(() => null)) ??
      buildFallbackRewrite(parsed.data.excerpt).improvedVersion;

    return NextResponse.json({ rewrite });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const submission = await getSubmissionForUser(supabase, id, user.id);
  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const rewrite =
    (await rewriteExcerptWithOpenAI(parsed.data.excerpt).catch(() => null)) ??
    buildFallbackRewrite(parsed.data.excerpt).improvedVersion;

  return NextResponse.json({ rewrite });
}
