-- Single-query aggregate so getCreditSummary doesn't fetch every ledger row.
create or replace function public.get_credit_summary(p_user_id uuid)
returns table(
  remaining bigint,
  total_awarded bigint,
  total_consumed bigint,
  total_purchased bigint
)
language sql
security definer
stable
as $$
  select
    coalesce(sum(delta), 0)                                                           as remaining,
    coalesce(sum(case when delta > 0 then delta else 0 end), 0)                       as total_awarded,
    coalesce(sum(case when delta < 0 then abs(delta) else 0 end), 0)                  as total_consumed,
    coalesce(sum(case when kind = 'purchase' and delta > 0 then delta else 0 end), 0) as total_purchased
  from public.credit_ledger
  where user_id = p_user_id;
$$;

-- Atomically checks the user's credit balance and inserts a reservation in a
-- single transaction, using a per-user advisory lock to prevent concurrent
-- requests from both passing the balance check before either commits.
create or replace function public.reserve_credit(p_user_id uuid)
returns setof public.credit_ledger
language plpgsql
security definer
as $$
declare
  v_remaining bigint;
begin
  perform pg_advisory_xact_lock(('x' || substr(md5(p_user_id::text), 1, 15))::bit(60)::bigint);

  select coalesce(sum(delta), 0) into v_remaining
  from public.credit_ledger
  where user_id = p_user_id;

  if v_remaining <= 0 then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  return query
  insert into public.credit_ledger (user_id, delta, kind, note)
  values (p_user_id, -1, 'reserved', 'Reserved for essay analysis')
  returning *;
end;
$$;
