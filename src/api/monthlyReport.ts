import { supabase } from '../lib/supabaseClient';
import { DbPosBill, DbPosBillItem, DbPosCustomer } from '../types/supabase';

// One invoice as it goes into the monthly PDF - POS bills and website
// orders normalised to the same shape. Amounts are exactly what was stored;
// nothing is recalculated here.
export interface MonthlyInvoiceLine {
  name: string;
  variant: string;
  qty: number;
  unitPrice: number;
  discount: number;
  amount: number;
}

export interface MonthlyInvoice {
  id: string;
  channel: 'OFFLINE' | 'ONLINE';
  invoiceNumber: string;
  createdAt: string; // ISO timestamp from the database
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  // Place of supply. Offline sales are always at the store (Andhra Pradesh);
  // online orders use the delivery state, which decides CGST+SGST vs IGST.
  placeOfSupply: string;
  lines: MonthlyInvoiceLine[];
  subtotal: number;
  discount: number;
  taxable: number;
  taxRate: number;
  taxIsCustom: boolean;
  taxAmount: number;
  shipping: number;
  // Website orders can carry extra_lines (fees etc.) whose shape this app
  // does not own - surfaced only as the difference to the stored total.
  otherCharges: number;
  grandTotal: number;
  payments: { method: string; amount: number }[];
  notes: string;
}

export interface MonthlyData {
  offline: MonthlyInvoice[]; // COMPLETED / RETURNED POS bills
  voided: MonthlyInvoice[]; // VOID POS bills - listed, never totalled
  online: MonthlyInvoice[]; // DELIVERED website orders
}

export const STORE_STATE = 'Andhra Pradesh';

// Month boundaries in IST (the store's timezone), as UTC ISO strings.
export function monthRangeIst(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return {
    from: new Date(`${year}-${pad(month)}-01T00:00:00+05:30`).toISOString(),
    to: new Date(`${next.y}-${pad(next.m)}-01T00:00:00+05:30`).toISOString(),
  };
}

