create extension if not exists vector;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.review_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  status text not null default 'queued'
    check (status in (
      'queued',
      'ingesting',
      'planning',
      'retrieving',
      'verifying',
      'synthesizing',
      'criticizing',
      'completed',
      'failed'
    )),
  attempts integer not null default 0,
  error_message text,
  trace_id text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists review_jobs_user_id_created_at_idx
  on public.review_jobs (user_id, created_at desc);

create index if not exists review_jobs_submission_id_idx
  on public.review_jobs (submission_id);

drop trigger if exists review_jobs_set_updated_at on public.review_jobs;
create trigger review_jobs_set_updated_at
before update on public.review_jobs
for each row
execute procedure public.set_updated_at();

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  normalized_text_hash text not null,
  title text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (submission_id)
);

create index if not exists documents_user_id_created_at_idx
  on public.documents (user_id, created_at desc);

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
before update on public.documents
for each row
execute procedure public.set_updated_at();

create table if not exists public.document_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  heading text,
  section_index integer not null,
  start_offset integer,
  end_offset integer,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists document_sections_document_id_idx
  on public.document_sections (document_id, section_index);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  section_id uuid references public.document_sections(id) on delete set null,
  chunk_index integer not null,
  page_start integer,
  page_end integer,
  paragraph_start integer,
  paragraph_end integer,
  start_offset integer,
  end_offset integer,
  content text not null,
  embedding vector(1536),
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(content, ''))
  ) stored,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists document_chunks_document_id_idx
  on public.document_chunks (document_id, chunk_index);

create index if not exists document_chunks_search_vector_idx
  on public.document_chunks using gin (search_vector);

create index if not exists document_chunks_content_trgm_idx
  on public.document_chunks using gin (content gin_trgm_ops);

create index if not exists document_chunks_embedding_idx
  on public.document_chunks using hnsw (embedding vector_cosine_ops);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  claim_text text not null,
  support_required boolean not null default false,
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  source_span jsonb not null default '{}'::jsonb,
  verdict text not null default 'uncertain'
    check (verdict in (
      'supported',
      'partially_supported',
      'unsupported',
      'uncertain',
      'not_applicable'
    )),
  confidence numeric(5, 2) not null default 0 check (confidence >= 0 and confidence <= 100),
  uncertainty text,
  recommendation text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists claims_document_id_idx
  on public.claims (document_id);

create index if not exists claims_user_id_verdict_idx
  on public.claims (user_id, verdict);

drop trigger if exists claims_set_updated_at on public.claims;
create trigger claims_set_updated_at
before update on public.claims
for each row
execute procedure public.set_updated_at();

create table if not exists public.evidence_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  source_type text not null
    check (source_type in ('document_chunk', 'crossref', 'openalex', 'user_reference', 'none')),
  title text not null,
  url text,
  source_identifier text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists evidence_sources_user_id_created_at_idx
  on public.evidence_sources (user_id, created_at desc);

create index if not exists evidence_sources_identifier_idx
  on public.evidence_sources (source_identifier);

create table if not exists public.claim_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_id uuid not null references public.claims(id) on delete cascade,
  evidence_source_id uuid not null references public.evidence_sources(id) on delete cascade,
  verdict text not null
    check (verdict in ('supports', 'partially_supports', 'contradicts', 'insufficient')),
  confidence numeric(5, 2) not null default 0 check (confidence >= 0 and confidence <= 100),
  quote text,
  notes text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists claim_evidence_claim_id_idx
  on public.claim_evidence (claim_id);

create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  review_job_id uuid references public.review_jobs(id) on delete set null,
  report_json jsonb not null,
  trust_score integer check (trust_score >= 0 and trust_score <= 100),
  created_at timestamptz not null default timezone('utc', now()),
  unique (submission_id, review_job_id)
);

create index if not exists review_reports_user_id_created_at_idx
  on public.review_reports (user_id, created_at desc);

