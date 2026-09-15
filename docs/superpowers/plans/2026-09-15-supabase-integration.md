# Studio Deny POS — Supabase Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect `studio-deny-billing-software` (billing.studiodeny.com) to the live Supabase project that already powers studiodeny.com, so the POS shares real product/inventory data with the website and every POS sale is persisted to the same database — no mock/localStorage data left in the critical path.

**Architecture:** The website's existing tables (`products`, `product_variants`, `categories`, `orders`, etc., project `ablejcrtuiohdrapgacb`) are read directly by the POS and are never altered. A small set of new `pos_*` tables (additive only) hold everything specific to in-store billing (bills, bill items, split payments, staff, walk-in customers, inventory audit log, returns). One Postgres function (`pos_checkout`) makes a whole sale — stock decrement across every line item, bill, bill items, payments — atomic and race-safe, whether a line item is a real `product_variants` row or (for the many products with no size/color variants) the `products` row itself. Staff log in with Supabase Auth and must already carry `user_roles.role IN ('admin','staff')` — the exact same check (`is_admin_or_staff()`) the website's own admin panel already relies on — so POS RLS reuses that helper instead of inventing a parallel permission system. The frontend talks to Supabase directly with the publishable key; no backend service is introduced.

**Tech Stack:** Vite + React 19 + TypeScript, `@supabase/supabase-js`, existing Tailwind UI kit, Supabase Postgres/Auth/RLS (project `ablejcrtuiohdrapgacb`, region `ap-south-1`).

**Spec:** This plan's spec is the conversation record itself — the four architecture decisions confirmed by the user (new POS tables sharing `product_variants`/`products` stock; new `pos_customers` for walk-ins; Supabase Auth reused for staff login; direct frontend access via publishable key + RLS) — plus the live schema introspected from the production database (see Global Constraints).

## Global Constraints

- **Additive only.** No `ALTER`/`DROP` on any existing table, enum, policy, or function (`products`, `product_variants`, `orders`, `order_items`, `categories`, `user_roles`, `profiles`, `app_role` enum, `is_admin`, `is_admin_or_staff`, `order_number_seq`, etc.). All new objects are prefixed `pos_`.
- **Secrets never committed.** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (value `sb_publishable_zUm3dp2CuyDLJvF4djpOLw_nW7U7PZB`) live in a gitignored `.env`. The secret key (`sb_secret_...`) and DB password are **never** placed in any file under this repo — they were only used ad hoc, outside the repo, to introspect the schema for this plan. The user has been told to rotate both since they were pasted in plaintext chat.
- **RLS reuse.** New `pos_*` tables use the existing `public.is_admin_or_staff()` SQL function for their RLS policies — do not write a new role-check function.
- **Dual stock model.** Most of the 18 live products (`product_variants` currently has only 1 row) carry price/stock directly on `products` (`products.price`, `products.stock`), not on `product_variants`. A handful of products use `product_variants` for size/color combos. Every checkout/adjustment code path (SQL function and TypeScript) must handle both: `variant_id IS NOT NULL` → touch `product_variants`; `variant_id IS NULL` → touch `products` by `slug`. This mirrors the website's own `order_items` design (`variant_id` nullable, RLS policy already branches on it the same way).
- **Real routed pages only.** Per `src/App.tsx`, live routes are: `/login`, `/dashboard`, `/billing/new`, `/bills`, `/bills/:id`, `/products`, `/products/:id`, `/customers`, `/customers/:id`, `/tags`, `/audit`, `/settings`. Every other page file under `src/pages/` (inventory, collections, staff, fulfillment, shipping, returns, analytics, orders, payments, invoices) is currently redirected away and out of scope for call-site rewiring — they'll receive real data for free once `useStore()` is Supabase-backed, but their own mutating calls are not wired in this plan.
- **No auth account creation without the user's say-so.** Creating the first Supabase Auth staff login (email + password) requires info only the user has and is a real access-granting action — this plan stops short of it and hands the user an exact SQL snippet to run themselves (or asks them to say go-ahead) at Task 6.

---

## File Structure

- Create: `db/migrations/0001_pos_integration.sql` — full additive schema (enum, tables, indexes, RLS, function). Source of truth, applied by hand via Supabase SQL Editor or by the assistant via a throwaway `pg` script (never committed).
- Create: `.env` (gitignored, not committed) — `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Create: `.env.example` — same keys, empty values, committed as documentation.
- Modify: `.gitignore` — add `.env`.
- Create: `src/lib/supabaseClient.ts` — single `supabase` client instance.
- Create: `src/types/supabase.ts` — hand-written row types for tables the app touches (existing + new).
- Create: `src/api/auth.ts` — `signIn`, `signOut`, `getCurrentStaff`, `onAuthChange`.
- Create: `src/api/pos.ts` — all data access: catalog, customers, staff, settings, bills, checkout, stock adjustment, returns.
- Modify: `src/services/store.ts` — swap localStorage/mock bootstrap and in-memory mutations for `src/api/pos.ts` calls; keep the existing `CommerceState`/`useStore()`/listener shape so the ~30 consuming pages don't need to change how they *read* state.
- Modify: `src/pages/Login.tsx` — real `signIn`, error display, loading state.
- Modify: `src/App.tsx` — auth-guarded layout route, redirect to `/login` when signed out.
- Modify: `src/pages/billing/PosBillingPage.tsx` — `createOrder`/`addCustomer` call sites become async.
- Modify: `src/pages/products/ProductsPage.tsx` — `addProduct` call site becomes async.
- Modify: `src/pages/products/ProductDetailPage.tsx` — three `adjustStock` call sites become async.
- Modify: `src/components/common/QuickNewModal.tsx` — `addProduct`/`adjustStock` call sites become async.
- Modify: `src/pages/settings/SettingsPage.tsx` — `updateSettings` call site becomes async.

---

### Task 1: Database migration file — enums, tables, indexes

**Files:**
- Create: `db/migrations/0001_pos_integration.sql`

**Interfaces:**
- Produces: tables `pos_staff`, `pos_customers`, `pos_settings`, `pos_bills`, `pos_bill_items`, `pos_payment_transactions`, `pos_inventory_logs`, `pos_returns`; enum `pos_role`; sequences `pos_bill_number_seq` (start 1000250, matches the app's existing `SD-1000250` mock numbering), `pos_return_number_seq`.

- [ ] **Step 1: Write the migration file**

```sql
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

