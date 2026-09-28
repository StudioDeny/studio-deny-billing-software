-- db/migrations/0006_separate_invoice_series.sql
-- Separate invoice number series per channel:
--   Shop (POS) bills   -> SDS-<n>  (continues pos_bill_number_seq)
--   Website invoices   -> SDW-<n>  (new series, issued on delivery)
-- Already-issued numbers are never changed - issued GST invoices keep the
-- number printed on them.
begin;

alter table public.pos_bills
  alter column bill_number set default ('SDS-' || nextval('public.pos_bill_number_seq')::text);

-- Website invoice numbers are issued when an order is DELIVERED (the point
-- it becomes an invoice in the monthly records), so cancelled/refunded
-- orders never consume a number and the SDW series has no gaps from them.
-- Only fills invoice_no when it is empty - if the website ever sets its
-- own, that wins. order_number (the customer-facing order id) is untouched.
create sequence if not exists public.pos_web_invoice_number_seq start 1000001;

create or replace function public.pos_assign_web_invoice_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'DELIVERED' and new.invoice_no is null then
    new.invoice_no := 'SDW-' || nextval('public.pos_web_invoice_number_seq')::text;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_assign_web_invoice_no on public.orders;
create trigger trg_orders_assign_web_invoice_no
  before insert or update of status on public.orders
  for each row execute function public.pos_assign_web_invoice_no();

-- Orders already delivered before this migration, oldest first.
do $$
declare
  r record;
begin
  for r in select id from public.orders where status = 'DELIVERED' and invoice_no is null order by coalesce(delivered_at, created_at) loop
    update public.orders
    set invoice_no = 'SDW-' || nextval('public.pos_web_invoice_number_seq')::text
    where id = r.id;
  end loop;
end;
$$;

commit;
