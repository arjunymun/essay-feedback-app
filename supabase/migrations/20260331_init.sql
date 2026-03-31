create extension if not exists pgcrypto;

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  file_name text not null,
  mime_type text not null,
  status text not null check (status in ('processing', 'completed', 'failed')),
  citation_style text not null default 'unknown' check (citation_style in ('apa', 'mla', 'unknown')),
  word_count integer not null default 0,
  overall_score integer,
  report_json jsonb,
  report_excerpt text,
  storage_object_path text,
  source_deleted_at timestamptz,
  error_message text,
  reserved_credit_entry_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists submissions_user_id_created_at_idx
  on public.submissions (user_id, created_at desc);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete set null,
  kind text not null check (kind in ('seed', 'reserved', 'consumed', 'released', 'adjustment')),
  delta integer not null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists credit_ledger_user_id_created_at_idx
  on public.credit_ledger (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists submissions_set_updated_at on public.submissions;
create trigger submissions_set_updated_at
before update on public.submissions
for each row
execute procedure public.set_updated_at();

alter table public.submissions enable row level security;
alter table public.credit_ledger enable row level security;

drop policy if exists "Users can read their submissions" on public.submissions;
create policy "Users can read their submissions"
on public.submissions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read their credit ledger" on public.credit_ledger;
create policy "Users can read their credit ledger"
on public.credit_ledger
for select
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'essay-uploads',
  'essay-uploads',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

drop policy if exists "Users can upload own essay files" on storage.objects;
create policy "Users can upload own essay files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'essay-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can read own essay files" on storage.objects;
create policy "Users can read own essay files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'essay-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own essay files" on storage.objects;
create policy "Users can delete own essay files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'essay-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);