commit;
```

- [ ] **Step 2: Verify the file has no syntax placeholders**

Re-read the file and confirm every `references`, `check`, and default clause names a real column/table from the live schema captured in this plan's Global Constraints (no `TODO`, no invented columns).

- [ ] **Step 3: Commit**

```bash
git add db/migrations/0001_pos_integration.sql
git commit -m "feat: add additive POS schema migration for Supabase integration"
```

---

### Task 2: RLS policies for the new tables

**Files:**
- Modify: `db/migrations/0001_pos_integration.sql` (append before `commit;`)

**Interfaces:**
- Consumes: `public.is_admin_or_staff()` (existing function, confirmed present on the live DB — grants `admin`/`staff` `user_roles` rows access to `products`/`product_variants`/`orders` today).
- Produces: every `pos_*` table readable/writable only by `admin`/`staff` accounts; `pos_customers`/`pos_bills`/etc. are never public.

- [ ] **Step 1: Insert RLS statements before the final `commit;` in `0001_pos_integration.sql`**

```sql
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
```

- [ ] **Step 2: Confirm every new table got an `enable row level security` line**

Count: 8 `alter table ... enable row level security` statements, one per table created in Task 1.

- [ ] **Step 3: Commit**

```bash
git add db/migrations/0001_pos_integration.sql
git commit -m "feat: add RLS policies for POS tables reusing is_admin_or_staff()"
```

---

### Task 3: Atomic checkout and stock-adjustment functions

**Files:**
- Modify: `db/migrations/0001_pos_integration.sql` (append before `commit;`, after the RLS block)

**Interfaces:**
- Produces: `public.pos_checkout(p_items jsonb, p_customer_id uuid, p_staff_id uuid, p_discount numeric, p_discount_reason text, p_tax_amount numeric, p_shipping_fee numeric, p_payments jsonb, p_notes text) returns public.pos_bills`
  - `p_items` element shape: `{"variant_id": uuid|null, "product_slug": text, "product_name": text, "size": text|null, "color": text|null, "qty": int, "unit_price": numeric, "item_discount": numeric}`
  - `p_payments` element shape: `{"method": "CASH"|"UPI"|"CARD"|"OTHER", "amount": numeric, "tendered": numeric|null, "change_amount": numeric|null}`
- Produces: `public.pos_adjust_stock(p_variant_id uuid, p_product_slug text, p_change_qty integer, p_reason text, p_staff_id uuid, p_note text) returns integer` — returns new stock.

- [ ] **Step 1: Insert the checkout function before the final `commit;`**

```sql
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
```

- [ ] **Step 2: Confirm both functions are `security invoker`**

Grep the file for `security invoker` — must appear exactly twice (once per function). This is what makes the functions respect RLS as the calling staff member, instead of running with elevated privileges — do not change to `security definer`.

- [ ] **Step 3: Commit**

```bash
git add db/migrations/0001_pos_integration.sql
git commit -m "feat: add pos_checkout and pos_adjust_stock atomic RPC functions"
```

---

### Task 4: Apply the migration to the live database and verify

**Files:**
- Read: `db/migrations/0001_pos_integration.sql`

This task executes DDL against the live production database (project `ablejcrtuiohdrapgacb`) that also serves studiodeny.com. Everything in it is additive per Global Constraints, but **get explicit user go-ahead immediately before running it**, even though the architecture was already agreed — this is the first point actual production schema changes happen.

- [ ] **Step 1: Ask the user to confirm, showing them the file path**

Do not proceed to Step 2 without an explicit yes in this session.

- [ ] **Step 2: Apply via Supabase SQL Editor (preferred) or a throwaway script**

Preferred: user pastes `db/migrations/0001_pos_integration.sql` into the Supabase Dashboard SQL Editor for project `ablejcrtuiohdrapgacb` and runs it — gives them a visible undo point and execution log.

If the assistant applies it instead, use a temporary Node script (same pattern as the earlier read-only introspection: `pg` installed in the scratchpad directory only, connection string passed via env var, never written to a file in the repo) that reads `db/migrations/0001_pos_integration.sql` and runs it inside a single `client.query()` call so the leading `begin;`/`commit;` in the file makes it one transaction.

- [ ] **Step 3: Verify the new objects exist (read-only query)**

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'pos_%'
order by table_name;
-- expect: pos_bill_items, pos_bills, pos_customers, pos_inventory_logs,
--         pos_payment_transactions, pos_returns, pos_settings, pos_staff

select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and proname in ('pos_checkout', 'pos_adjust_stock');
-- expect both rows present
```

- [ ] **Step 4: Verify the checkout function works without persisting fake data**

Run inside a transaction that always rolls back, using a real slug from the live catalog (e.g. `ringer-graphic-tee`, confirmed present with stock 22 during schema introspection) so nothing fake is left behind:

```sql
begin;
select public.pos_checkout(
  '[{"variant_id": null, "product_slug": "ringer-graphic-tee", "product_name": "Ringer Graphic Tee", "size": null, "color": null, "qty": 1, "unit_price": 999, "item_discount": 0}]'::jsonb,
  null, null, 0, null, 0, 0,
  '[{"method": "CASH", "amount": 999, "tendered": 1000, "change_amount": 1}]'::jsonb,
  'schema verification — rolled back, not a real sale'
);
-- inspect the returned row: bill_number should look like SD-1000250, grand_total = 999
rollback;
```

- [ ] **Step 5: Insert the first POS staff bootstrap row (documented for the user, not run automatically)**

The assistant does not create Supabase Auth accounts. Hand the user this snippet to run themselves once they've created (or identified) the auth user for the store owner, replacing the email:

```sql
-- Run after the owner has an auth.users account (sign up via the website or Supabase Dashboard > Authentication)
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'owner@studiodeny.com'
on conflict (user_id) do nothing;

insert into public.pos_staff (user_id, display_name, role)
select id, 'Store Owner', 'OWNER' from auth.users where email = 'owner@studiodeny.com';
```

---

### Task 5: Supabase client, env, and TypeScript row types

**Files:**
- Create: `.env`
- Create: `.env.example`
- Modify: `.gitignore`
- Create: `src/lib/supabaseClient.ts`
- Create: `src/types/supabase.ts`

**Interfaces:**
- Produces: `supabase` (default export of `src/lib/supabaseClient.ts`, typed `SupabaseClient`).
- Produces: TypeScript interfaces `DbProduct`, `DbProductVariant`, `DbPosStaff`, `DbPosCustomer`, `DbPosBill`, `DbPosBillItem`, `DbPosPaymentTransaction`, `DbPosInventoryLog`, `DbPosReturn`, `DbPosSettings`, `DbInvoiceSettings`, `DbBrandSettings`.

- [ ] **Step 1: Add `.env` and `.env.example`, update `.gitignore`**

```
# .env.example
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

`.env` (same file, real values, not committed):
```
VITE_SUPABASE_URL=https://ablejcrtuiohdrapgacb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_zUm3dp2CuyDLJvF4djpOLw_nW7U7PZB
```

Add to `.gitignore` (after the existing `*.local` line):
```
.env
```

- [ ] **Step 2: Install `@supabase/supabase-js`**

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 3: Write `src/lib/supabaseClient.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

- [ ] **Step 4: Write `src/types/supabase.ts`**

