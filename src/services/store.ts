import { useState, useEffect } from 'react';
import {
  Product,
  Collection,
  Order,
  Customer,
  ReturnRequest,
  PaymentTransaction,
  InventoryLog,
  StaffMember,
  CommerceSettings,
  ToastMessage,
  FulfillmentStatus,
  ReturnStatus,
} from '../types';
import * as posApi from '../api/pos';
import { getCurrentStaff } from '../api/auth';

interface PaymentSplitLike {
  method: string;
  amount: number;
  tendered?: number;
  change?: number;
}

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
  collections: [],
  orders: [],
  customers: [],
  returns: [],
  payments: [],
  inventoryLogs: [],
  staff: [],
  settings: {
    storeName: 'STUDIO DENY',
    brand: 'STUDIO DENY',
    tagline: '',
    address: '',
    cityState: '',
    country: 'India',
    phone: '',
    email: '',
    website: 'studiodeny.com',
    gstin: '',
    pan: '',
    invoicePrefix: 'SD',
    startingInvoiceNumber: 1000250,
    currency: 'INR',
    taxRate: 0,
    shippingFlatRate: 0,
    freeShippingThreshold: 0,
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
  const [orders, inventoryLogs, payments, returns] = await Promise.all([
    posApi.fetchBills(),
    posApi.fetchInventoryLogs(),
    posApi.fetchPaymentTransactions(),
    posApi.fetchReturns(),
  ]);
  const collections = posApi.deriveCollections(products, orders);

  const staffRecord = await getCurrentStaff();
  currentStaffId = staffRecord?.id || null;

  saveState({
    ...currentState,
    products,
    customers,
    staff,
    settings,
    orders,
    inventoryLogs,
    payments,
    returns,
    collections,
    ready: true,
  });
}

export const store = {
  getState: (): CommerceState => currentState,

  subscribe: (listener: (state: CommerceState) => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // Toast System
  addToast: (title: string, message?: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { id, title, message, type };
    saveState({
      ...currentState,
      toasts: [...currentState.toasts, newToast],
    });

    setTimeout(() => {
      store.removeToast(id);
    }, 4000);
  },

  removeToast: (id: string) => {
    saveState({
      ...currentState,
      toasts: currentState.toasts.filter((t) => t.id !== id),
    });
  },

  // ORDERS & COMMERCE ENGINE
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

    const rawPayments: PaymentSplitLike[] =
      orderData.paymentSplits && orderData.paymentSplits.length > 0
        ? orderData.paymentSplits
        : [
            {
              method: orderData.paymentMethod,
              amount: orderData.grandTotal,
              tendered: orderData.tenderedAmount,
              change: orderData.changeAmount,
            },
          ];

    const payments = rawPayments.map((p) => ({
      method: (p.method === 'COD' || p.method === 'BANK' || p.method === 'SPLIT' ? 'OTHER' : p.method) as
        | 'CASH'
        | 'UPI'
        | 'CARD'
        | 'OTHER',
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

  updateFulfillmentStatus: (
    orderId: string,
    status: FulfillmentStatus,
    courierName?: string,
    trackingNumber?: string
  ) => {
    const order = currentState.orders.find((o) => o.id === orderId);
    if (!order) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const timelineEvent = {
      status,
      time: now,
      note: trackingNumber ? `Tracking: ${trackingNumber} (${courierName})` : `Updated to [${status}]`,
    };

    const updatedOrders = currentState.orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          fulfillmentStatus: status,
          courierName: courierName || o.courierName,
          trackingNumber: trackingNumber || o.trackingNumber,
          timeline: [...o.timeline, timelineEvent],
        };
      }
      return o;
    });

    saveState({
      ...currentState,
      orders: updatedOrders,
    });

    store.addToast('Fulfillment Updated', `${order.orderNumber} is now [${status}].`, 'info');
  },

  // INVENTORY
  adjustStock: async (
    productId: string,
    variantId: string,
    changeQty: number,
    reason: InventoryLog['reason'] = 'ADJUSTMENT'
  ) => {
    const product = currentState.products.find((p) => p.id === productId);
    if (!product) return;

    const variant = product.variants.find((v) => v.id === variantId);
    const isRealVariant = !!variant && variant.id !== product.id;

    await posApi.adjustStock(isRealVariant ? variantId : null, productId, changeQty, reason, currentStaffId);

    const [products, inventoryLogs] = await Promise.all([posApi.fetchProducts(), posApi.fetchInventoryLogs()]);
    saveState({ ...currentState, products, inventoryLogs });
    store.addToast('Stock Adjusted', `${variant?.sku || productId}: updated.`, 'info');
  },

  // PRODUCTS
  addProduct: async (productData: Omit<Product, 'id' | 'totalStock'>): Promise<Product> => {
    const slug = productData.sku
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newProduct = await posApi.createProduct({
      slug,
      name: productData.name,
      category: productData.category,
      price: productData.price,
      image: productData.image,
      description: productData.description,
      sizes: productData.sizes,
      stock: productData.variants.reduce((sum, v) => sum + v.stock, 0),
    });

    const products = await posApi.fetchProducts();
    saveState({ ...currentState, products });
    store.addToast('Product Created', `${newProduct.name} (${newProduct.sku}) added to catalog.`, 'success');
    return newProduct;
  },

  updateProduct: (id: string, updates: Partial<Product>) => {
    const updatedProducts = currentState.products.map((p) => (p.id === id ? { ...p, ...updates } : p));
    saveState({
      ...currentState,
      products: updatedProducts,
    });
    store.addToast('Product Saved', 'Catalog changes updated.', 'info');
  },

  // CUSTOMERS
  addCustomer: async (
    cust: Omit<Customer, 'id' | 'ordersCount' | 'totalSpend' | 'averageOrderValue' | 'createdAt'>
  ): Promise<Customer> => {
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

  // RETURNS
  updateReturnStatus: async (returnId: string, status: ReturnStatus) => {
    const ret = currentState.returns.find((r) => r.id === returnId);
    if (!ret) return;

    await posApi.updateReturnStatusDb(returnId, status);

    const [returns, payments] = await Promise.all([posApi.fetchReturns(), posApi.fetchPaymentTransactions()]);
    saveState({ ...currentState, returns, payments });

    store.addToast('Return Updated', `${ret.returnNumber} marked as [${status}].`, 'info');
  },

  createReturnRequest: (data: Omit<ReturnRequest, 'id' | 'returnNumber' | 'createdAt' | 'status'>): ReturnRequest => {
    const returnNumber = `SD-RET-${currentState.returns.length + 404}`;
    const newReturn: ReturnRequest = {
      ...data,
      id: `ret-${Date.now()}`,
      returnNumber,
      status: 'REQUESTED',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    saveState({
      ...currentState,
      returns: [newReturn, ...currentState.returns],
    });

    store.addToast('Return Request Initiated', `${returnNumber} created for ${data.customerName}.`, 'info');
    return newReturn;
  },

  // SETTINGS
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
    saveState({
      ...currentState,
      settings,
    });
    store.addToast('Settings Saved', 'Commerce operating system configuration updated.', 'success');
  },

  reloadFromDatabase: async () => {
    await initStore();
    store.addToast('Data Reloaded', 'Catalog, orders, customers, and inventory refreshed from the live database.', 'info');
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
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  return state;
}
