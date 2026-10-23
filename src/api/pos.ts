import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from './fetchAll';
import {
  Product,
  ProductVariant,
  Collection,
  Customer,
  StaffMember,
  Order,
  OrderItem,
  CommerceSettings,
  InventoryLog,
  PaymentTransaction,
  ReturnRequest,
  ReturnStatus,
} from '../types';
import { normalizeGstin } from '../utils/gstin';
import { variantLabel } from '../utils/singleItem';
import { toIstDateTime } from '../utils/formatters';
import {
  DbProduct,
  DbProductVariant,
  DbCategory,
  DbProductCategory,
  DbPosCustomer,
  DbPosStaff,
  DbPosBill,
  DbPosBillItem,
  DbPosInventoryLog,
  DbPosReturn,
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

// Website categories that say who a product is for, not what it is.
const AUDIENCE_CATEGORY_SLUGS = new Set(['men', 'women', 'plus-sizes']);

function mapProduct(
  p: DbProduct,
  variants: DbProductVariant[],
  categoryName: string | undefined,
  categoryNames: string[]
): Product {
  // Only real colour x size rows are sellable; a product without any is
  // flagged instead of being sold against one overall stock number.
  const ownVariants = variants.filter((v) => v.product_id === p.slug);
  const mappedVariants: ProductVariant[] = ownVariants.map(mapVariant);

  // The real category taxonomy lives in categories/product_categories (what
  // the website admin manages); products.category is a legacy flat field
  // that can drift out of sync or be missing entirely - prefer the real one.
  const realCategory = categoryName || p.category;

  return {
    id: p.slug,
    name: p.name,
    sku: p.slug,
    collection: realCategory,
    category: realCategory,
    categories: Array.from(new Set([realCategory, ...categoryNames].filter(Boolean))),
    price: p.price,
    compareAtPrice: p.compare_at ?? undefined,
    sizes: p.sizes || [],
    colors: (p.colors || []).map((c) => c.name),
    variants: mappedVariants,
    totalStock: ownVariants.reduce((s, v) => s + v.stock, 0),
    needsSizeCounts: ownVariants.length === 0,
    status: p.is_active ? 'ACTIVE' : 'ARCHIVED',
    image: p.image,
    description: p.description,
    tags: [],
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const [
    { data: products, error: pErr },
    { data: variants, error: vErr },
    { data: productCategories, error: pcErr },
    { data: categories, error: catErr },
  ] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase.from('products').select('*').order('created_at', { ascending: false }).order('slug').range(from, to)
    ),
    fetchAllRows((from, to) => supabase.from('product_variants').select('*').order('id').range(from, to)),
    fetchAllRows((from, to) =>
      supabase.from('product_categories').select('*').order('product_slug').order('category_id').range(from, to)
    ),
    fetchAllRows((from, to) => supabase.from('categories').select('*').order('id').range(from, to)),
  ]);
  if (pErr) throw new Error(pErr.message);
  if (vErr) throw new Error(vErr.message);
  if (pcErr) throw new Error(pcErr.message);
  if (catErr) throw new Error(catErr.message);

  const categoryById = new Map(((categories || []) as DbCategory[]).map((c) => [c.id, c]));
  // product_categories is the product's full membership list (e.g. men,
  // Hoodies, women); products.category_id is the one it's shown under.
  const memberIdsBySlug = new Map<string, string[]>();
  ((productCategories || []) as DbProductCategory[]).forEach((pc) => {
    const ids = memberIdsBySlug.get(pc.product_slug) || [];
    ids.push(pc.category_id);
    memberIdsBySlug.set(pc.product_slug, ids);
  });

  // A category plus its parents, so picking a parent (Jeans) also lists
  // products filed under its subcategories (Baggy Fit), as on the website.
  const withParents = (id: string): string[] => {
    const names: string[] = [];
    const seen = new Set<string>();
    for (let c = categoryById.get(id); c && !seen.has(c.id); c = c.parent_id ? categoryById.get(c.parent_id) : undefined) {
      seen.add(c.id);
      names.push(c.name);
    }
    return names;
  };

  // The main category is what the product is (Hoodies), not who it's for:
  // the website's primary one unless it is an audience group (men, women),
  // then any linked type, and an audience group only when nothing else is.
  const isType = (id: string) => {
    const c = categoryById.get(id);
    return !!c && !AUDIENCE_CATEGORY_SLUGS.has(c.slug.toLowerCase());
  };

  return ((products || []) as DbProduct[]).map((p) => {
    const memberIds = memberIdsBySlug.get(p.slug) || [];
    const candidateIds = [...(p.category_id ? [p.category_id] : []), ...memberIds];
    const mainId = candidateIds.find(isType) ?? candidateIds.find((id) => categoryById.has(id));
    const mainName = mainId ? categoryById.get(mainId)!.name : undefined;
    const allNames = candidateIds.flatMap(withParents);
    return mapProduct(p, (variants || []) as DbProductVariant[], mainName, allNames);
  });
}