```typescript
export interface DbProduct {
  slug: string;
  name: string;
  category: string;
  brand: string | null;
  price: number;
  compare_at: number | null;
  image: string;
  hover_image: string;
  badge: string | null;
  sizes: string[];
  colors: { name: string; hex: string }[];
  description: string;
  material: string;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  category_id: string | null;
  gallery: string[];
  created_at: string;
  updated_at: string;
}

export interface DbProductVariant {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  stock: number;
  price: number;
  compare_price: number | null;
  sku: string | null;
  created_at: string;
}

export interface DbPosStaff {
  id: string;
  user_id: string;
  display_name: string;
  role: 'OWNER' | 'MANAGER' | 'BILLING' | 'FULFILLMENT';
  is_active: boolean;
  created_at: string;
}

export interface DbPosCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  linked_profile_id: string | null;
  orders_count: number;
  total_spend: number;
  created_at: string;
}

export interface DbPosSettings {
  id: string;
  tax_rate: number;
  shipping_flat_rate: number;
  free_shipping_threshold: number;
  currency: string;
  invoice_prefix: string;
  printer_name: string | null;
  printer_connection: 'WIFI' | 'USB' | 'ETHERNET' | null;
  last_test_print: string | null;
  updated_at: string;
}

export interface DbInvoiceSettings {
  brand_name: string;
  tagline: string;
  gstin: string;
  email: string;
  phone: string;
  address: string;
  terms: string;
  footer: string;
  signatory: string;
  tax_label: string;
}

export interface DbBrandSettings {
  site_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
}

export interface DbPosBill {
  id: string;
  bill_number: string;
  pos_customer_id: string | null;
  staff_id: string | null;
  channel: 'OFFLINE';
  subtotal: number;
  discount: number;
  discount_reason: string | null;
  tax_amount: number;
  shipping_fee: number;
  grand_total: number;
  payment_status: 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED';
  status: 'COMPLETED' | 'VOID' | 'RETURNED';
  notes: string | null;
  created_at: string;
}

export interface DbPosBillItem {
  id: string;
  bill_id: string;
  variant_id: string | null;
  product_slug: string;
  product_name: string;
  size: string | null;
  color: string | null;
  qty: number;
  unit_price: number;
  item_discount: number;
  line_total: number;
  created_at: string;
}

export interface DbPosPaymentTransaction {
  id: string;
  bill_id: string;
  method: 'CASH' | 'UPI' | 'CARD' | 'OTHER';
  amount: number;
  tendered: number | null;
  change_amount: number | null;
  status: 'SUCCESS' | 'REFUNDED' | 'PENDING';
  created_at: string;
}

export interface DbPosInventoryLog {
  id: string;
  variant_id: string | null;
  product_slug: string;
  change_qty: number;
  new_stock: number;
  reason: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'RETURN_RESTOCK' | 'DAMAGED';
  bill_id: string | null;
  staff_id: string | null;
  note: string | null;
  created_at: string;
}

export interface DbPosReturn {
  id: string;
  return_number: string;
  bill_id: string;
  bill_item_id: string;
  qty: number;
  reason: string;
  condition: string | null;
  refund_amount: number;
  status: 'REQUESTED' | 'APPROVED' | 'REFUNDED' | 'REJECTED';
  staff_id: string | null;
  created_at: string;
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors related to the new files (pre-existing unrelated errors, if any, are out of scope).

- [ ] **Step 6: Commit**

```bash
git add .env.example .gitignore src/lib/supabaseClient.ts src/types/supabase.ts package.json package-lock.json
git commit -m "feat: add Supabase client, env config, and DB row types"
```

(`.env` itself is gitignored and must not appear in `git status` output — verify with `git status` before committing.)

---

### Task 6: Auth API and real Login page

**Files:**
- Create: `src/api/auth.ts`
- Modify: `src/pages/Login.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabaseClient.ts`; `DbPosStaff` from `src/types/supabase.ts`.
- Produces: `signIn(email: string, password: string): Promise<{ staff: DbPosStaff }>`, `signOut(): Promise<void>`, `getSession(): Promise<Session | null>`, `getCurrentStaff(): Promise<DbPosStaff | null>` (all in `src/api/auth.ts`).

- [ ] **Step 1: Write `src/api/auth.ts`**

```typescript
import { supabase } from '../lib/supabaseClient';
import { DbPosStaff } from '../types/supabase';

export async function getCurrentStaff(): Promise<DbPosStaff | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from('pos_staff')
    .select('*')
    .eq('user_id', userData.user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data as DbPosStaff | null;
}

export async function signIn(email: string, password: string): Promise<{ staff: DbPosStaff }> {
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) throw new Error(authError.message);

  const staff = await getCurrentStaff();
  if (!staff) {
    await supabase.auth.signOut();
    throw new Error('This account is not registered as Studio Deny POS staff.');
  }

  return { staff };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export function onAuthChange(callback: (signedIn: boolean) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(!!session);
  });
  return () => data.subscription.unsubscribe();
}
```

- [ ] **Step 2: Rewire `src/pages/Login.tsx`**

Replace lines 1–17 (imports and `handleSubmit`) with:

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { store } from '../services/store';
import { signIn } from '../api/auth';
import { Lock, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { staff } = await signIn(email, password);
      store.addToast('Welcome Back', `Signed in as ${staff.display_name}.`, 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };
```

Add error display right after the opening `<form onSubmit={handleSubmit} className="space-y-5">` tag (line 50):

```typescript
          {error && (
            <div className="text-xs font-mono text-red-600 border border-red-300 bg-red-50 px-3 py-2">
              {error}
            </div>
          )}
```

Change the submit button (around line 68-77) to reflect loading state:

```typescript
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              icon={<ArrowRight size={16} />}
              iconPosition="right"
              disabled={loading}
            >
              {loading ? '[ SIGNING IN... ]' : '[ ENTER WORKSPACE ]'}
            </Button>
```

- [ ] **Step 3: Add the auth guard in `src/App.tsx`**

Add the import near the top (after line 5):

```typescript
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
```

Replace the `<Route path="/" element={<AppLayout />}>` line (line 41) with an inline guard component defined above `App`:

```typescript
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<'checking' | 'authed' | 'anon'>('checking');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? 'authed' : 'anon');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? 'authed' : 'anon');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (status === 'checking') return null;
  if (status === 'anon') return <Navigate to="/login" replace />;
  return <>{children}</>;
};
```

