-- db/migrations/0001_pos_integration.sql
-- Additive-only. Never touches products, product_variants, orders, order_items,
-- categories, profiles, user_roles, app_role, or any existing function/policy.
begin;

create type public.pos_role as enum ('OWNER', 'MANAGER', 'BILLING', 'FULFILLMENT');

-- Staff directory for the POS UI. Authorization for data access is still the
-- existing user_roles.role IN ('admin','staff') check (is_admin_or_staff()) --
-- a pos_staff row only controls what the POS UI shows/labels, not RLS.
create table public.pos_staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  role public.pos_role not null default 'BILLING',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Walk-in / in-store customers without a website account.
create table public.pos_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  address text,
  city text,
  linked_profile_id uuid references public.profiles(id) on delete set null,
  orders_count integer not null default 0,
  total_spend numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (phone)
);

-- POS-only operational settings (tax rate, shipping defaults, printer, invoice
-- numbering prefix). Brand identity (name/GSTIN/address) is read from the
-- website's existing invoice_settings/brand_settings tables, not duplicated here.
create table public.pos_settings (
  id uuid primary key default gen_random_uuid(),
  tax_rate numeric not null default 0,
  shipping_flat_rate numeric not null default 0,
  free_shipping_threshold numeric not null default 0,
  currency text not null default 'INR',
  invoice_prefix text not null default 'SD',
  printer_name text,
  printer_connection text check (printer_connection in ('WIFI', 'USB', 'ETHERNET')),
  last_test_print timestamptz,
  updated_at timestamptz not null default now()
);

create sequence public.pos_bill_number_seq start 1000250;
create sequence public.pos_return_number_seq start 404;

create table public.pos_bills (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null unique default ('SD-' || nextval('public.pos_bill_number_seq')::text),
  pos_customer_id uuid references public.pos_customers(id) on delete set null,
  staff_id uuid references public.pos_staff(id) on delete set null,
  channel text not null default 'OFFLINE' check (channel = 'OFFLINE'),
  subtotal numeric not null default 0 check (subtotal >= 0),
  discount numeric not null default 0 check (discount >= 0),
  discount_reason text,
  tax_amount numeric not null default 0 check (tax_amount >= 0),
  shipping_fee numeric not null default 0 check (shipping_fee >= 0),
  grand_total numeric not null default 0 check (grand_total >= 0),
  payment_status text not null default 'PAID' check (payment_status in ('PAID', 'PENDING', 'REFUNDED', 'FAILED')),
  status text not null default 'COMPLETED' check (status in ('COMPLETED', 'VOID', 'RETURNED')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.pos_bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.pos_bills(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_slug text not null references public.products(slug) on delete restrict,
  product_name text not null,
  size text,
  color text,
  qty integer not null check (qty > 0),
  unit_price numeric not null check (unit_price >= 0),
  item_discount numeric not null default 0 check (item_discount >= 0),
  line_total numeric not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table public.pos_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.pos_bills(id) on delete cascade,
  method text not null check (method in ('CASH', 'UPI', 'CARD', 'OTHER')),
  amount numeric not null check (amount > 0),
  tendered numeric,
  change_amount numeric,
  status text not null default 'SUCCESS' check (status in ('SUCCESS', 'REFUNDED', 'PENDING')),
  created_at timestamptz not null default now()
);

create table public.pos_inventory_logs (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references public.product_variants(id) on delete cascade,
  product_slug text not null references public.products(slug) on delete cascade,
  change_qty integer not null,
  new_stock integer not null check (new_stock >= 0),
  reason text not null check (reason in ('SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN_RESTOCK', 'DAMAGED')),
  bill_id uuid references public.pos_bills(id) on delete set null,
  staff_id uuid references public.pos_staff(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table public.pos_returns (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique default ('SD-RET-' || nextval('public.pos_return_number_seq')::text),
  bill_id uuid not null references public.pos_bills(id) on delete cascade,
  bill_item_id uuid not null references public.pos_bill_items(id) on delete cascade,
  qty integer not null check (qty > 0),
  reason text not null,
  condition text,
  refund_amount numeric not null check (refund_amount >= 0),
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'APPROVED', 'REFUNDED', 'REJECTED')),
  staff_id uuid references public.pos_staff(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_pos_bills_created_at on public.pos_bills (created_at desc);
create index idx_pos_bills_customer on public.pos_bills (pos_customer_id);
create index idx_pos_bill_items_bill on public.pos_bill_items (bill_id);
create index idx_pos_bill_items_variant on public.pos_bill_items (variant_id);
create index idx_pos_payment_transactions_bill on public.pos_payment_transactions (bill_id);
create index idx_pos_inventory_logs_variant on public.pos_inventory_logs (variant_id);
create index idx_pos_inventory_logs_slug on public.pos_inventory_logs (product_slug);
create index idx_pos_returns_bill on public.pos_returns (bill_id);

-- RLS: reuse the existing is_admin_or_staff() helper already used by
-- products/product_variants/orders policies. No new role-check function.
alter table public.pos_staff enable row level security;
alter table public.pos_customers enable row level security;
alter table public.pos_settings enable row level security;
alter table public.pos_bills enable row level security;
alter table public.pos_bill_items enable row level security;
alter table public.pos_payment_transactions enable row level security;
alter table public.pos_inventory_logs enable row level security;
alter table public.pos_returns enable row level security;

create policy "pos_staff: admins manage" on public.pos_staff
  for all using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());
create policy "pos_staff: read own row" on public.pos_staff
  for select using (user_id = auth.uid());

create policy "pos_customers: staff all" on public.pos_customers
  for all using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());

create policy "pos_settings: staff all" on public.pos_settings
  for all using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());

create policy "pos_bills: staff all" on public.pos_bills
  for all using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());

