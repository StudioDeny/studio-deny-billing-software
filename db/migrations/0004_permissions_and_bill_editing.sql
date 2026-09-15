-- db/migrations/0004_permissions_and_bill_editing.sql
-- Additive: (1) moves permission enforcement from UI-only to the database,
-- so a staff member's permissions checkboxes are actually binding, not just
-- cosmetic; (2) adds void-bill and full owner-only bill-editing RPCs.
begin;

-- Any staff member holding the named UI permission, OR an OWNER/MANAGER
-- ('admin' in user_roles) who is never restricted by their own permission
-- list - an OWNER can't accidentally lock themselves out.
create or replace function public.has_permission(perm text)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.pos_staff
    where user_id = auth.uid()
      and is_active = true
      and (perm = any(permissions) or role = 'OWNER')
  )
  or public.is_admin();
$$;

-- True only for the account's own pos_staff row being role = OWNER (not
-- MANAGER, even though MANAGER also carries user_roles.role = 'admin').
create or replace function public.is_pos_owner()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.pos_staff
    where user_id = auth.uid() and role = 'OWNER' and is_active = true
  );
$$;

-- Tighten writes on tables that were previously "any staff, any write".
-- Reads stay open to any staff/admin - restricting reads would break
-- screens that need to display data outside their own permission (e.g.
-- Billing needs to read Products even without the Products permission).
drop policy if exists "products: admins write" on public.products;
create policy "products: write requires PRODUCTS permission" on public.products
  for all using (public.has_permission('PRODUCTS')) with check (public.has_permission('PRODUCTS'));

drop policy if exists "variants: admins write" on public.product_variants;
create policy "variants: write requires PRODUCTS permission" on public.product_variants
  for all using (public.has_permission('PRODUCTS')) with check (public.has_permission('PRODUCTS'));

drop policy if exists "pos_customers: staff all" on public.pos_customers;
create policy "pos_customers: read" on public.pos_customers
  for select using (public.is_admin_or_staff());
create policy "pos_customers: write requires CUSTOMERS or BILLING" on public.pos_customers
  for all using (public.has_permission('CUSTOMERS') or public.has_permission('BILLING'))
  with check (public.has_permission('CUSTOMERS') or public.has_permission('BILLING'));

drop policy if exists "pos_settings: staff all" on public.pos_settings;
create policy "pos_settings: read" on public.pos_settings
  for select using (public.is_admin_or_staff());
create policy "pos_settings: write requires SETTINGS permission" on public.pos_settings
  for all using (public.has_permission('SETTINGS')) with check (public.has_permission('SETTINGS'));

drop policy if exists "pos_bills: staff all" on public.pos_bills;
create policy "pos_bills: read" on public.pos_bills
  for select using (public.is_admin_or_staff());
create policy "pos_bills: insert requires BILLING" on public.pos_bills
  for insert with check (public.has_permission('BILLING'));
create policy "pos_bills: update requires BILLS" on public.pos_bills
  for update using (public.has_permission('BILLS')) with check (public.has_permission('BILLS'));

drop policy if exists "pos_bill_items: staff all" on public.pos_bill_items;
create policy "pos_bill_items: read" on public.pos_bill_items
  for select using (public.is_admin_or_staff());
create policy "pos_bill_items: insert requires BILLING" on public.pos_bill_items
  for insert with check (public.has_permission('BILLING'));
create policy "pos_bill_items: update/delete requires BILLS" on public.pos_bill_items
  for update using (public.has_permission('BILLS')) with check (public.has_permission('BILLS'));
create policy "pos_bill_items: delete requires BILLS" on public.pos_bill_items
  for delete using (public.has_permission('BILLS'));

drop policy if exists "pos_payment_transactions: staff all" on public.pos_payment_transactions;
create policy "pos_payment_transactions: read" on public.pos_payment_transactions
  for select using (public.is_admin_or_staff());
create policy "pos_payment_transactions: write requires BILLING" on public.pos_payment_transactions
  for all using (public.has_permission('BILLING')) with check (public.has_permission('BILLING'));