Then change:
```typescript
<Route path="/" element={<AppLayout />}>
```
to:
```typescript
<Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc -b --noEmit`
Run: `npm run lint`
Expected: both pass with no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/api/auth.ts src/pages/Login.tsx src/App.tsx
git commit -m "feat: wire real Supabase Auth login and route guard"
```

---

### Task 7: POS data access layer (`src/api/pos.ts`)

**Files:**
- Create: `src/api/pos.ts`

**Interfaces:**
- Consumes: `supabase`, all `Db*` types from Task 5, `Order`/`OrderItem`/`Product`/`ProductVariant`/`Customer`/`StaffMember`/`CommerceSettings`/`PaymentTransaction`/`InventoryLog`/`ReturnRequest` from `src/types/index.ts`.
- Produces (mapped to the app's existing shapes so `store.ts` needs minimal translation):
  - `fetchProducts(): Promise<Product[]>`
  - `fetchCustomers(): Promise<Customer[]>`
  - `fetchStaff(): Promise<StaffMember[]>`
  - `fetchBills(): Promise<Order[]>`
  - `fetchInventoryLogs(): Promise<InventoryLog[]>`
  - `fetchSettings(): Promise<CommerceSettings>`
  - `checkout(input): Promise<Order>`
  - `createCustomer(input): Promise<Customer>`
  - `createProduct(input): Promise<Product>`
  - `adjustStock(variantId: string | null, productSlug: string, changeQty: number, reason, staffId): Promise<void>`
  - `saveSettings(updates: Partial<CommerceSettings>): Promise<void>`

- [ ] **Step 1: Write `src/api/pos.ts`**

```typescript
import { supabase } from '../lib/supabaseClient';
import {
  Product,
  ProductVariant,
  Customer,
  StaffMember,
  Order,
  OrderItem,
  CommerceSettings,
  InventoryLog,
  PaymentSplit,
} from '../types';
import {
  DbProduct,
  DbProductVariant,
  DbPosCustomer,
  DbPosStaff,
  DbPosBill,
  DbPosBillItem,
  DbPosInventoryLog,
  DbPosSettings,
  DbInvoiceSettings,
  DbBrandSettings,
} from '../types/supabase';

function mapVariant(v: DbProductVariant): ProductVariant {
  return {
    id: v.id,
    sku: v.sku || '',
    color: v.color || '',
    size: v.size || '',
    price: v.price,
    compareAtPrice: v.compare_price ?? undefined,
    stock: v.stock,
    barcode: v.sku ?? undefined,
  };
}

function mapProduct(p: DbProduct, variants: DbProductVariant[]): Product {
  const ownVariants = variants.filter((v) => v.product_id === p.slug);
  const hasRealVariants = ownVariants.length > 0;
  const mappedVariants: ProductVariant[] = hasRealVariants
    ? ownVariants.map(mapVariant)
    : [
        {
          id: p.slug,
          sku: p.slug,
          color: '',
          size: '',
          price: p.price,
          compareAtPrice: p.compare_at ?? undefined,
          stock: p.stock,
        },
      ];

  return {
    id: p.slug,
    name: p.name,
    sku: p.slug,
    collection: p.category,
    category: p.category,
    price: p.price,
    compareAtPrice: p.compare_at ?? undefined,
    sizes: p.sizes || [],
    colors: (p.colors || []).map((c) => c.name),
    variants: mappedVariants,
    totalStock: hasRealVariants ? ownVariants.reduce((s, v) => s + v.stock, 0) : p.stock,
    status: p.is_active ? 'ACTIVE' : 'ARCHIVED',
    image: p.image,
    description: p.description,
    tags: [],
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const [{ data: products, error: pErr }, { data: variants, error: vErr }] = await Promise.all([
    supabase.from('products').select('*').order('created_at', { ascending: false }),
    supabase.from('product_variants').select('*'),
  ]);
  if (pErr) throw pErr;
  if (vErr) throw vErr;
  return ((products || []) as DbProduct[]).map((p) => mapProduct(p, (variants || []) as DbProductVariant[]));
}

export async function createProduct(input: {
  slug: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  sizes: string[];
  stock: number;
}): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      slug: input.slug,
      name: input.name,
      category: input.category,
      price: input.price,
      image: input.image,
      description: input.description,
      sizes: input.sizes,
      stock: input.stock,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapProduct(data as DbProduct, []);
}

function mapCustomer(c: DbPosCustomer): Customer {
  const avgOrder = c.orders_count > 0 ? Math.round(c.total_spend / c.orders_count) : 0;
  return {
    id: c.id,
    name: c.name,
    email: c.email || '',
    phone: c.phone,
    address: c.address || '',
    city: c.city || '',
    ordersCount: c.orders_count,
    totalSpend: c.total_spend,
    averageOrderValue: avgOrder,
    segment: c.total_spend > 40000 ? 'VIP' : c.orders_count > 0 ? 'ACTIVE' : 'NEW',
    createdAt: c.created_at.substring(0, 10),
  };
}

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from('pos_customers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return ((data || []) as DbPosCustomer[]).map(mapCustomer);
}

