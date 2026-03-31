alter table public.credit_ledger
  drop constraint if exists credit_ledger_kind_check;

alter table public.credit_ledger
  add constraint credit_ledger_kind_check
  check (kind in ('seed', 'reserved', 'consumed', 'released', 'adjustment', 'purchase'));

create table if not exists public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  pack_key text not null,
  credits_awarded integer not null check (credits_awarded > 0),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'completed', 'fulfilled')),
  fulfilled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists credit_purchases_user_id_created_at_idx
  on public.credit_purchases (user_id, created_at desc);

drop trigger if exists credit_purchases_set_updated_at on public.credit_purchases;
create trigger credit_purchases_set_updated_at
before update on public.credit_purchases
for each row
execute procedure public.set_updated_at();

alter table public.credit_purchases enable row level security;

drop policy if exists "Users can read their credit purchases" on public.credit_purchases;
create policy "Users can read their credit purchases"
on public.credit_purchases
for select
using (auth.uid() = user_id);