export async function updateProduct(
  slug: string,
  updates: { name?: string; price?: number; description?: string }
): Promise<void> {
  const payload: Record<string, unknown> = {
    name: updates.name,
    price: updates.price,
    description: updates.description,
  };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const { error } = await supabase.from('products').update(payload).eq('slug', slug);
  if (error) throw new Error(error.message);
}

export async function fetchCategories(): Promise<{ id: string; name: string; slug: string; parentId: string | null }[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data || []) as DbCategory[]).map((c) => ({ id: c.id, name: c.name, slug: c.slug, parentId: c.parent_id }));
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
    gstin: c.gstin || undefined,
    ordersCount: c.orders_count,
    totalSpend: c.total_spend,
    averageOrderValue: avgOrder,
    segment: c.total_spend > 40000 ? 'VIP' : c.orders_count > 0 ? 'ACTIVE' : 'NEW',
    createdAt: toIstDateTime(c.created_at).substring(0, 10),
  };
}

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await fetchAllRows((from, to) =>
    supabase.from('pos_customers').select('*').order('created_at', { ascending: false }).order('id').range(from, to)
  );
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
  return mapCustomer(data as DbPosCustomer);
}

export async function updateCustomer(
  id: string,
  updates: { name?: string; phone?: string; email?: string; address?: string; city?: string; gstin?: string }
): Promise<void> {
  const payload: Record<string, unknown> = {
    name: updates.name,
    phone: updates.phone,
    email: updates.email,
    address: updates.address,
    city: updates.city,
    // '' clears a saved GSTIN; undefined leaves it alone.
    gstin: updates.gstin === undefined ? undefined : updates.gstin ? normalizeGstin(updates.gstin) : null,
  };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const { error } = await supabase.from('pos_customers').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
}

function mapStaff(s: DbPosStaff): StaffMember {
  return {
    id: s.id,
    name: s.display_name,
    email: '',
    role: s.role,
    status: s.is_active ? 'ACTIVE' : 'OFFLINE',
    permissions: s.permissions || [],
  };
}

export async function fetchStaff(): Promise<StaffMember[]> {
  const { data, error } = await fetchAllRows((from, to) =>
    supabase.from('pos_staff').select('*').order('created_at', { ascending: true }).order('id').range(from, to)
  );
  if (error) throw new Error(error.message);
  return ((data || []) as DbPosStaff[]).map(mapStaff);
}

export async function createStaffAccount(input: {
  displayName: string;
  email: string;
  password: string;
  role: 'OWNER' | 'MANAGER' | 'BILLING' | 'FULFILLMENT';
  permissions: string[];
  dbRole: 'admin' | 'staff';
}): Promise<StaffMember> {
  // A brand-new login must never be created on the app's main client — that
  // would replace the admin's own active session with the new user's session.
  // A throwaway client (same project, publishable key only) creates the auth
  // account in isolation; the admin's session (on `supabase`) is untouched.
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const provisioning = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: signUpData, error: signUpError } = await provisioning.auth.signUp({
    email: input.email,
    password: input.password,
  });
  if (signUpError) throw new Error(signUpError.message);
  if (!signUpData.user) throw new Error('Account creation did not return a user.');

  const newUserId = signUpData.user.id;

  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({ user_id: newUserId, role: input.dbRole });
  if (roleError) throw new Error(roleError.message);

  const { data: staffRow, error: staffError } = await supabase
    .from('pos_staff')
    .insert({
      user_id: newUserId,
      display_name: input.displayName,
      role: input.role,
      permissions: input.permissions,
      is_active: true,
    })
    .select('*')
    .single();
  if (staffError) throw new Error(staffError.message);

  return mapStaff(staffRow as DbPosStaff);
}