export async function createCustomer(input: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
}): Promise<Customer> {
  const { data, error } = await supabase
    .from('pos_customers')
    .insert({
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapCustomer(data as DbPosCustomer);
}

function mapStaff(s: DbPosStaff): StaffMember {
  return {
    id: s.id,
    name: s.display_name,
    email: '',
    role: s.role,
    status: s.is_active ? 'ACTIVE' : 'OFFLINE',
    permissions: [],
  };
}

export async function fetchStaff(): Promise<StaffMember[]> {
  const { data, error } = await supabase.from('pos_staff').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return ((data || []) as DbPosStaff[]).map(mapStaff);
}

function mapBillToOrder(bill: DbPosBill, items: DbPosBillItem[], customer: DbPosCustomer | undefined): Order {
  const orderItems: OrderItem[] = items
    .filter((i) => i.bill_id === bill.id)
    .map((i) => ({
      productId: i.product_slug,
      variantId: i.variant_id || i.product_slug,
      name: i.product_name,
      variantName: [i.color, i.size].filter(Boolean).join(' / '),
      size: i.size || '',
      color: i.color || '',
      quantity: i.qty,
      unitPrice: i.unit_price,
      total: i.line_total,
      itemDiscount: i.item_discount || undefined,
    }));

  return {
    id: bill.id,
    orderNumber: bill.bill_number,
    customerId: bill.pos_customer_id || 'guest',
    customerName: customer?.name || 'Walk-in Customer',
    customerEmail: customer?.email || '',
    customerPhone: customer?.phone || '',
    shippingAddress: {
      street: 'Studio Deny Flagship Store POS Register #01',
      city: customer?.city || 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      country: 'India',
    },
    items: orderItems,
    subtotal: bill.subtotal,
    discount: bill.discount,
    discountReason: bill.discount_reason || undefined,
    shippingFee: bill.shipping_fee,
    taxAmount: bill.tax_amount,
    grandTotal: bill.grand_total,
    paymentStatus: bill.payment_status,
    fulfillmentStatus: 'DELIVERED',
    paymentMethod: 'CASH',
    channel: 'OFFLINE',
    createdAt: bill.created_at.replace('T', ' ').substring(0, 19),
    timeline: [{ status: 'ORDER PLACED', time: bill.created_at.replace('T', ' ').substring(0, 19), note: 'Bill settled in Deny OS' }],
    notes: bill.notes || undefined,
  };
}

export async function fetchBills(): Promise<Order[]> {
  const [{ data: bills, error: bErr }, { data: items, error: iErr }, { data: customers, error: cErr }] =
    await Promise.all([
      supabase.from('pos_bills').select('*').order('created_at', { ascending: false }),
      supabase.from('pos_bill_items').select('*'),
      supabase.from('pos_customers').select('*'),
    ]);
  if (bErr) throw bErr;
  if (iErr) throw iErr;
  if (cErr) throw cErr;

  const customerById = new Map(((customers || []) as DbPosCustomer[]).map((c) => [c.id, c]));
  return ((bills || []) as DbPosBill[]).map((b) =>
    mapBillToOrder(b, (items || []) as DbPosBillItem[], b.pos_customer_id ? customerById.get(b.pos_customer_id) : undefined)
  );
}

export interface CheckoutItemInput {
  variantId: string | null;
  productSlug: string;
  productName: string;
  size: string | null;
  color: string | null;
  qty: number;
  unitPrice: number;
  itemDiscount: number;
}

export interface CheckoutPaymentInput {
  method: 'CASH' | 'UPI' | 'CARD' | 'OTHER';
  amount: number;
  tendered: number | null;
  changeAmount: number | null;
}

export async function checkout(input: {
  items: CheckoutItemInput[];
  customerId: string | null;
  staffId: string | null;
  discount: number;
  discountReason: string | null;
  taxAmount: number;
  shippingFee: number;
  payments: CheckoutPaymentInput[];
  notes: string | null;
}): Promise<Order> {
  const { data, error } = await supabase.rpc('pos_checkout', {
    p_items: input.items.map((i) => ({
      variant_id: i.variantId,
      product_slug: i.productSlug,
      product_name: i.productName,
      size: i.size,
      color: i.color,
      qty: i.qty,
      unit_price: i.unitPrice,
      item_discount: i.itemDiscount,
    })),
    p_customer_id: input.customerId,
    p_staff_id: input.staffId,
    p_discount: input.discount,
    p_discount_reason: input.discountReason,
    p_tax_amount: input.taxAmount,
    p_shipping_fee: input.shippingFee,
    p_payments: input.payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      tendered: p.tendered,
      change_amount: p.changeAmount,
    })),
    p_notes: input.notes,
  });
  if (error) throw error;

  const bill = data as DbPosBill;
  const { data: items, error: iErr } = await supabase.from('pos_bill_items').select('*').eq('bill_id', bill.id);
  if (iErr) throw iErr;

  let customer: DbPosCustomer | undefined;
  if (bill.pos_customer_id) {
    const { data: c } = await supabase.from('pos_customers').select('*').eq('id', bill.pos_customer_id).single();
    customer = c as DbPosCustomer;
  }

  return mapBillToOrder(bill, (items || []) as DbPosBillItem[], customer);
}

export async function adjustStock(
  variantId: string | null,
  productSlug: string,
  changeQty: number,
  reason: InventoryLog['reason'],
  staffId: string | null
): Promise<void> {
  const { error } = await supabase.rpc('pos_adjust_stock', {
    p_variant_id: variantId,
    p_product_slug: productSlug,
    p_change_qty: changeQty,
    p_reason: reason,
    p_staff_id: staffId,
    p_note: null,
  });
  if (error) throw error;
}

export async function fetchInventoryLogs(): Promise<InventoryLog[]> {
  const { data, error } = await supabase
    .from('pos_inventory_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return ((data || []) as DbPosInventoryLog[]).map((l) => ({
    id: l.id,
    date: l.created_at.replace('T', ' ').substring(0, 19),
    productId: l.product_slug,
    productName: l.product_slug,
    variantSku: l.variant_id || l.product_slug,
    changeQty: l.change_qty,
    newStock: l.new_stock,
    reason: l.reason,
    user: 'Deny OS Commerce Engine',
  }));
}

export async function fetchSettings(): Promise<CommerceSettings> {
  const [{ data: posSettings }, { data: invoiceSettings }, { data: brandSettings }] = await Promise.all([
    supabase.from('pos_settings').select('*').limit(1).maybeSingle(),
    supabase.from('invoice_settings').select('*').limit(1).maybeSingle(),
    supabase.from('brand_settings').select('*').limit(1).maybeSingle(),
  ]);

  const pos = posSettings as DbPosSettings | null;
  const invoice = invoiceSettings as DbInvoiceSettings | null;
  const brand = brandSettings as DbBrandSettings | null;

  return {
    storeName: brand?.site_name || 'STUDIO DENY',
    brand: invoice?.brand_name || 'STUDIO DENY',
    tagline: invoice?.tagline || '',
    address: invoice?.address || '',
    cityState: '',
    country: 'India',
    phone: invoice?.phone || brand?.contact_phone || '',
    email: invoice?.email || brand?.contact_email || '',
    website: 'studiodeny.com',
    gstin: invoice?.gstin || '',
    pan: '',
    invoicePrefix: pos?.invoice_prefix || 'SD',
    startingInvoiceNumber: 1000250,
    currency: pos?.currency || 'INR',
    taxRate: pos?.tax_rate || 0,
    shippingFlatRate: pos?.shipping_flat_rate || 0,
    freeShippingThreshold: pos?.free_shipping_threshold || 0,
    printer: {
      name: pos?.printer_name || 'Thermal POS-80',
      status: pos?.last_test_print ? 'ONLINE' : 'OFFLINE',
      connection: pos?.printer_connection || 'USB',
      lastTestPrint: pos?.last_test_print || undefined,
    },
  };
}

export async function saveSettings(updates: {
  taxRate?: number;
  shippingFlatRate?: number;
  freeShippingThreshold?: number;
  currency?: string;
  invoicePrefix?: string;
  printerName?: string;
  printerConnection?: 'WIFI' | 'USB' | 'ETHERNET';
}): Promise<void> {
  const { data: existing } = await supabase.from('pos_settings').select('id').limit(1).maybeSingle();
  const payload: Partial<DbPosSettings> = {
    tax_rate: updates.taxRate,
    shipping_flat_rate: updates.shippingFlatRate,
    free_shipping_threshold: updates.freeShippingThreshold,
    currency: updates.currency,
    invoice_prefix: updates.invoicePrefix,
    printer_name: updates.printerName,
    printer_connection: updates.printerConnection,
  };
  Object.keys(payload).forEach((k) => (payload as any)[k] === undefined && delete (payload as any)[k]);

  if (existing) {
    const { error } = await supabase.from('pos_settings').update(payload).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('pos_settings').insert(payload);
    if (error) throw error;
  }
}