interface DbWebsiteOrder {
  id: string;
  order_number: string;
  invoice_no: string | null;
  user_email: string;
  items: { name?: string; slug?: string; size?: string; color?: string; qty?: number; price?: number }[];
  subtotal: number;
  shipping: number;
  tax_rate: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  address: { name?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string } | null;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function fetchOfflineBills(from: string, to: string): Promise<MonthlyInvoice[]> {
  const { data: bills, error } = await supabase
    .from('pos_bills')
    .select('*')
    .gte('created_at', from)
    .lt('created_at', to)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const billRows = (bills || []) as DbPosBill[];
  if (billRows.length === 0) return [];

  const billIds = billRows.map((b) => b.id);
  const customerIds = Array.from(new Set(billRows.map((b) => b.pos_customer_id).filter(Boolean))) as string[];

  const [{ data: items, error: iErr }, { data: payments, error: pErr }, { data: customers, error: cErr }] =
    await Promise.all([
      supabase.from('pos_bill_items').select('*').in('bill_id', billIds),
      supabase.from('pos_payment_transactions').select('bill_id, method, amount').in('bill_id', billIds),
      customerIds.length > 0
        ? supabase.from('pos_customers').select('*').in('id', customerIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (iErr) throw new Error(iErr.message);
  if (pErr) throw new Error(pErr.message);
  if (cErr) throw new Error(cErr.message);

  const customerById = new Map(((customers || []) as DbPosCustomer[]).map((c) => [c.id, c]));

  return billRows.map((b) => {
    const customer = b.pos_customer_id ? customerById.get(b.pos_customer_id) : undefined;
    const lines = ((items || []) as DbPosBillItem[])
      .filter((i) => i.bill_id === b.id)
      .map((i) => ({
        name: i.product_name,
        variant: [i.size, i.color].filter(Boolean).join(' / '),
        qty: num(i.qty),
        unitPrice: num(i.unit_price),
        discount: num(i.item_discount),
        amount: num(i.line_total),
      }));
    const subtotal = num(b.subtotal);
    const discount = num(b.discount);
    const taxAmount = num(b.tax_amount);
    const shipping = num(b.shipping_fee);
    const grandTotal = num(b.grand_total);
    const taxable = round2(subtotal - discount);
    return {
      id: b.id,
      channel: 'OFFLINE' as const,
      invoiceNumber: b.bill_number,
      createdAt: b.created_at,
      status: b.status,
      customerName: customer?.name || 'Walk-in Customer',
      customerPhone: customer?.phone || '',
      customerEmail: customer?.email || '',
      customerAddress: [customer?.address, customer?.city].filter(Boolean).join(', '),
      placeOfSupply: STORE_STATE,
      lines,
      subtotal,
      discount,
      taxable,
      taxRate: num(b.tax_rate),
      taxIsCustom: !!b.tax_is_custom,
      taxAmount,
      shipping,
      otherCharges: round2(grandTotal - (taxable + taxAmount + shipping)),
      grandTotal,
      payments: ((payments || []) as { bill_id: string; method: string; amount: number }[])
        .filter((p) => p.bill_id === b.id)
        .map((p) => ({ method: p.method, amount: num(p.amount) })),
      notes: b.notes || '',
    };
  });
}

async function fetchDeliveredWebsiteOrders(from: string, to: string): Promise<MonthlyInvoice[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, invoice_no, user_email, items, subtotal, shipping, tax_rate, tax, discount, total, status, address, payment_method, notes, created_at'
    )
    .eq('status', 'DELIVERED')
    .gte('created_at', from)
    .lt('created_at', to)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  return ((data || []) as DbWebsiteOrder[]).map((o) => {
    const addr = o.address || {};
    const lines = (Array.isArray(o.items) ? o.items : []).map((i) => {
      const qty = num(i.qty);
      const unitPrice = num(i.price);
      return {
        name: i.name || i.slug || 'Item',
        variant: [i.size, i.color].filter(Boolean).join(' / '),
        qty,
        unitPrice,
        discount: 0,
        amount: round2(qty * unitPrice),
      };
    });
    const subtotal = num(o.subtotal);
    const discount = num(o.discount);
    const taxAmount = num(o.tax);
    const shipping = num(o.shipping);
    const grandTotal = num(o.total);
    const taxable = round2(subtotal - discount);
    return {
      id: o.id,
      channel: 'ONLINE' as const,
      invoiceNumber: o.invoice_no || o.order_number,
      createdAt: o.created_at,
      status: o.status,
      customerName: addr.name || o.user_email,
      customerPhone: addr.phone || '',
      customerEmail: o.user_email,
      customerAddress: [addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', '),
      placeOfSupply: addr.state || STORE_STATE,
      lines,
      subtotal,
      discount,
      taxable,
      taxRate: num(o.tax_rate),
      taxIsCustom: false,
      taxAmount,
      shipping,
      otherCharges: round2(grandTotal - (taxable + taxAmount + shipping)),
      grandTotal,
      payments: [{ method: o.payment_method.toUpperCase(), amount: grandTotal }],
      notes: o.notes || '',
    };
  });
}

export async function fetchMonthlyData(year: number, month: number): Promise<MonthlyData> {
  const { from, to } = monthRangeIst(year, month);
  const [bills, online] = await Promise.all([fetchOfflineBills(from, to), fetchDeliveredWebsiteOrders(from, to)]);
  return {
    offline: bills.filter((b) => b.status !== 'VOID'),
    voided: bills.filter((b) => b.status === 'VOID'),
    online,
  };
}

// Same place of supply as the store -> CGST + SGST; any other state -> IGST.
export function isInterState(inv: MonthlyInvoice): boolean {
  return inv.placeOfSupply.trim().toLowerCase() !== STORE_STATE.toLowerCase();
}

export interface ChannelTotals {
  count: number;
  subtotal: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  shipping: number;
  other: number;
  total: number;
}

export function splitTax(inv: MonthlyInvoice): { cgst: number; sgst: number; igst: number } {
  if (isInterState(inv)) return { cgst: 0, sgst: 0, igst: inv.taxAmount };
  const cgst = round2(inv.taxAmount / 2);
  return { cgst, sgst: round2(inv.taxAmount - cgst), igst: 0 };
}

export function totalsFor(invoices: MonthlyInvoice[]): ChannelTotals {
  return invoices.reduce<ChannelTotals>(
    (t, inv) => {
      const { cgst, sgst, igst } = splitTax(inv);
      return {
        count: t.count + 1,
        subtotal: round2(t.subtotal + inv.subtotal),
        discount: round2(t.discount + inv.discount),
        taxable: round2(t.taxable + inv.taxable),
        cgst: round2(t.cgst + cgst),
        sgst: round2(t.sgst + sgst),
        igst: round2(t.igst + igst),
        tax: round2(t.tax + inv.taxAmount),
        shipping: round2(t.shipping + inv.shipping),
        other: round2(t.other + inv.otherCharges),
        total: round2(t.total + inv.grandTotal),
      };
    },
    { count: 0, subtotal: 0, discount: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0, shipping: 0, other: 0, total: 0 }
  );
}

// Invoice identity straight from invoice_settings (shared with the website),
// including terms/footer/signatory which the POS settings object doesn't carry.
export async function fetchInvoiceIdentity(): Promise<{
  brand: string;
  tagline: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  terms: string;
  footer: string;
  signatory: string;
}> {
  const { data, error } = await supabase
    .from('invoice_settings')
    .select('brand_name, tagline, address, gstin, phone, email, terms, footer, signatory')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Invoice settings are missing - set the business details first.');
  return {
    brand: data.brand_name,
    tagline: data.tagline,
    address: data.address,
    gstin: data.gstin,
    phone: data.phone,
    email: data.email,
    terms: data.terms,
    footer: data.footer,
    signatory: data.signatory,
  };
}
