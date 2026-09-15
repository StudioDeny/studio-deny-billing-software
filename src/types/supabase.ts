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

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
}

export interface DbProductCategory {
  product_slug: string;
  category_id: string;
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
  permissions: string[];
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