create table if not exists public.agent_traces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_job_id uuid not null references public.review_jobs(id) on delete cascade,
  provider_trace_id text,
  summary jsonb not null default '{}'::jsonb,
  raw_trace_retained boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists agent_traces_review_job_id_idx
  on public.agent_traces (review_job_id);

create table if not exists public.model_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_job_id uuid references public.review_jobs(id) on delete set null,
  provider text not null default 'openai',
  model text not null,
  step_name text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  latency_ms integer,
  estimated_cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists model_usage_events_user_id_created_at_idx
  on public.model_usage_events (user_id, created_at desc);

create table if not exists public.eval_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  slug text not null,
  case_type text not null,
  document_path text,
  expected jsonb not null default '{}'::jsonb,
  grader_criteria jsonb not null default '{}'::jsonb,
  is_public_fixture boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (slug)
);

create table if not exists public.eval_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  eval_case_id uuid references public.eval_cases(id) on delete cascade,
  review_job_id uuid references public.review_jobs(id) on delete set null,
  model_config jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  passed boolean not null default false,
  trace_artifact_path text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists eval_runs_case_id_created_at_idx
  on public.eval_runs (eval_case_id, created_at desc);

create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_user_id uuid,
  match_document_id uuid default null,
  match_count integer default 8
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity double precision,
  metadata jsonb
)
language sql
stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.metadata
  from public.document_chunks dc
  where dc.user_id = match_user_id
    and dc.embedding is not null
    and (match_document_id is null or dc.document_id = match_document_id)
  order by dc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

alter table public.review_jobs enable row level security;
alter table public.documents enable row level security;
alter table public.document_sections enable row level security;
alter table public.document_chunks enable row level security;
alter table public.claims enable row level security;
alter table public.evidence_sources enable row level security;
alter table public.claim_evidence enable row level security;
alter table public.review_reports enable row level security;
alter table public.agent_traces enable row level security;
alter table public.model_usage_events enable row level security;
alter table public.eval_cases enable row level security;
alter table public.eval_runs enable row level security;

drop policy if exists "Users can read their review jobs" on public.review_jobs;
create policy "Users can read their review jobs"
on public.review_jobs
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read their documents" on public.documents;
create policy "Users can read their documents"
on public.documents
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read their document sections" on public.document_sections;
create policy "Users can read their document sections"
on public.document_sections
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read their document chunks" on public.document_chunks;
create policy "Users can read their document chunks"
on public.document_chunks
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read their claims" on public.claims;
create policy "Users can read their claims"
on public.claims
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read their evidence sources" on public.evidence_sources;
create policy "Users can read their evidence sources"
on public.evidence_sources
for select
using (user_id is null or auth.uid() = user_id);

drop policy if exists "Users can read their claim evidence" on public.claim_evidence;
create policy "Users can read their claim evidence"
on public.claim_evidence
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read their review reports" on public.review_reports;
create policy "Users can read their review reports"
on public.review_reports
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read their agent traces" on public.agent_traces;
create policy "Users can read their agent traces"
on public.agent_traces
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read their model usage" on public.model_usage_events;
create policy "Users can read their model usage"
on public.model_usage_events
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read public or own eval cases" on public.eval_cases;
create policy "Users can read public or own eval cases"
on public.eval_cases
for select
using (is_public_fixture or auth.uid() = user_id);

drop policy if exists "Users can read public or own eval runs" on public.eval_runs;
create policy "Users can read public or own eval runs"
on public.eval_runs
for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.eval_cases ec
    where ec.id = eval_case_id and ec.is_public_fixture
  )
);

grant usage on schema public to authenticated;
grant select on
  public.review_jobs,
  public.documents,
  public.document_sections,
  public.document_chunks,
  public.claims,
  public.evidence_sources,
  public.claim_evidence,
  public.review_reports,
  public.agent_traces,
  public.model_usage_events,
  public.eval_cases,
  public.eval_runs
to authenticated;

grant execute on function public.match_document_chunks(vector(1536), uuid, uuid, integer)
to authenticated;
