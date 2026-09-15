export interface OrderItemDto {
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

export interface PaymentSplitDto {
  id: string;
  method: 'CASH' | 'UPI' | 'CARD' | 'OTHER';
  amount: number;
  tendered?: number;
  change?: number;
}

export interface CreateOrderDto {
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  channel: 'ONLINE' | 'OFFLINE';
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  items: OrderItemDto[];
  subtotal: number;
  discount: number;
  discountType?: 'PERCENT' | 'FIXED';
  discountPercent?: number;
  discountReason?: string;
  shippingFee?: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: 'UPI' | 'CARD' | 'CASH' | 'OTHER' | 'SPLIT' | 'COD' | 'BANK';
  paymentSplits?: PaymentSplitDto[];
  tenderedAmount?: number;
  changeAmount?: number;
  notes?: string;
}

export function validateCreateOrderDto(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!body.customerName) errors.push('customerName is required.');
  if (!body.customerPhone) errors.push('customerPhone is required.');
  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push('items must contain at least one order item.');
  } else {
    body.items.forEach((item: any, idx: number) => {
      if (!item.variantId) errors.push(`items[${idx}].variantId is required.`);
      if (!item.quantity || item.quantity <= 0) errors.push(`items[${idx}].quantity must be greater than 0.`);
      if (item.unitPrice === undefined || item.unitPrice < 0) errors.push(`items[${idx}].unitPrice must be non-negative.`);
    });
  }
  if (body.grandTotal === undefined || body.grandTotal < 0) {
    errors.push('grandTotal must be non-negative.');
  }
  return { isValid: errors.length === 0, errors };
}
