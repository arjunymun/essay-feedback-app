import Link from "next/link";

type SetupNoticeProps = {
  hasSupabase: boolean;
  hasServiceRole: boolean;
  hasOpenAI: boolean;
};

export function SetupNotice({
  hasSupabase,
  hasServiceRole,
  hasOpenAI,
}: SetupNoticeProps) {
  const missing = [
    !hasSupabase ? "public Supabase keys" : null,
    !hasServiceRole ? "service-role key" : null,
    !hasOpenAI ? "OpenAI API key" : null,
  ].filter(Boolean);

  if (!missing.length) {
    return null;
  }

  return (
    <div className="rounded-[1.5rem] border border-amber-300/30 bg-amber-200/10 p-5 text-sm leading-7 text-amber-50">
      <p className="font-medium">Live review pipeline unavailable</p>
      <p className="mt-2 text-amber-100/80">
        This workspace is missing {missing.join(", ")}, so DraftLens is showing
        the sample review experience until live uploads are enabled.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link className="secondary-button" href="/setup">
          View setup status
        </Link>
        <Link className="rounded-full px-4 py-2 text-amber-50/90 transition hover:text-white" href="/dashboard">
          Explore sample workspace
        </Link>
      </div>
    </div>
  );
}