create policy "pos_bill_items: staff all" on public.pos_bill_items
  for all using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());

create policy "pos_payment_transactions: staff all" on public.pos_payment_transactions
  for all using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());

create policy "pos_inventory_logs: staff all" on public.pos_inventory_logs
  for all using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());

create policy "pos_returns: staff all" on public.pos_returns
  for all using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());

-- Atomic checkout: locks whichever stock row (product_variants, or products
-- when a line item has no real variant) backs each line item, decrements it,
-- and writes the bill/items/payments/inventory-log rows in one transaction.
create or replace function public.pos_checkout(
  p_items jsonb,
  p_customer_id uuid,
  p_staff_id uuid,
  p_discount numeric,
  p_discount_reason text,
  p_tax_amount numeric,
  p_shipping_fee numeric,
  p_payments jsonb,
  p_notes text
)
returns public.pos_bills
language plpgsql
security invoker
as $$
declare
  v_bill public.pos_bills;
  v_item jsonb;
  v_pay jsonb;
  v_subtotal numeric := 0;
  v_grand_total numeric;
  v_variant public.product_variants;
  v_product public.products;
  v_new_stock integer;
  v_line_total numeric;
  v_variant_id uuid;
begin
  if not public.is_admin_or_staff() then
    raise exception 'not authorized';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal
      + ((v_item->>'unit_price')::numeric * (v_item->>'qty')::integer)
      - coalesce((v_item->>'item_discount')::numeric, 0);
  end loop;

  v_grand_total := v_subtotal - coalesce(p_discount, 0) + coalesce(p_tax_amount, 0) + coalesce(p_shipping_fee, 0);

  insert into public.pos_bills (
    pos_customer_id, staff_id, subtotal, discount, discount_reason, tax_amount, shipping_fee, grand_total, notes
  ) values (
    p_customer_id, p_staff_id, v_subtotal, coalesce(p_discount, 0), p_discount_reason,
    coalesce(p_tax_amount, 0), coalesce(p_shipping_fee, 0), v_grand_total, p_notes
  ) returning * into v_bill;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;

    if v_variant_id is not null then
      select * into v_variant from public.product_variants where id = v_variant_id for update;
      if v_variant is null then
        raise exception 'variant % not found', v_variant_id;
      end if;
      if v_variant.stock < (v_item->>'qty')::integer then
        raise exception 'insufficient stock for variant %: have %, need %', v_variant.sku, v_variant.stock, v_item->>'qty';
      end if;
      v_new_stock := v_variant.stock - (v_item->>'qty')::integer;
      update public.product_variants set stock = v_new_stock where id = v_variant.id;
    else
      select * into v_product from public.products where slug = v_item->>'product_slug' for update;
      if v_product is null then
        raise exception 'product % not found', v_item->>'product_slug';
      end if;
      if v_product.stock < (v_item->>'qty')::integer then
        raise exception 'insufficient stock for %: have %, need %', v_product.slug, v_product.stock, v_item->>'qty';
      end if;
      v_new_stock := v_product.stock - (v_item->>'qty')::integer;
      update public.products set stock = v_new_stock where slug = v_product.slug;
    end if;

    v_line_total := ((v_item->>'unit_price')::numeric * (v_item->>'qty')::integer)
      - coalesce((v_item->>'item_discount')::numeric, 0);

    insert into public.pos_bill_items (
      bill_id, variant_id, product_slug, product_name, size, color, qty, unit_price, item_discount, line_total
    ) values (
      v_bill.id, v_variant_id, v_item->>'product_slug', v_item->>'product_name',
      v_item->>'size', v_item->>'color', (v_item->>'qty')::integer,
      (v_item->>'unit_price')::numeric, coalesce((v_item->>'item_discount')::numeric, 0), v_line_total
    );

    insert into public.pos_inventory_logs (
      variant_id, product_slug, change_qty, new_stock, reason, bill_id, staff_id
    ) values (
      v_variant_id, v_item->>'product_slug', -((v_item->>'qty')::integer), v_new_stock, 'SALE', v_bill.id, p_staff_id
    );
  end loop;

  for v_pay in select * from jsonb_array_elements(p_payments) loop
    insert into public.pos_payment_transactions (bill_id, method, amount, tendered, change_amount)
    values (
      v_bill.id, v_pay->>'method', (v_pay->>'amount')::numeric,
      nullif(v_pay->>'tendered', '')::numeric, nullif(v_pay->>'change_amount', '')::numeric
    );
  end loop;

  if p_customer_id is not null then
    update public.pos_customers
    set orders_count = orders_count + 1,
        total_spend = total_spend + v_grand_total
    where id = p_customer_id;
  end if;

  return v_bill;
