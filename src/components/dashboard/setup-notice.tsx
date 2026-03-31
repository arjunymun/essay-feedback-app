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
      <p className="font-medium">Setup still needed</p>
      <p className="mt-2 text-amber-100/80">
        Add {missing.join(", ")} in `.env.local` before the authenticated upload flow can run end to end.
      </p>
    </div>
  );
}
