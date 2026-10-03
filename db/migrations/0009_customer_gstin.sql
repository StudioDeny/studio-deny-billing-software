-- db/migrations/0009_customer_gstin.sql
-- Optional customer GSTIN for B2B bills. Off by default on the billing
-- screen; when entered it is copied onto the bill (so old invoices never
-- change) and saved on the registered customer so it pre-fills next time.
-- pos_checkout gains one optional trailing parameter, p_customer_gstin;
-- everything else is identical to 0008.
begin;

alter table public.pos_customers add column if not exists gstin text;
alter table public.pos_customers drop constraint if exists pos_customers_gstin_format;
alter table public.pos_customers add constraint pos_customers_gstin_format
  check (gstin is null or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$');

alter table public.pos_bills add column if not exists customer_gstin text;
alter table public.pos_bills drop constraint if exists pos_bills_customer_gstin_format;
alter table public.pos_bills add constraint pos_bills_customer_gstin_format
  check (customer_gstin is null or customer_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$');

drop function if exists public.pos_checkout(jsonb, uuid, uuid, numeric, text, numeric, jsonb, text, numeric, numeric);

create or replace function public.pos_checkout(
  p_items jsonb,
  p_customer_id uuid,
  p_staff_id uuid,
  p_discount numeric,
  p_discount_reason text,
  p_shipping_fee numeric,
  p_payments jsonb,
  p_notes text,
  p_custom_tax_rate numeric default null,
  p_tax_amount numeric default null,
  p_customer_gstin text default null
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
  v_gstin text := nullif(upper(regexp_replace(coalesce(p_customer_gstin, ''), '\s', '', 'g')), '');
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
  if p_tax_amount is not null and p_custom_tax_rate is null then
    -- LEGACY client (pre-0005 build still deployed): it computed the tax
    -- itself and the customer has already paid that total - record it as is.
    v_tax_amount := p_tax_amount;
    v_tax_rate := case when v_taxable > 0 then round(p_tax_amount * 100 / v_taxable, 2) else 0 end;
  else
    v_tax_rate := public.pos_resolve_tax_rate(v_taxable, p_custom_tax_rate);
    v_tax_amount := round(v_taxable * v_tax_rate / 100);
  end if;
  v_grand_total := v_taxable + v_tax_amount + coalesce(p_shipping_fee, 0);

  insert into public.pos_bills (
    pos_customer_id, staff_id, subtotal, discount, discount_reason, tax_amount, tax_rate, tax_is_custom,
    shipping_fee, grand_total, notes, customer_gstin
  ) values (
    p_customer_id, p_staff_id, v_subtotal, coalesce(p_discount, 0), p_discount_reason, v_tax_amount, v_tax_rate,
    p_custom_tax_rate is not null, coalesce(p_shipping_fee, 0), v_grand_total, p_notes, v_gstin
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
        total_spend = total_spend + v_grand_total,
        gstin = coalesce(v_gstin, gstin)
    where id = p_customer_id;
  end if;

  return v_bill;
end;
$$;

commit;
