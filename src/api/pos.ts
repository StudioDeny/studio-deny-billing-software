import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
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

function mapProduct(p: DbProduct, variants: DbProductVariant[], categoryName: string | undefined): Product {
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
  const [
    { data: products, error: pErr },
    { data: variants, error: vErr },
    { data: productCategories, error: pcErr },
    { data: categories, error: catErr },
  ] = await Promise.all([
    supabase.from('products').select('*').order('created_at', { ascending: false }),
    supabase.from('product_variants').select('*'),
    supabase.from('product_categories').select('*'),
    supabase.from('categories').select('*'),
  ]);
  if (pErr) throw new Error(pErr.message);
  if (vErr) throw new Error(vErr.message);
  if (pcErr) throw new Error(pcErr.message);
  if (catErr) throw new Error(catErr.message);

  const categoryNameById = new Map(((categories || []) as DbCategory[]).map((c) => [c.id, c.name]));
  const categoryNameBySlug = new Map<string, string>();
  ((productCategories || []) as DbProductCategory[]).forEach((pc) => {
    const name = categoryNameById.get(pc.category_id);
    if (name && !categoryNameBySlug.has(pc.product_slug)) {
      categoryNameBySlug.set(pc.product_slug, name);
    }
  });

  return ((products || []) as DbProduct[]).map((p) =>
    mapProduct(p, (variants || []) as DbProductVariant[], categoryNameBySlug.get(p.slug))
  );
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
  if (error) throw new Error(error.message);
  return mapProduct(data as DbProduct, [], undefined);
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
  updates: { name?: string; phone?: string; email?: string; address?: string; city?: string }
): Promise<void> {
  const payload: Record<string, unknown> = {
    name: updates.name,
    phone: updates.phone,
    email: updates.email,
    address: updates.address,
    city: updates.city,
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
  const { data, error } = await supabase.from('pos_staff').select('*').order('created_at', { ascending: true });
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
    timeline: [
      { status: 'ORDER PLACED', time: bill.created_at.replace('T', ' ').substring(0, 19), note: 'Bill settled in Deny OS' },
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
    supabase.from('pos_bills').select('*').order('created_at', { ascending: false }),
    supabase.from('pos_bill_items').select('*'),
    supabase.from('pos_customers').select('*'),
    supabase.from('pos_staff').select('*'),
  ]);
  if (bErr) throw new Error(bErr.message);
  if (iErr) throw new Error(iErr.message);
  if (cErr) throw new Error(cErr.message);
  if (sErr) throw new Error(sErr.message);

  const customerById = new Map(((customers || []) as DbPosCustomer[]).map((c) => [c.id, c]));
  const staffNameById = new Map(((staffRows || []) as DbPosStaff[]).map((s) => [s.id, s.display_name]));
  return ((bills || []) as DbPosBill[]).map((b) =>
    mapBillToOrder(
      b,
      (items || []) as DbPosBillItem[],
      b.pos_customer_id ? customerById.get(b.pos_customer_id) : undefined,
      b.staff_id ? staffNameById.get(b.staff_id) : undefined
    )
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
  taxAmount: number;
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
    p_tax_amount: input.taxAmount,
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
  const payload: Record<string, unknown> = {
    tax_rate: updates.taxRate,
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
    date: t.created_at.replace('T', ' ').substring(0, 19),
  };
}

export async function fetchPaymentTransactions(): Promise<PaymentTransaction[]> {
  const [{ data: payments, error: payErr }, { data: bills, error: billErr }, { data: customers, error: custErr }] =
    await Promise.all([
      supabase.from('pos_payment_transactions').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('pos_bills').select('*'),
      supabase.from('pos_customers').select('*'),
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
    variantName: item ? [item.color, item.size].filter(Boolean).join(' / ') : '',
    reason: r.reason,
    condition: r.condition || '',
    refundAmount: r.refund_amount,
    status: r.status as ReturnStatus,
    createdAt: r.created_at.replace('T', ' ').substring(0, 19),
    billItemId: r.bill_item_id,
    variantId: item?.variant_id || undefined,
    productSlug: item?.product_slug,
    qty: r.qty,
  };
}

export async function fetchReturns(): Promise<ReturnRequest[]> {
  const [{ data: returns, error: retErr }, { data: bills, error: billErr }, { data: items, error: itemErr }, { data: customers, error: custErr }] =
    await Promise.all([
      supabase.from('pos_returns').select('*').order('created_at', { ascending: false }),
      supabase.from('pos_bills').select('*'),
      supabase.from('pos_bill_items').select('*'),
      supabase.from('pos_customers').select('*'),
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