export async function updateStaffPermissions(
  staffId: string,
  updates: { role?: 'OWNER' | 'MANAGER' | 'BILLING' | 'FULFILLMENT'; permissions?: string[]; isActive?: boolean }
): Promise<void> {
  const payload: Record<string, unknown> = {
    role: updates.role,
    permissions: updates.permissions,
    is_active: updates.isActive,
  };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const { error } = await supabase.from('pos_staff').update(payload).eq('id', staffId);
  if (error) throw new Error(error.message);
}

function mapBillToOrder(
  bill: DbPosBill,
  items: DbPosBillItem[],
  customer: DbPosCustomer | undefined,
  staffName?: string
): Order {
  const orderItems: OrderItem[] = items
    .filter((i) => i.bill_id === bill.id)
    .map((i) => ({
      id: i.id,
      productId: i.product_slug,
      variantId: i.variant_id || i.product_slug,
      name: i.product_name,
      variantName: variantLabel(i.size, i.color),
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
    customerGstin: bill.customer_gstin || undefined,
    shippingAddress: {
      street: 'Studio Deny Flagship Store POS Register #01',
      city: customer?.city || 'Visakhapatnam',
      state: 'Andhra Pradesh',
      pincode: '530017',
      country: 'India',
    },
    items: orderItems,
    subtotal: bill.subtotal,
    discount: bill.discount,
    discountReason: bill.discount_reason || undefined,
    shippingFee: bill.shipping_fee,
    taxAmount: bill.tax_amount,
    taxRate: bill.tax_rate,
    taxIsCustom: bill.tax_is_custom,
    grandTotal: bill.grand_total,
    paymentStatus: bill.payment_status,
    fulfillmentStatus: 'DELIVERED',
    paymentMethod: 'CASH',
    channel: 'OFFLINE',
    createdAt: toIstDateTime(bill.created_at),
    timeline: [
      { status: 'ORDER PLACED', time: toIstDateTime(bill.created_at), note: 'Bill settled in Deny OS' },
    ],
    notes: bill.notes || undefined,
    billStatus: bill.status,
    staffId: bill.staff_id || undefined,
    staffName,
  };
}

export async function fetchBills(): Promise<Order[]> {
  const [
    { data: bills, error: bErr },
    { data: items, error: iErr },
    { data: customers, error: cErr },
    { data: staffRows, error: sErr },
  ] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase.from('pos_bills').select('*').order('created_at', { ascending: false }).order('id').range(from, to)
    ),
    fetchAllRows((from, to) => supabase.from('pos_bill_items').select('*').order('id').range(from, to)),
    fetchAllRows((from, to) => supabase.from('pos_customers').select('*').order('id').range(from, to)),
    fetchAllRows((from, to) => supabase.from('pos_staff').select('*').order('id').range(from, to)),
  ]);
  if (bErr) throw new Error(bErr.message);
  if (iErr) throw new Error(iErr.message);
  if (cErr) throw new Error(cErr.message);
  if (sErr) throw new Error(sErr.message);

  const customerById = new Map(((customers || []) as DbPosCustomer[]).map((c) => [c.id, c]));
  const staffNameById = new Map(((staffRows || []) as DbPosStaff[]).map((s) => [s.id, s.display_name]));
  // Group items by bill once — filtering every item for every bill gets slow with thousands of bills.
  const itemsByBill = new Map<string, DbPosBillItem[]>();
  for (const i of (items || []) as DbPosBillItem[]) {
    const list = itemsByBill.get(i.bill_id);
    if (list) list.push(i);
    else itemsByBill.set(i.bill_id, [i]);
  }
  return ((bills || []) as DbPosBill[]).map((b) =>
    mapBillToOrder(
      b,
      itemsByBill.get(b.id) ?? [],
      b.pos_customer_id ? customerById.get(b.pos_customer_id) : undefined,
      b.staff_id ? staffNameById.get(b.staff_id) : undefined
    )
  );
}

