-- db/migrations/0007_monthly_invoice_numbers.sql
-- Invoice numbers become <SERIES>-<YYMM>-<NNNN>, restarting every month (IST):
--   Shop (POS) bills  -> SDS-2609-0001, SDS-2609-0002, ... SDS-2610-0001
--   Website invoices  -> SDW-2609-0001 ... (issued when the order is DELIVERED)
-- Counters live in a table, not a sequence, so a rolled-back checkout gives
-- its number back - the series has no gaps. Numbers are only ever assigned
-- by triggers; clients cannot call the allocator and burn numbers.
-- Already-issued numbers (SD-1000251..255) are unchanged.
begin;

create table if not exists public.pos_invoice_counters (
  series text not null,
  period text not null, -- YYMM in IST
  last_no integer not null,
  primary key (series, period)
);
alter table public.pos_invoice_counters enable row level security;
-- No policies: only the security-definer functions below touch it.

create or replace function public.pos_next_invoice_no(p_series text, p_at timestamptz)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(p_at at time zone 'Asia/Kolkata', 'YYMM');
  v_no integer;
begin
  insert into public.pos_invoice_counters as c (series, period, last_no)
  values (p_series, v_period, 1)
  on conflict (series, period) do update set last_no = c.last_no + 1
  returning last_no into v_no;
  -- lpad would truncate past 9999; let the number widen instead.
  return p_series || '-' || v_period || '-' || case when v_no > 9999 then v_no::text else lpad(v_no::text, 4, '0') end;
end;
$$;
revoke all on function public.pos_next_invoice_no(text, timestamptz) from public, anon, authenticated;

-- Shop bills: always numbered by the database at insert time.
create or replace function public.pos_assign_bill_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.bill_number := public.pos_next_invoice_no('SDS', coalesce(new.created_at, now()));
  return new;
end;
$$;

alter table public.pos_bills alter column bill_number drop default;

drop trigger if exists trg_pos_bills_assign_number on public.pos_bills;
create trigger trg_pos_bills_assign_number
  before insert on public.pos_bills
  for each row execute function public.pos_assign_bill_number();

-- Website invoices: numbered in the month the order was delivered (the same
-- month the Monthly Bills PDF files it under).
create or replace function public.pos_assign_web_invoice_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'DELIVERED' and new.invoice_no is null then
    new.invoice_no := public.pos_next_invoice_no('SDW', coalesce(new.delivered_at, now()));
  end if;
  return new;
end;
$$;

-- The 0006 sequence is superseded (it was never used for a real invoice).
drop sequence if exists public.pos_web_invoice_number_seq;

commit;
