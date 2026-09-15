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
  PaymentMethod,
} from '../types';
import {
  initialProducts,
  initialCollections,
  initialOrders,
  initialCustomers,
  initialReturns,
  initialPayments,
  initialInventoryLogs,
  initialStaff,
  initialCommerceSettings,
} from '../data/mockData';

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
}

const STORAGE_KEY = 'STUDIO_DENY_COMMERCE_OS_v1';

function loadInitialState(): CommerceState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure orders have channel assigned
      const migratedOrders = (parsed.orders || []).map((o: Order) => ({
        ...o,
        channel: o.channel || (o.notes?.toLowerCase().includes('in-store') || o.notes?.toLowerCase().includes('pos') || o.notes?.toLowerCase().includes('counter') ? 'OFFLINE' : 'ONLINE'),
      }));
      return {
        ...parsed,
        orders: migratedOrders.length > 0 ? migratedOrders : initialOrders,
        toasts: [],
      };
    }
  } catch (e) {
    console.error('Error loading commerce state from localStorage:', e);
  }

  return {
    products: initialProducts,
    collections: initialCollections,
    orders: initialOrders,
    customers: initialCustomers,
    returns: initialReturns,
    payments: initialPayments,
    inventoryLogs: initialInventoryLogs,
    staff: initialStaff,
    settings: initialCommerceSettings,
    toasts: [],
  };
}

let currentState: CommerceState = loadInitialState();
const listeners = new Set<(state: CommerceState) => void>();