export async function recordTestPrint(): Promise<void> {
  const { data: existing } = await supabase.from('pos_settings').select('id').limit(1).maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from('pos_settings')
      .update({ last_test_print: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('pos_settings').insert({ last_test_print: new Date().toISOString() });
    if (error) throw error;
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors in `src/api/pos.ts`. Fix any property-name mismatches against `src/types/index.ts` before moving on — do not loosen types with `any` to silence errors.

- [ ] **Step 3: Commit**

```bash
git add src/api/pos.ts
git commit -m "feat: add POS data access layer over Supabase"
```

---

### Task 8: Rewire `src/services/store.ts` to Supabase

**Files:**
- Modify: `src/services/store.ts`

**Interfaces:**
- Consumes: every export from `src/api/pos.ts` (Task 7) and `getCurrentStaff` from `src/api/auth.ts` (Task 6).
- Produces: same `store` object and `useStore()` hook shape as before, but `createOrder`, `adjustStock`, `addProduct`, `addCustomer`, `updateSettings`, `testPrint` now return `Promise`s. `loadInitialState` becomes `initStore()`, called once from `App.tsx`.

- [ ] **Step 1: Replace `loadInitialState`/module bootstrap (lines 44–90) with an async loader**

```typescript
import { useState, useEffect } from 'react';
import {
  Product, Collection, Order, Customer, ReturnRequest, PaymentTransaction,
  InventoryLog, StaffMember, CommerceSettings, ToastMessage, FulfillmentStatus,
  ReturnStatus,
} from '../types';
import { initialCollections, initialReturns, initialPayments } from '../data/mockData';
import * as posApi from '../api/pos';
import { getCurrentStaff } from '../api/auth';

export interface CommerceState {
  products: Product[];
  collections: Collection[];
  orders: Order[];
  customers: Customer[];
  returns: ReturnRequest[];
  payments: PaymentTransaction[];
  inventoryLogs: InventoryLog[];
  staff: StaffMember[];
  settings: CommerceSettings;
  toasts: ToastMessage[];
  ready: boolean;
}

let currentState: CommerceState = {
  products: [],
  collections: initialCollections,
  orders: [],
  customers: [],
  returns: initialReturns,
  payments: initialPayments,
  inventoryLogs: [],
  staff: [],
  settings: {
    storeName: 'STUDIO DENY', brand: 'STUDIO DENY', tagline: '', address: '', cityState: '',
    country: 'India', phone: '', email: '', website: 'studiodeny.com', gstin: '', pan: '',
    invoicePrefix: 'SD', startingInvoiceNumber: 1000250, currency: 'INR', taxRate: 0,
    shippingFlatRate: 0, freeShippingThreshold: 0,
    printer: { name: 'Thermal POS-80', status: 'OFFLINE', connection: 'USB' },
  },
  toasts: [],
  ready: false,
};
const listeners = new Set<(state: CommerceState) => void>();

function saveState(state: CommerceState) {
  currentState = state;
  listeners.forEach((listener) => listener(currentState));
}

let currentStaffId: string | null = null;

export async function initStore(): Promise<void> {
  const [products, customers, staff, settings] = await Promise.all([
    posApi.fetchProducts(),
    posApi.fetchCustomers(),
    posApi.fetchStaff(),
    posApi.fetchSettings(),
  ]);
  const [orders, inventoryLogs] = await Promise.all([posApi.fetchBills(), posApi.fetchInventoryLogs()]);

  const staffRecord = await getCurrentStaff();
  currentStaffId = staffRecord?.id || null;

  saveState({ ...currentState, products, customers, staff, settings, orders, inventoryLogs, ready: true });
}
```

- [ ] **Step 2: Replace `createOrder` (original lines 141–250) with an async version calling `posApi.checkout`**

```typescript
export const store = {
  getState: (): CommerceState => currentState,

  subscribe: (listener: (state: CommerceState) => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  addToast: (title: string, message?: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { id, title, message, type };
    saveState({ ...currentState, toasts: [...currentState.toasts, newToast] });
    setTimeout(() => store.removeToast(id), 4000);
  },

  removeToast: (id: string) => {
    saveState({ ...currentState, toasts: currentState.toasts.filter((t) => t.id !== id) });
  },

  createOrder: async (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'timeline'>): Promise<Order> => {
    const items = orderData.items.map((item) => {
      const product = currentState.products.find((p) => p.id === item.productId);
      const hasRealVariant = !!product?.variants.find((v) => v.id === item.variantId && v.id !== product.id);
      return {
        variantId: hasRealVariant ? item.variantId : null,
        productSlug: item.productId,
        productName: item.name,
        size: item.size || null,
        color: item.color || null,
        qty: item.quantity,
        unitPrice: item.unitPrice,
        itemDiscount: item.itemDiscount || 0,
      };
    });

    const payments = (orderData.paymentSplits && orderData.paymentSplits.length > 0
      ? orderData.paymentSplits
      : [{ method: orderData.paymentMethod, amount: orderData.grandTotal, tendered: orderData.tenderedAmount, change: orderData.changeAmount } as PaymentSplitLike]
    ).map((p) => ({
      method: (p.method === 'COD' || p.method === 'BANK' || p.method === 'SPLIT' ? 'OTHER' : p.method) as 'CASH' | 'UPI' | 'CARD' | 'OTHER',
      amount: p.amount,
      tendered: p.tendered ?? null,
      changeAmount: p.change ?? null,
    }));

    const newOrder = await posApi.checkout({
      items,
      customerId: orderData.customerId === 'guest' ? null : orderData.customerId,
      staffId: currentStaffId,
      discount: orderData.discount,
      discountReason: orderData.discountReason || null,
      taxAmount: orderData.taxAmount,
      shippingFee: orderData.shippingFee,
      payments,
      notes: orderData.notes || null,
    });

    const [products, customers, inventoryLogs] = await Promise.all([
      posApi.fetchProducts(),
      posApi.fetchCustomers(),
      posApi.fetchInventoryLogs(),
    ]);

    saveState({
      ...currentState,
      orders: [newOrder, ...currentState.orders],
      products,
      customers,
      inventoryLogs,
    });

    store.addToast('Bill Settled', `Invoice ${newOrder.orderNumber} settled for ₹${newOrder.grandTotal.toLocaleString('en-IN')}.`, 'success');
    return newOrder;
  },
```

Add this helper type near the top of the file, below the imports:

```typescript
interface PaymentSplitLike {
  method: string;
  amount: number;
  tendered?: number;
  change?: number;
}
```

- [ ] **Step 3: Replace `updateFulfillmentStatus`, `adjustStock`, `addProduct`, `addCustomer`, `updateReturnStatus`, `createReturnRequest`, `updateSettings`, `testPrint`, `resetToDefaults`**

```typescript
  updateFulfillmentStatus: (orderId: string, status: FulfillmentStatus, courierName?: string, trackingNumber?: string) => {
    const order = currentState.orders.find((o) => o.id === orderId);
    if (!order) return;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updatedOrders = currentState.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            fulfillmentStatus: status,
            courierName: courierName || o.courierName,
            trackingNumber: trackingNumber || o.trackingNumber,
            timeline: [...o.timeline, { status, time: now, note: trackingNumber ? `Tracking: ${trackingNumber} (${courierName})` : `Updated to [${status}]` }],
          }
        : o
    );
    saveState({ ...currentState, orders: updatedOrders });
    store.addToast('Fulfillment Updated', `${order.orderNumber} is now [${status}].`, 'info');
  },

  adjustStock: async (productId: string, variantId: string, changeQty: number, reason: InventoryLog['reason'] = 'ADJUSTMENT') => {
    const product = currentState.products.find((p) => p.id === productId);
    if (!product) return;
    const variant = product.variants.find((v) => v.id === variantId);
    const isRealVariant = variant && variant.id !== product.id;

    await posApi.adjustStock(isRealVariant ? variantId : null, productId, changeQty, reason, currentStaffId);

    const [products, inventoryLogs] = await Promise.all([posApi.fetchProducts(), posApi.fetchInventoryLogs()]);
    saveState({ ...currentState, products, inventoryLogs });
    store.addToast('Stock Adjusted', `${variant?.sku || productId}: updated.`, 'info');
  },

  addProduct: async (productData: Omit<Product, 'id' | 'totalStock'>): Promise<Product> => {
    const slug = productData.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newProduct = await posApi.createProduct({
      slug,
      name: productData.name,
      category: productData.category,
      price: productData.price,
      image: productData.image,
      description: productData.description,
      sizes: productData.sizes,
      stock: productData.totalStock ?? productData.variants.reduce((sum, v) => sum + v.stock, 0),
    });
    const products = await posApi.fetchProducts();
    saveState({ ...currentState, products });
    store.addToast('Product Created', `${newProduct.name} (${newProduct.sku}) added to catalog.`, 'success');
    return newProduct;
  },

  updateProduct: (id: string, updates: Partial<Product>) => {
    const updatedProducts = currentState.products.map((p) => (p.id === id ? { ...p, ...updates } : p));
    saveState({ ...currentState, products: updatedProducts });
    store.addToast('Product Saved', 'Catalog changes updated.', 'info');
  },

  addCustomer: async (cust: Omit<Customer, 'id' | 'ordersCount' | 'totalSpend' | 'averageOrderValue' | 'createdAt'>): Promise<Customer> => {
    const newCustomer = await posApi.createCustomer({
      name: cust.name,
      phone: cust.phone,
      email: cust.email,
      address: cust.address,
      city: cust.city,
    });
    const customers = await posApi.fetchCustomers();
    saveState({ ...currentState, customers });
    store.addToast('Customer Created', `${newCustomer.name} added to CRM.`, 'success');
    return newCustomer;
  },

  updateReturnStatus: (returnId: string, status: ReturnStatus) => {
    const ret = currentState.returns.find((r) => r.id === returnId);
    if (!ret) return;
    const updatedReturns = currentState.returns.map((r) => (r.id === returnId ? { ...r, status } : r));
    let updatedPayments = currentState.payments;
    if (status === 'REFUNDED') {
      updatedPayments = [
        {
          id: `ref-${Date.now()}`,
          transactionRef: `RFND-${ret.returnNumber}`,
          orderId: ret.orderId,
          orderNumber: ret.orderNumber,
          customerName: ret.customerName,
          amount: ret.refundAmount,
          method: 'UPI',
          status: 'REFUNDED',
          date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        },
        ...currentState.payments,
      ];
    }
    saveState({ ...currentState, returns: updatedReturns, payments: updatedPayments });
    store.addToast('Return Updated', `${ret.returnNumber} marked as [${status}].`, 'info');
  },

  createReturnRequest: (data: Omit<ReturnRequest, 'id' | 'returnNumber' | 'createdAt' | 'status'>): ReturnRequest => {
    const returnNumber = `SD-RET-${currentState.returns.length + 404}`;
    const newReturn: ReturnRequest = { ...data, id: `ret-${Date.now()}`, returnNumber, status: 'REQUESTED', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19) };
    saveState({ ...currentState, returns: [newReturn, ...currentState.returns] });
    store.addToast('Return Request Initiated', `${returnNumber} created for ${data.customerName}.`, 'info');
    return newReturn;
  },

  updateSettings: async (updates: Partial<CommerceSettings>) => {
    await posApi.saveSettings({
      taxRate: updates.taxRate,
      shippingFlatRate: updates.shippingFlatRate,
      freeShippingThreshold: updates.freeShippingThreshold,
      currency: updates.currency,
      invoicePrefix: updates.invoicePrefix,
      printerName: updates.printer?.name,
      printerConnection: updates.printer?.connection,
    });
    const settings = await posApi.fetchSettings();
    saveState({ ...currentState, settings });
    store.addToast('Settings Saved', 'Commerce operating system configuration updated.', 'success');
  },

  testPrint: async () => {
    await posApi.recordTestPrint();
    const settings = await posApi.fetchSettings();
    saveState({ ...currentState, settings });
    store.addToast('Printer Test Successful', 'Receipt printed on Thermal POS-80 & Brother Laser.', 'success');
  },
};

export function useStore(): CommerceState {
  const [state, setState] = useState<CommerceState>(store.getState());
  useEffect(() => {
    const unsubscribe = store.subscribe(setState);
    return unsubscribe;
  }, []);
  return state;
}
```

Note: `resetToDefaults` (old lines 123–138) is dropped — it existed to reset localStorage mock data, which no longer applies once the source of truth is Supabase.

- [ ] **Step 4: Call `initStore()` once at app startup**

In `src/App.tsx`, inside `RequireAuth` (Task 6, Step 3), call it when `status` transitions to `'authed'`:

```typescript
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setStatus(data.session ? 'authed' : 'anon');
  });
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    setStatus(session ? 'authed' : 'anon');
  });
  return () => sub.subscription.unsubscribe();
}, []);

useEffect(() => {
  if (status === 'authed') {
    import('./services/store').then(({ initStore }) => initStore());
  }
}, [status]);
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -b --noEmit`
Expected: errors now surface at every call site still treating `createOrder`/`addCustomer`/`adjustStock`/`addProduct`/`updateSettings`/`testPrint` as synchronous — that's expected and is fixed in Task 9.

- [ ] **Step 6: Commit**

```bash
git add src/services/store.ts src/App.tsx
git commit -m "feat: back the commerce store with Supabase instead of localStorage mocks"
```

---

### Task 9: Fix async call sites

**Files:**
- Modify: `src/pages/billing/PosBillingPage.tsx:300-314,390-410` (approximate — locate via the `store.addCustomer(` and `store.createOrder(` calls)
- Modify: `src/pages/products/ProductsPage.tsx:59`
- Modify: `src/pages/products/ProductDetailPage.tsx:79,355,362`
- Modify: `src/components/common/QuickNewModal.tsx:69,115`
- Modify: `src/pages/settings/SettingsPage.tsx:53,72`

- [ ] **Step 1: `PosBillingPage.tsx` — `handleQuickAddCustomer`**

Change the function to `async` and `await` the call:

```typescript
const handleQuickAddCustomer = async () => {
    if (!newCustName.trim() || !newCustPhone.trim()) {
      store.addToast('Validation', 'Customer Name and Phone are required.', 'error');
      return;
    }

    const created = await store.addCustomer({
      name: newCustName.trim(),
      email: `${newCustName.toLowerCase().replace(/\s+/g, '')}@patron.studiodeny.com`,
      phone: newCustPhone.trim(),
      address: 'Studio Deny In-Store Counter',
      city: 'Mumbai',
      segment: 'NEW',
    });

    setSelectedCustomerId(created.id);
    setIsGuest(false);
    setIsAddingCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
  };
```

(Find the enclosing function's declaration line above line 295 and add `async` there; the exact surrounding line depends on the current arrow-function signature — locate it with `grep -n "handleQuickAddCustomer" src/pages/billing/PosBillingPage.tsx` before editing.)

- [ ] **Step 2: `PosBillingPage.tsx` — checkout handler**

The `setTimeout(() => { const savedBill = store.createOrder({...}) ... }, ...)` block (around line 390) must become:

```typescript
    setTimeout(async () => {
      // 1. TRANSACTION SAVED BEFORE ATTEMPTING PRINT (Critical Requirement)
      try {
        const savedBill = await store.createOrder({
          customerId: isGuest ? 'guest' : selectedCustomerId,
          customerName,
          customerEmail,
          customerPhone,
          channel: 'OFFLINE',
          shippingAddress: {
            street: 'Studio Deny Flagship Store POS Register #01',
            city: customerCity,
            state: 'Maharashtra',
            pincode: '400050',
            country: 'India',
          },
          items: orderItems,
          subtotal: grossSubtotal,
          discount: totalDiscountAmount,
          // ...(keep every other field from the existing call unchanged)
        });
        // ...(keep the existing post-save print/reset logic, now reading `savedBill`)
      } catch (err) {
        store.addToast('Checkout Failed', err instanceof Error ? err.message : 'Could not save this bill.', 'error');
      }
    }, /* keep existing delay */);
```

Read the full existing block first (`grep -n "TRANSACTION SAVED" -A 60 src/pages/billing/PosBillingPage.tsx`) and preserve every field and every line after `store.createOrder(...)` (receipt printing, state resets) exactly as-is inside the new `try` block — only the function signature (`async`), the `await`, and the wrapping `try`/`catch` are new. This is the highest-stakes call site (real money, real stock) — do not change checkout math while doing this, only the sync-to-async mechanics.

- [ ] **Step 3: `ProductsPage.tsx:59`**

Locate the enclosing handler (`grep -n "const newProd = store.addProduct" -B 5 src/pages/products/ProductsPage.tsx`), mark it `async`, and change to `const newProd = await store.addProduct({...})`.

- [ ] **Step 4: `ProductDetailPage.tsx:79,355,362`**

Line 79's enclosing handler: mark `async`, change to `await store.adjustStock(product.id, adjustingVariantId, finalQty, adjustReason);`.

Lines 355 and 362 are inline `onClick={() => store.adjustStock(product.id, v.id, -1, 'ADJUSTMENT')}` / `onClick={() => store.adjustStock(product.id, v.id, 1, 'RESTOCK')}` — these don't need to block the UI on the promise (the store's listener-driven `useStore()` re-render already picks up the result once it resolves), so leave them as fire-and-forget but silence the floating-promise lint warning explicitly:

```typescript
onClick={() => { void store.adjustStock(product.id, v.id, -1, 'ADJUSTMENT'); }}
```
```typescript
onClick={() => { void store.adjustStock(product.id, v.id, 1, 'RESTOCK'); }}
```

- [ ] **Step 5: `QuickNewModal.tsx:69,115`**

Same pattern as Steps 3–4: locate each enclosing handler with `grep -n "store.addProduct\|store.adjustStock" -B 5 src/components/common/QuickNewModal.tsx`, mark `async`, `await` the calls that consume a return value (`addProduct`), and `void`-wrap fire-and-forget ones (`adjustStock`) if any exist without consuming the result.

- [ ] **Step 6: `SettingsPage.tsx:53,72`**

Locate the enclosing handlers for `store.updateSettings({...})` (line 53) and `store.testPrint()` (line 72) with `grep -n "updateSettings\|testPrint" -B 5 src/pages/settings/SettingsPage.tsx`, mark them `async`, and `await` both calls.

- [ ] **Step 7: Type-check and lint — must be clean now**

Run: `npx tsc -b --noEmit`
Run: `npm run lint`
Expected: zero errors. Every `store.createOrder`/`addCustomer`/`adjustStock`/`addProduct`/`updateSettings`/`testPrint` call site is now either `await`ed inside an `async` function or explicitly `void`-wrapped.

- [ ] **Step 8: Full build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 9: Commit**

```bash
git add src/pages/billing/PosBillingPage.tsx src/pages/products/ProductsPage.tsx src/pages/products/ProductDetailPage.tsx src/components/common/QuickNewModal.tsx src/pages/settings/SettingsPage.tsx
git commit -m "fix: adapt call sites to the now-async commerce store"
```

---

### Task 10: End-to-end smoke test against the live database

**Files:** none (manual verification only)

- [ ] **Step 1: Confirm at least one real staff account exists**

Ask the user to confirm they've run the Task 4 Step 5 snippet for at least one real email, or run it together now if they're ready.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`

- [ ] **Step 3: Sign in**

Open the app, sign in with the real staff email/password created in Step 1. Confirm redirect to `/dashboard` and that the toast shows the correct `display_name`.

- [ ] **Step 4: Verify shared catalog**

Open `/products`. Confirm the list matches the 18 products seen on studiodeny.com (same names, same images, same live stock counts) — this is the actual proof the inventory is shared, not mocked.

- [ ] **Step 5: Run one real low-value test sale, then verify and account for it**

At `/billing/new`, ring up 1 unit of a real low-price product as a guest, pay CASH, complete the sale. Confirm:
- A toast confirms `Bill Settled` with a `SD-1000250`-style number.
- `/bills` shows the new bill.
- `/products` shows that product's stock reduced by exactly 1.
- In the Supabase dashboard (or a read-only query), confirm the corresponding `product_variants.stock` or `products.stock` row actually decremented, and a `pos_inventory_logs` row with `reason = 'SALE'` exists.

This is a real transaction against the production database (unlike Task 4 Step 4's rolled-back check) — tell the user beforehand and ask them to either accept the 1-unit stock decrement as real or immediately reverse it afterward with a manual `RESTOCK` adjustment via `/products/:id`.

- [ ] **Step 6: Report results to the user**

Summarize what was verified end-to-end and flag anything that didn't behave as expected.
