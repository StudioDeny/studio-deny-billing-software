-- db/migrations/0005_tax_slabs_and_monthly_bills.sql
-- (1) Slab GST on POS bills: taxable value (after every discount) at or below
--     the threshold is taxed at the low rate, above it at the high rate. The
--     server computes tax itself; the client only chooses "slab" or an
--     OWNER-only custom % for that one bill. Each bill keeps the rate it was
--     actually charged, so old invoices never reprint at today's rate.
-- (2) MONTHLY_BILLS permission for the monthly invoice/report download.
-- (3) Business identity on invoices corrected to the GST registration.
begin;

alter table public.pos_settings
  add column if not exists tax_threshold numeric not null default 2599 check (tax_threshold >= 0),
  add column if not exists tax_rate_low numeric not null default 5 check (tax_rate_low between 0 and 100),
  add column if not exists tax_rate_high numeric not null default 18 check (tax_rate_high between 0 and 100);

alter table public.pos_bills
  add column if not exists tax_rate numeric not null default 0 check (tax_rate between 0 and 100),
  add column if not exists tax_is_custom boolean not null default false;

-- Existing bills: derive the rate they were actually charged.
update public.pos_bills
set tax_rate = round(tax_amount * 100 / (subtotal - discount), 2)
where subtotal - discount > 0 and tax_amount > 0;

-- Slab rate for a taxable value, from pos_settings (falls back to the
-- column defaults if the settings row is somehow missing).
create or replace function public.pos_slab_tax_rate(p_taxable numeric)
returns numeric
language sql
stable
as $$
  select case
    when p_taxable <= coalesce(s.tax_threshold, 2599) then coalesce(s.tax_rate_low, 5)
    else coalesce(s.tax_rate_high, 18)
  end
  from (select 1) one
  left join lateral (select * from public.pos_settings limit 1) s on true;
$$;

-- Resolves the rate for one bill: slab unless a custom % was given, and a
-- custom % is OWNER-only.
create or replace function public.pos_resolve_tax_rate(p_taxable numeric, p_custom_tax_rate numeric)
returns numeric
language plpgsql
stable
as $$
begin
  if p_custom_tax_rate is null then
    return public.pos_slab_tax_rate(p_taxable);
  end if;
  if not public.is_pos_owner() then
    raise exception 'not authorized: only the OWNER can set a custom tax rate';
  end if;
  if p_custom_tax_rate < 0 or p_custom_tax_rate > 100 then
    raise exception 'custom tax rate must be between 0 and 100';
  end if;
  return p_custom_tax_rate;
end;
$$;

-- The signature changes (p_tax_amount -> p_custom_tax_rate), so the old
-- overloads must go or PostgREST would see two candidate functions.
drop function if exists public.pos_checkout(jsonb, uuid, uuid, numeric, text, numeric, numeric, jsonb, text);
drop function if exists public.pos_edit_bill(uuid, jsonb, numeric, text, numeric, numeric, text, uuid);