function saveState(state: CommerceState) {
  currentState = state;
  try {
    const { toasts: _, ...persistable } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  } catch (e) {
    console.error('Error saving commerce state:', e);
  }
  listeners.forEach((listener) => listener(currentState));
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

  resetToDefaults: () => {
    const resetState: CommerceState = {
      products: initialProducts,
      collections: initialCollections,
      orders: initialOrders,
      customers: initialCustomers,
      returns: initialReturns,
      payments: initialPayments,
      inventoryLogs: initialInventoryLogs,
      staff: initialStaff,
      settings: initialCommerceSettings,
      toasts: [],
    };
    saveState(resetState);
    store.addToast('System Reset', 'All commerce records restored to default Studio Deny catalog.', 'info');
  },

  // ORDERS & COMMERCE ENGINE
  createOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'timeline'>): Order => {
    const nextNum = currentState.orders.length + 1000249;
    const orderNumber = `SD-${nextNum}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newOrder: Order = {
      ...orderData,
      id: `ord-${nextNum}`,
      orderNumber,
      createdAt: now,
      timeline: [
        { status: 'ORDER PLACED', time: now, note: 'Order registered in Deny OS' },
        { status: 'PAYMENT CONFIRMED', time: now, note: `Tendered via ${orderData.paymentMethod}` },
      ],
    };

    // Decrement stock for each item & create inventory logs
    const newLogs: InventoryLog[] = [];
    const updatedProducts = currentState.products.map((prod) => {
      const orderItemsForProd = orderData.items.filter((item) => item.productId === prod.id);
      if (orderItemsForProd.length === 0) return prod;

      let productTotalChange = 0;
      const updatedVariants = prod.variants.map((v) => {
        const item = orderItemsForProd.find((oi) => oi.variantId === v.id);
        if (!item) return v;

        const newStock = Math.max(0, v.stock - item.quantity);
        productTotalChange += item.quantity;

        newLogs.push({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          date: now,
          productId: prod.id,
          productName: prod.name,
          variantSku: v.sku,
          changeQty: -item.quantity,
          newStock,
          reason: 'SALE',
          user: 'Deny OS Commerce Engine',
        });

        return { ...v, stock: newStock };
      });

      return {
        ...prod,
        variants: updatedVariants,
        totalStock: Math.max(0, prod.totalStock - productTotalChange),
      };
    });

    // Create payment transaction(s)
    const newPayments: PaymentTransaction[] = (newOrder.paymentSplits && newOrder.paymentSplits.length > 0)
      ? newOrder.paymentSplits.map((split, idx) => ({
          id: `pay-${Date.now()}-${idx}`,
          transactionRef: `TXN-${orderNumber.replace('SD-', '')}-${split.method}`,
          orderId: newOrder.id,
          orderNumber: newOrder.orderNumber,
          customerName: newOrder.customerName,
          amount: split.amount,
          method: split.method as PaymentMethod,
          status: 'SUCCESS',
          date: now,
        }))
      : [
          {
            id: `pay-${Date.now()}`,
            transactionRef: `TXN-${orderNumber.replace('SD-', '')}`,
            orderId: newOrder.id,
            orderNumber: newOrder.orderNumber,
            customerName: newOrder.customerName,
            amount: newOrder.grandTotal,
            method: newOrder.paymentMethod,
            status: 'SUCCESS',
            date: now,
          },
        ];

    // Update customer spend & order count if matching
    const updatedCustomers = currentState.customers.map((c) => {
      if (c.id === orderData.customerId || c.email.toLowerCase() === orderData.customerEmail.toLowerCase()) {
        const totalSpend = c.totalSpend + newOrder.grandTotal;
        const ordersCount = c.ordersCount + 1;
        const averageOrderValue = Math.round(totalSpend / ordersCount);
        return {
          ...c,
          totalSpend,
          ordersCount,
          averageOrderValue,
          lastOrderNumber: newOrder.orderNumber,
          lastOrderDate: now.substring(0, 10),
          segment: totalSpend > 40000 ? ('VIP' as const) : ('ACTIVE' as const),
        };
      }
      return c;
    });

    saveState({
      ...currentState,
      orders: [newOrder, ...currentState.orders],
      products: updatedProducts,
      inventoryLogs: [...newLogs, ...currentState.inventoryLogs],
      payments: [...newPayments, ...currentState.payments],
      customers: updatedCustomers,
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
  adjustStock: (
    productId: string,
    variantId: string,
    changeQty: number,
    reason: InventoryLog['reason'] = 'ADJUSTMENT'
  ) => {
    const product = currentState.products.find((p) => p.id === productId);
    if (!product) return;

    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) return;

    const newStock = Math.max(0, variant.stock + changeQty);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newLog: InventoryLog = {
      id: `log-${Date.now()}`,
      date: now,
      productId: product.id,
      productName: product.name,
      variantSku: variant.sku,
      changeQty,
      newStock,
      reason,
      user: 'Studio Inventory Staff',
    };

    const updatedProducts = currentState.products.map((p) => {
      if (p.id === productId) {
        const variants = p.variants.map((v) => (v.id === variantId ? { ...v, stock: newStock } : v));
        const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
        return { ...p, variants, totalStock };
      }
      return p;
    });

    saveState({
      ...currentState,
      products: updatedProducts,
      inventoryLogs: [newLog, ...currentState.inventoryLogs],
    });

    store.addToast('Stock Adjusted', `${variant.sku}: ${newStock} units available.`, 'info');
  },

  // PRODUCTS
  addProduct: (productData: Omit<Product, 'id' | 'totalStock'>): Product => {
    const id = `prod-${Date.now()}`;
    const totalStock = productData.variants.reduce((sum, v) => sum + v.stock, 0);

    const newProduct: Product = {
      ...productData,
      id,
      totalStock,
    };

    saveState({
      ...currentState,
      products: [newProduct, ...currentState.products],
    });

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
  addCustomer: (cust: Omit<Customer, 'id' | 'ordersCount' | 'totalSpend' | 'averageOrderValue' | 'createdAt'>): Customer => {
    const newCustomer: Customer = {
      ...cust,
      id: `cust-${Date.now()}`,
      ordersCount: 0,
      totalSpend: 0,
      averageOrderValue: 0,
      createdAt: new Date().toISOString().substring(0, 10),
    };

    saveState({
      ...currentState,
      customers: [newCustomer, ...currentState.customers],
    });

    store.addToast('Customer Created', `${newCustomer.name} added to CRM.`, 'success');
    return newCustomer;
  },

  // RETURNS
  updateReturnStatus: (returnId: string, status: ReturnStatus) => {
    const ret = currentState.returns.find((r) => r.id === returnId);
    if (!ret) return;

    const updatedReturns = currentState.returns.map((r) => (r.id === returnId ? { ...r, status } : r));

    // If marked REFUNDED, log refund payment transaction
    let updatedPayments = currentState.payments;
    if (status === 'REFUNDED') {
      const refundPayment: PaymentTransaction = {
        id: `ref-${Date.now()}`,
        transactionRef: `RFND-${ret.returnNumber}`,
        orderId: ret.orderId,
        orderNumber: ret.orderNumber,
        customerName: ret.customerName,
        amount: ret.refundAmount,
        method: 'UPI',
        status: 'REFUNDED',
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
      updatedPayments = [refundPayment, ...currentState.payments];
    }

    saveState({
      ...currentState,
      returns: updatedReturns,
      payments: updatedPayments,
    });

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
  updateSettings: (updates: Partial<CommerceSettings>) => {
    saveState({
      ...currentState,
      settings: {
        ...currentState.settings,
        ...updates,
      },
    });
    store.addToast('Settings Saved', 'Commerce operating system configuration updated.', 'success');
  },

  testPrint: () => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    saveState({
      ...currentState,
      settings: {
        ...currentState.settings,
        printer: {
          ...currentState.settings.printer,
          status: 'ONLINE',
          lastTestPrint: now,
        },
      },
    });
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