interface DbWebsiteOrder {
  id: string;
  order_number: string;
  user_email: string;
  items: { name?: string; slug?: string; size?: string; color?: string; qty?: number; price?: number }[];
  subtotal: number;
  shipping: number;
  tax_rate: number;
  tax: number;
  discount: number;
  coupon_discount: number | null;
  coupon_code: string | null;
  total: number;
  status: string;
  address: { name?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string } | null;
  payment_method: string;
  notes: string | null;
  created_at: string;
  delivered_at: string | null;
  fulfillment?: 'delivery' | 'pickup';
  collected_at?: string | null;
}

// Website orders shown as the ONLINE channel - the same set the monthly
// report counts: delivered orders, plus store pickups (paid in full online,
// they stay PLACED and never reach DELIVERED). Read-only here: these are not
// POS bills, so they are kept out of `orders` and never voided or edited.
export async function fetchOnlineOrders(): Promise<Order[]> {
  const { data, error } = await fetchAllRows((from, to) =>
    supabase
      .from('orders')
      .select(
        'id, order_number, user_email, items, subtotal, shipping, tax_rate, tax, discount, coupon_discount, coupon_code, total, status, address, payment_method, notes, created_at, delivered_at, fulfillment, collected_at'
      )
      .or('status.eq.DELIVERED,and(fulfillment.eq.pickup,status.not.in.(CANCELLED,REFUNDED))')
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, to)
  );
  if (error) throw new Error(error.message);

  return ((data || []) as DbWebsiteOrder[]).map((o) => {
    const storePickup = o.fulfillment === 'pickup';
    const addr = o.address || {};
    const handedOver = (storePickup ? o.collected_at : o.delivered_at) || o.created_at;
    const items: OrderItem[] = (Array.isArray(o.items) ? o.items : []).map((i, idx) => {
      const qty = Number(i.qty) || 0;
      const price = Number(i.price) || 0;
      return {
        id: `${o.id}-${idx}`,
        productId: i.slug || '',
        variantId: i.slug || '',
        name: i.name || i.slug || 'Item',
        variantName: variantLabel(i.size || null, i.color || null),
        size: i.size || '',
        color: i.color || '',
        quantity: qty,
        unitPrice: price,
        total: qty * price,
      };
    });
    return {
      id: o.id,
      orderNumber: o.order_number,
      customerId: 'web',
      customerName: addr.name || o.user_email,
      customerEmail: o.user_email,
      customerPhone: addr.phone || '',
      shippingAddress: {
        street: [addr.line1, addr.line2].filter(Boolean).join(', '),
        city: addr.city || '',
        state: addr.state || '',
        pincode: addr.pincode || '',
        country: 'India',
      },
      items,
      subtotal: Number(o.subtotal) || 0,
      discount: (Number(o.discount) || 0) + (Number(o.coupon_discount) || 0),
      discountReason: o.coupon_code || undefined,
      shippingFee: Number(o.shipping) || 0,
      taxAmount: Number(o.tax) || 0,
      taxRate: Number(o.tax_rate) || 0,
      grandTotal: Number(o.total) || 0,
      paymentStatus: 'PAID',
      fulfillmentStatus: storePickup && !o.collected_at ? 'UNFULFILLED' : 'DELIVERED',
      paymentMethod: o.payment_method === 'cod' ? 'COD' : 'RAZORPAY',
      channel: 'ONLINE',
      storePickup,
      createdAt: toIstDateTime(handedOver),
      timeline: [{ status: 'ORDER PLACED', time: toIstDateTime(o.created_at), note: 'Website order' }],
      notes: o.notes || undefined,
    };
  });
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
  // Bill-level discount only; item discounts travel on each item.
  discount: number;
  discountReason: string | null;
  // null = GST slab computed by the database; a number = OWNER-only override %.
  customTaxRate: number | null;
  shippingFee: number;
  payments: CheckoutPaymentInput[];
  notes: string | null;
  // Only sent when "ADD CUSTOMER GST" is on; the database also saves it on
  // the registered customer.
  customerGstin: string | null;
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
    p_custom_tax_rate: input.customTaxRate,
    p_shipping_fee: input.shippingFee,
    p_payments: input.payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      tendered: p.tendered,
      change_amount: p.changeAmount,
    })),
    p_notes: input.notes,
    // Omitted (not null) when off, so terminals keep working against a
    // database that has not had migration 0009 applied yet.
    ...(input.customerGstin ? { p_customer_gstin: normalizeGstin(input.customerGstin) } : {}),
  });
  if (error) throw new Error(error.message);

  const bill = data as DbPosBill;
  const { data: items, error: iErr } = await supabase.from('pos_bill_items').select('*').eq('bill_id', bill.id);
  if (iErr) throw new Error(iErr.message);

  let customer: DbPosCustomer | undefined;
  if (bill.pos_customer_id) {
    const { data: c } = await supabase.from('pos_customers').select('*').eq('id', bill.pos_customer_id).single();
    customer = c as DbPosCustomer;
  }
  const staffName = await fetchStaffName(bill.staff_id);

  return mapBillToOrder(bill, (items || []) as DbPosBillItem[], customer, staffName);
}