create or replace function public.pos_checkout(
  p_items jsonb,
  p_customer_id uuid,
  p_staff_id uuid,
  p_discount numeric,
  p_discount_reason text,
  p_custom_tax_rate numeric,
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
  v_taxable numeric;
  v_tax_rate numeric;
  v_tax_amount numeric;
  v_grand_total numeric;
  v_variant public.product_variants;
  v_product public.products;
  v_new_stock integer;
  v_line_total numeric;
  v_variant_id uuid;
begin
  if not public.has_permission('BILLING') then
    raise exception 'not authorized';
  end if;

  -- p_discount is the bill-level discount only; item discounts are already
  -- netted out of each line (and so out of v_subtotal).
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal
      + ((v_item->>'unit_price')::numeric * (v_item->>'qty')::integer)
      - coalesce((v_item->>'item_discount')::numeric, 0);
  end loop;

  v_taxable := greatest(0, v_subtotal - coalesce(p_discount, 0));
  v_tax_rate := public.pos_resolve_tax_rate(v_taxable, p_custom_tax_rate);
  v_tax_amount := round(v_taxable * v_tax_rate / 100);
  v_grand_total := v_taxable + v_tax_amount + coalesce(p_shipping_fee, 0);

  insert into public.pos_bills (
    pos_customer_id, staff_id, subtotal, discount, discount_reason, tax_amount, tax_rate, tax_is_custom,
    shipping_fee, grand_total, notes
  ) values (
    p_customer_id, p_staff_id, v_subtotal, coalesce(p_discount, 0), p_discount_reason, v_tax_amount, v_tax_rate,
    p_custom_tax_rate is not null, coalesce(p_shipping_fee, 0), v_grand_total, p_notes
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

create or replace function public.pos_edit_bill(
  p_bill_id uuid,
  p_items jsonb,
  p_discount numeric,
  p_discount_reason text,
  p_custom_tax_rate numeric,
  p_shipping_fee numeric,
  p_notes text,
  p_editor_staff_id uuid
)
returns public.pos_bills
language plpgsql
security invoker
as $$
declare
  v_bill public.pos_bills;
  v_old_item public.pos_bill_items;
  v_item jsonb;
  v_variant_id uuid;
  v_new_stock integer;
  v_subtotal numeric := 0;
  v_taxable numeric;
  v_tax_rate numeric;
  v_tax_amount numeric;
  v_grand_total numeric;
  v_old_total numeric;
begin
  if not public.is_pos_owner() then
    raise exception 'not authorized: only the OWNER can edit a settled bill';
  end if;

  select * into v_bill from public.pos_bills where id = p_bill_id for update;
  if v_bill is null then
    raise exception 'bill % not found', p_bill_id;
  end if;
  v_old_total := v_bill.grand_total;

  for v_old_item in select * from public.pos_bill_items where bill_id = p_bill_id loop
    if v_old_item.variant_id is not null then
      update public.product_variants set stock = stock + v_old_item.qty where id = v_old_item.variant_id;
    else
      update public.products set stock = stock + v_old_item.qty where slug = v_old_item.product_slug;
    end if;
  end loop;
  delete from public.pos_bill_items where bill_id = p_bill_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal
      + ((v_item->>'unit_price')::numeric * (v_item->>'qty')::integer)
      - coalesce((v_item->>'item_discount')::numeric, 0);
  end loop;

  v_taxable := greatest(0, v_subtotal - coalesce(p_discount, 0));
  v_tax_rate := public.pos_resolve_tax_rate(v_taxable, p_custom_tax_rate);
  v_tax_amount := round(v_taxable * v_tax_rate / 100);
  v_grand_total := v_taxable + v_tax_amount + coalesce(p_shipping_fee, 0);

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;

    if v_variant_id is not null then
      update public.product_variants set stock = greatest(0, stock - (v_item->>'qty')::integer)
        where id = v_variant_id
        returning stock into v_new_stock;
    else
      update public.products set stock = greatest(0, stock - (v_item->>'qty')::integer)
        where slug = v_item->>'product_slug'
        returning stock into v_new_stock;
    end if;

    insert into public.pos_bill_items (
      bill_id, variant_id, product_slug, product_name, size, color, qty, unit_price, item_discount, line_total
    ) values (
      p_bill_id, v_variant_id, v_item->>'product_slug', v_item->>'product_name',
      v_item->>'size', v_item->>'color', (v_item->>'qty')::integer,
      (v_item->>'unit_price')::numeric, coalesce((v_item->>'item_discount')::numeric, 0),
      ((v_item->>'unit_price')::numeric * (v_item->>'qty')::integer) - coalesce((v_item->>'item_discount')::numeric, 0)
    );

    insert into public.pos_inventory_logs (variant_id, product_slug, change_qty, new_stock, reason, bill_id, staff_id, note)
    values (v_variant_id, v_item->>'product_slug', -((v_item->>'qty')::integer), v_new_stock, 'EDIT', p_bill_id, p_editor_staff_id, 'Bill edited');
  end loop;

  update public.pos_bills
  set subtotal = v_subtotal,
      discount = coalesce(p_discount, 0),
      discount_reason = p_discount_reason,
      tax_amount = v_tax_amount,
      tax_rate = v_tax_rate,
      tax_is_custom = p_custom_tax_rate is not null,
      shipping_fee = coalesce(p_shipping_fee, 0),
      grand_total = v_grand_total,
      notes = p_notes
  where id = p_bill_id
  returning * into v_bill;

  if v_bill.pos_customer_id is not null then
    update public.pos_customers
    set total_spend = greatest(0, total_spend - v_old_total + v_grand_total)
    where id = v_bill.pos_customer_id;
  end if;

  return v_bill;
end;
$$;

grant execute on function public.pos_checkout(jsonb, uuid, uuid, numeric, text, numeric, numeric, jsonb, text) to authenticated;
grant execute on function public.pos_edit_bill(uuid, jsonb, numeric, text, numeric, numeric, text, uuid) to authenticated;

-- Monthly Bills page: OWNER and MANAGER get it by default. has_permission()
-- already lets an OWNER through regardless; this is for the sidebar/route.
update public.pos_staff
set permissions = array_append(permissions, 'MONTHLY_BILLS')
where role in ('OWNER', 'MANAGER')
  and not ('MONTHLY_BILLS' = any(permissions));

-- Invoice identity per the GST registration certificate. invoice_settings is
-- shared with the website, so its invoices pick this up too.
update public.invoice_settings
set gstin = '37AFSFS5382N1ZV',
    brand_name = 'STUDIO DENY',
    address = '4-46-3, Junction, near the Laxmi Ganapathi Temple, Lawsons Bay Colony, Pedda Waltair, Visakhapatnam, Andhra Pradesh 530017',
    phone = '+91 8628921203',
    tagline = replace(tagline, 'MUMBAI', 'VISAKHAPATNAM'),
    terms = replace(terms, 'Mumbai jurisdiction', 'Visakhapatnam jurisdiction'),
    updated_at = now();

commit;