drop policy if exists "pos_inventory_logs: staff all" on public.pos_inventory_logs;
create policy "pos_inventory_logs: read" on public.pos_inventory_logs
  for select using (public.is_admin_or_staff());
create policy "pos_inventory_logs: write requires BILLING or PRODUCTS" on public.pos_inventory_logs
  for insert with check (public.has_permission('BILLING') or public.has_permission('PRODUCTS'));

drop policy if exists "pos_returns: staff all" on public.pos_returns;
create policy "pos_returns: read" on public.pos_returns
  for select using (public.is_admin_or_staff());
create policy "pos_returns: write requires BILLS" on public.pos_returns
  for all using (public.has_permission('BILLS')) with check (public.has_permission('BILLS'));

-- pos_checkout / pos_adjust_stock: swap the blanket is_admin_or_staff()
-- gate for the specific permission each action actually needs.
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
  if not public.has_permission('BILLING') then
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
  if not public.has_permission('PRODUCTS') then
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

-- Widen the inventory log reason set to cover voids/edits.
alter table public.pos_inventory_logs drop constraint if exists pos_inventory_logs_reason_check;
alter table public.pos_inventory_logs add constraint pos_inventory_logs_reason_check
  check (reason in ('SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN_RESTOCK', 'DAMAGED', 'VOID', 'EDIT'));

-- Void a settled bill: restock every item, mark the bill VOID. Requires the
-- BILLS permission (any staff trusted to manage bills, not owner-only -
-- editing amounts on a still-valid invoice is the sensitive one, below).
create or replace function public.pos_void_bill(p_bill_id uuid, p_staff_id uuid, p_reason text)
returns public.pos_bills
language plpgsql
security invoker
as $$
declare
  v_bill public.pos_bills;
  v_item public.pos_bill_items;
  v_new_stock integer;
begin
  if not public.has_permission('BILLS') then
    raise exception 'not authorized';
  end if;

  select * into v_bill from public.pos_bills where id = p_bill_id for update;
  if v_bill is null then
    raise exception 'bill % not found', p_bill_id;
  end if;
  if v_bill.status = 'VOID' then
    raise exception 'bill % is already void', v_bill.bill_number;
  end if;

  for v_item in select * from public.pos_bill_items where bill_id = p_bill_id loop
    if v_item.variant_id is not null then
      update public.product_variants set stock = stock + v_item.qty where id = v_item.variant_id
        returning stock into v_new_stock;
    else
      update public.products set stock = stock + v_item.qty where slug = v_item.product_slug
        returning stock into v_new_stock;
    end if;

    insert into public.pos_inventory_logs (variant_id, product_slug, change_qty, new_stock, reason, bill_id, staff_id, note)
    values (v_item.variant_id, v_item.product_slug, v_item.qty, v_new_stock, 'VOID', p_bill_id, p_staff_id, p_reason);
  end loop;

  update public.pos_bills set status = 'VOID', notes = coalesce(notes || ' | ', '') || 'VOIDED: ' || coalesce(p_reason, '')
  where id = p_bill_id
  returning * into v_bill;

  if v_bill.pos_customer_id is not null then
    update public.pos_customers
    set orders_count = greatest(0, orders_count - 1),
        total_spend = greatest(0, total_spend - v_bill.grand_total)
    where id = v_bill.pos_customer_id;
  end if;

  return v_bill;
end;
$$;

-- Full edit of a settled bill's line items and totals. OWNER only (not
-- MANAGER, even though MANAGER also carries user_roles.role = 'admin') -
-- altering amounts on an already-issued invoice is deliberately the most
-- restricted action in the system.
create or replace function public.pos_edit_bill(
  p_bill_id uuid,
  p_items jsonb,
  p_discount numeric,
  p_discount_reason text,
  p_tax_amount numeric,
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

  -- Reverse the stock impact of every existing line item before applying
  -- the edited set - simplest correct model for a full-replace edit.
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
  v_grand_total := v_subtotal - coalesce(p_discount, 0) + coalesce(p_tax_amount, 0) + coalesce(p_shipping_fee, 0);

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
      tax_amount = coalesce(p_tax_amount, 0),
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

commit;