end;
$$;

create or replace function public.pos_adjust_stock(
  p_variant_id uuid,
  p_product_slug text,
  p_change_qty integer,
  p_reason text,
  p_staff_id uuid,
  p_note text
)
returns integer
language plpgsql
security invoker
as $$
declare
  v_variant public.product_variants;
  v_product public.products;
  v_new_stock integer;
begin
  if not public.is_admin_or_staff() then
    raise exception 'not authorized';
  end if;

  if p_variant_id is not null then
    select * into v_variant from public.product_variants where id = p_variant_id for update;
    if v_variant is null then
      raise exception 'variant % not found', p_variant_id;
    end if;
    v_new_stock := greatest(0, v_variant.stock + p_change_qty);
    update public.product_variants set stock = v_new_stock where id = p_variant_id;
  else
    select * into v_product from public.products where slug = p_product_slug for update;
    if v_product is null then
      raise exception 'product % not found', p_product_slug;
    end if;
    v_new_stock := greatest(0, v_product.stock + p_change_qty);
    update public.products set stock = v_new_stock where slug = p_product_slug;
  end if;

  insert into public.pos_inventory_logs (variant_id, product_slug, change_qty, new_stock, reason, staff_id, note)
  values (p_variant_id, p_product_slug, p_change_qty, v_new_stock, p_reason, p_staff_id, p_note);

  return v_new_stock;
end;
$$;

commit;
