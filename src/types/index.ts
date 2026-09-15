export type PaymentMethod = 'UPI' | 'CARD' | 'CASH' | 'OTHER' | 'SPLIT' | 'COD' | 'BANK';

export interface PaymentSplit {
  id: string;
  method: 'CASH' | 'UPI' | 'CARD' | 'OTHER';
  amount: number;
  tendered?: number;
  change?: number;
}

export type PaymentStatus = 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED';

export type FulfillmentStatus =
  | 'UNFULFILLED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type CustomerSegment = 'VIP' | 'HIGH_VALUE' | 'ACTIVE' | 'NEW' | 'AT_RISK';

export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'INSPECTED'
  | 'REFUNDED'
  | 'EXCHANGED'
  | 'REJECTED';

export type StaffRole = 'OWNER' | 'MANAGER' | 'BILLING' | 'ADMIN' | 'FULFILLMENT';

export interface ProductVariant {
  id: string;
  sku: string;
  color: string;
  size: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  barcode?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  collection: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  sizes: string[];
  colors: string[];
  variants: ProductVariant[];
  totalStock: number;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  image: string;
  description: string;
  tags: string[];
}

export interface Collection {
  id: string;
  name: string;
  code: string;
  description: string;
  productCount: number;
  revenue: number;
  unitsSold: number;
  status: 'ACTIVE' | 'ARCHIVED';
}

export type SalesChannel = 'ONLINE' | 'OFFLINE';

export interface OrderItem {
  id?: string;
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  total: number;
  itemDiscount?: number;
  discountReason?: string;
}

export interface OrderTimelineEvent {
  status: string;
  time: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountType?: 'PERCENT' | 'FIXED';
  discountPercent?: number;
  discountReason?: string;
  shippingFee: number;
  taxAmount: number;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentMethod: PaymentMethod;
  paymentSplits?: PaymentSplit[];
  tenderedAmount?: number;
  changeAmount?: number;
  courierName?: string;
  trackingNumber?: string;
  channel?: SalesChannel;
  createdAt: string;
  timeline: OrderTimelineEvent[];
  notes?: string;
  billStatus?: 'COMPLETED' | 'VOID' | 'RETURNED';
}

// Clothing Price Tag Types
export type ClothingCategory =
  | 'T-SHIRTS'
  | 'SHIRTS'
  | 'JEANS'
  | 'FOOTWEAR'
  | 'HOODIES'
  | 'JACKETS'
  | 'PANTS'
  | 'ACCESSORIES';

export type TagFormat = 'HANG_TAG' | 'STICKER' | 'SHOEBOX';

export interface PriceTagItem {
  id: string;
  productName: string;
  sku: string;
  category: ClothingCategory;
  color: string;
  size: string;
  mrp: number;
  offerPrice: number;
  barcode: string;
  fabricSpecs: string;
  fit: string;
  washCare: string[];
  mfdMonthYear: string;
  countryOfOrigin: string;
  quantity: number;
}

export interface InventoryLog {
  id: string;
  date: string;
  productId: string;
  productName: string;
  variantSku: string;
  changeQty: number;
  newStock: number;
  reason: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'RETURN_RESTOCK' | 'DAMAGED';
  user: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  ordersCount: number;
  totalSpend: number;
  averageOrderValue: number;
  lastOrderNumber?: string;
  lastOrderDate?: string;
  segment: CustomerSegment;
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  productTitle: string;
  variantName: string;
  reason: string;
  condition: string;
  refundAmount: number;
  status: ReturnStatus;
  createdAt: string;
  billItemId?: string;
  variantId?: string;
  productSlug?: string;
  qty?: number;
}

export interface PaymentTransaction {
  id: string;
  transactionRef: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  status: 'SUCCESS' | 'REFUNDED' | 'PENDING';
  date: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: 'ACTIVE' | 'OFFLINE';
  permissions: string[];
}

export interface CommerceSettings {
  storeName: string;
  brand: string;
  tagline: string;
  address: string;
  cityState: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  pan: string;
  invoicePrefix: string;
  startingInvoiceNumber: number;
  currency: string;
  taxRate: number;
  shippingFlatRate: number;
  freeShippingThreshold: number;
  printer: {
    name: string;
    status: 'ONLINE' | 'OFFLINE';
    connection: 'WIFI' | 'USB' | 'ETHERNET';
    lastTestPrint?: string;
  };
}

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}