async function fetchStaffName(staffId: string | null): Promise<string | undefined> {
  if (!staffId) return undefined;
  const { data } = await supabase.from('pos_staff').select('display_name').eq('id', staffId).maybeSingle();
  return data?.display_name || undefined;
}

async function fetchOrderByBillId(billId: string): Promise<Order> {
  const [{ data: bill, error: bErr }, { data: items, error: iErr }] = await Promise.all([
    supabase.from('pos_bills').select('*').eq('id', billId).single(),
    supabase.from('pos_bill_items').select('*').eq('bill_id', billId),
  ]);
  if (bErr) throw new Error(bErr.message);
  if (iErr) throw new Error(iErr.message);

  let customer: DbPosCustomer | undefined;
  if (bill.pos_customer_id) {
    const { data: c } = await supabase.from('pos_customers').select('*').eq('id', bill.pos_customer_id).single();
    customer = c as DbPosCustomer;
  }
  const staffName = await fetchStaffName(bill.staff_id);

  return mapBillToOrder(bill as DbPosBill, (items || []) as DbPosBillItem[], customer, staffName);
}

export async function voidBill(billId: string, staffId: string | null, reason: string): Promise<Order> {
  const { error } = await supabase.rpc('pos_void_bill', {
    p_bill_id: billId,
    p_staff_id: staffId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  return fetchOrderByBillId(billId);
}

export async function editBill(input: {
  billId: string;
  items: CheckoutItemInput[];
  discount: number;
  discountReason: string | null;
  customTaxRate: number | null;
  shippingFee: number;
  notes: string | null;
  editorStaffId: string | null;
}): Promise<Order> {
  const { error } = await supabase.rpc('pos_edit_bill', {
    p_bill_id: input.billId,
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
    p_discount: input.discount,
    p_discount_reason: input.discountReason,
    p_custom_tax_rate: input.customTaxRate,
    p_shipping_fee: input.shippingFee,
    p_notes: input.notes,
    p_editor_staff_id: input.editorStaffId,
  });
  if (error) throw new Error(error.message);
  return fetchOrderByBillId(input.billId);
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
  if (error) throw new Error(error.message);
}

export async function fetchInventoryLogs(): Promise<InventoryLog[]> {
  const { data, error } = await supabase
    .from('pos_inventory_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return ((data || []) as DbPosInventoryLog[]).map((l) => ({
    id: l.id,
    date: toIstDateTime(l.created_at),
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
    taxThreshold: pos?.tax_threshold ?? 2599,
    taxRateLow: pos?.tax_rate_low ?? 5,
    taxRateHigh: pos?.tax_rate_high ?? 18,
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
  taxThreshold?: number;
  taxRateLow?: number;
  taxRateHigh?: number;
  shippingFlatRate?: number;
  freeShippingThreshold?: number;
  currency?: string;
  invoicePrefix?: string;
  printerName?: string;
  printerConnection?: 'WIFI' | 'USB' | 'ETHERNET';
}): Promise<void> {
  const { data: existing } = await supabase.from('pos_settings').select('id').limit(1).maybeSingle();
  const payload: Record<string, unknown> = {
    tax_rate: updates.taxRate,
    tax_threshold: updates.taxThreshold,
    tax_rate_low: updates.taxRateLow,
    tax_rate_high: updates.taxRateHigh,
    shipping_flat_rate: updates.shippingFlatRate,
    free_shipping_threshold: updates.freeShippingThreshold,
    currency: updates.currency,
    invoice_prefix: updates.invoicePrefix,
    printer_name: updates.printerName,
    printer_connection: updates.printerConnection,
  };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  if (existing) {
    const { error } = await supabase.from('pos_settings').update(payload).eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('pos_settings').insert(payload);
    if (error) throw new Error(error.message);
  }
}

export function deriveCollections(products: Product[], orders: Order[]): Collection[] {
  const byCategory = new Map<string, Product[]>();
  for (const p of products) {
    const list = byCategory.get(p.category) || [];
    list.push(p);
    byCategory.set(p.category, list);
  }

  return Array.from(byCategory.entries()).map(([category, categoryProducts]) => {
    const productIds = new Set(categoryProducts.map((p) => p.id));
    let revenue = 0;
    let unitsSold = 0;
    for (const order of orders) {
      for (const item of order.items) {
        if (productIds.has(item.productId)) {
          revenue += item.total;
          unitsSold += item.quantity;
        }
      }
    }

    return {
      id: category,
      name: category,
      code: category.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase() || 'GEN',
      description: `${category} collection`,
      productCount: categoryProducts.length,
      revenue,
      unitsSold,
      status: categoryProducts.some((p) => p.status === 'ACTIVE') ? 'ACTIVE' : 'ARCHIVED',
    };
  });
}

function mapPaymentTransaction(
  t: {
    id: string;
    bill_id: string;
    method: string;
    amount: number;
    status: string;
    created_at: string;
  },
  bill: DbPosBill | undefined,
  customerName: string
): PaymentTransaction {
  return {
    id: t.id,
    transactionRef: `TXN-${(bill?.bill_number || t.bill_id).replace('SD-', '')}-${t.method}`,
    orderId: t.bill_id,
    orderNumber: bill?.bill_number || t.bill_id,
    customerName,
    amount: t.amount,
    method: t.method as PaymentTransaction['method'],
    status: t.status as PaymentTransaction['status'],
    date: toIstDateTime(t.created_at),
  };
}

export async function fetchPaymentTransactions(): Promise<PaymentTransaction[]> {
  const [{ data: payments, error: payErr }, { data: bills, error: billErr }, { data: customers, error: custErr }] =
    await Promise.all([
      supabase.from('pos_payment_transactions').select('*').order('created_at', { ascending: false }).limit(500),
      fetchAllRows((from, to) => supabase.from('pos_bills').select('*').order('id').range(from, to)),
      fetchAllRows((from, to) => supabase.from('pos_customers').select('*').order('id').range(from, to)),
    ]);
  if (payErr) throw new Error(payErr.message);
  if (billErr) throw new Error(billErr.message);
  if (custErr) throw new Error(custErr.message);

  const billById = new Map(((bills || []) as DbPosBill[]).map((b) => [b.id, b]));
  const customerById = new Map(((customers || []) as DbPosCustomer[]).map((c) => [c.id, c]));

  return (payments || []).map((t: any) => {
    const bill = billById.get(t.bill_id);
    const customerName = bill?.pos_customer_id ? customerById.get(bill.pos_customer_id)?.name || 'Walk-in Customer' : 'Walk-in Customer';
    return mapPaymentTransaction(t, bill, customerName);
  });
}

function mapReturn(
  r: DbPosReturn,
  bill: DbPosBill | undefined,
  item: DbPosBillItem | undefined,
  customerName: string
): ReturnRequest {
  return {
    id: r.id,
    returnNumber: r.return_number,
    orderId: r.bill_id,
    orderNumber: bill?.bill_number || r.bill_id,
    customerId: bill?.pos_customer_id || 'guest',
    customerName,
    productTitle: item?.product_name || '',
    variantName: item ? variantLabel(item.size, item.color) : '',
    reason: r.reason,
    condition: r.condition || '',
    refundAmount: r.refund_amount,
    status: r.status as ReturnStatus,
    createdAt: toIstDateTime(r.created_at),
    billItemId: r.bill_item_id,
    variantId: item?.variant_id || undefined,
    productSlug: item?.product_slug,
    qty: r.qty,
  };
}

export async function fetchReturns(): Promise<ReturnRequest[]> {
  const [{ data: returns, error: retErr }, { data: bills, error: billErr }, { data: items, error: itemErr }, { data: customers, error: custErr }] =
    await Promise.all([
      fetchAllRows((from, to) =>
        supabase.from('pos_returns').select('*').order('created_at', { ascending: false }).order('id').range(from, to)
      ),
      fetchAllRows((from, to) => supabase.from('pos_bills').select('*').order('id').range(from, to)),
      fetchAllRows((from, to) => supabase.from('pos_bill_items').select('*').order('id').range(from, to)),
      fetchAllRows((from, to) => supabase.from('pos_customers').select('*').order('id').range(from, to)),
    ]);
  if (retErr) throw new Error(retErr.message);
  if (billErr) throw new Error(billErr.message);
  if (itemErr) throw new Error(itemErr.message);
  if (custErr) throw new Error(custErr.message);

  const billById = new Map(((bills || []) as DbPosBill[]).map((b) => [b.id, b]));
  const itemById = new Map(((items || []) as DbPosBillItem[]).map((i) => [i.id, i]));
  const customerById = new Map(((customers || []) as DbPosCustomer[]).map((c) => [c.id, c]));

  return ((returns || []) as DbPosReturn[]).map((r) => {
    const bill = billById.get(r.bill_id);
    const customerName = bill?.pos_customer_id ? customerById.get(bill.pos_customer_id)?.name || 'Walk-in Customer' : 'Walk-in Customer';
    return mapReturn(r, bill, itemById.get(r.bill_item_id), customerName);
  });
}

export async function createReturn(input: {
  billId: string;
  billItemId: string;
  qty: number;
  reason: string;
  condition?: string;
  refundAmount: number;
  staffId: string | null;
}): Promise<ReturnRequest> {
  const { data, error } = await supabase
    .from('pos_returns')
    .insert({
      bill_id: input.billId,
      bill_item_id: input.billItemId,
      qty: input.qty,
      reason: input.reason,
      condition: input.condition || null,
      refund_amount: input.refundAmount,
      staff_id: input.staffId,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  const [{ data: bill }, { data: item }] = await Promise.all([
    supabase.from('pos_bills').select('*').eq('id', input.billId).single(),
    supabase.from('pos_bill_items').select('*').eq('id', input.billItemId).single(),
  ]);

  let customerName = 'Walk-in Customer';
  if (bill?.pos_customer_id) {
    const { data: c } = await supabase.from('pos_customers').select('*').eq('id', bill.pos_customer_id).single();
    customerName = (c as DbPosCustomer | null)?.name || customerName;
  }

  return mapReturn(data, bill as DbPosBill, item as DbPosBillItem, customerName);
}

export async function updateReturnStatusDb(returnId: string, status: ReturnStatus): Promise<void> {
  const { error } = await supabase.from('pos_returns').update({ status }).eq('id', returnId);
  if (error) throw new Error(error.message);
}

export async function recordTestPrint(): Promise<void> {
  const { data: existing } = await supabase.from('pos_settings').select('id').limit(1).maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from('pos_settings')
      .update({ last_test_print: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('pos_settings').insert({ last_test_print: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }
}
