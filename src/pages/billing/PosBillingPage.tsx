import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { ordersApi } from '../../api/orders';
import { customersApi } from '../../api/customers';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { formatINR } from '../../utils/formatters';
import { printThermalReceipt, printTaxInvoice } from '../../utils/receiptPrinter';
import { BarcodeSvg } from '../../components/common/BarcodeSvg';
import { Product, ProductVariant, PaymentSplit, Order, Customer } from '../../types';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  FileText,
  ShoppingBag,
  User,
  UserPlus,
  RefreshCw,
  AlertCircle,
  X,
  Tag,
  ArrowRight,
  Percent,
  Check,
} from 'lucide-react';

interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  itemDiscount?: number;
  itemDiscountPercent?: number;
  itemDiscountReason?: string;
}

const DISCOUNT_REASONS = [
  'NONE',
  'FESTIVE SALE',
  'STAFF PRIVILEGE (30%)',
  'VIP LOYALTY PRIVILEGE',
  'SEASONAL CLEARANCE',
  'DEFECT / FLOOR SAMPLE',
  'MANAGEMENT COURTESY',
  'CUSTOM',
];

export const PosBillingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCustId = searchParams.get('customerId') || '';

  const { products, customers, settings } = useStore();

  // Search & Filter
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');

  // Customer Management
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialCustId || customers[0]?.id || ''
  );
  const [isGuest, setIsGuest] = useState(false);
  const [guestName, setGuestName] = useState('Walk-in Patron');
  const [guestPhone, setGuestPhone] = useState('+91 99999 00000');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Bill-level Discount State
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('NONE');
  const [customDiscountReason, setCustomDiscountReason] = useState<string>('');

  // Item-level Discount Modal State
  const [itemDiscountTarget, setItemDiscountTarget] = useState<CartItem | null>(null);
  const [itemDiscType, setItemDiscType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [itemDiscVal, setItemDiscVal] = useState<number>(0);
  const [itemDiscReason, setItemDiscReason] = useState<string>('Item Special');

  // Variant selector drawer / popover state
  const [activeVariantProduct, setActiveVariantProduct] = useState<Product | null>(null);

  // Multi-Tender / Split Payment State
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([
    { id: 'split-1', method: 'UPI', amount: 0 },
  ]);
  const [cashTendered, setCashTendered] = useState<string>('');

  // Payment Execution & Print Flow State
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<any | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Mobile/iPad portrait cart drawer toggle
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Categories extracted from products
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category.toUpperCase()));
    return ['ALL', ...Array.from(cats)];
  }, [products]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Filtered Products Catalog
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.variants.some((v) => v.sku.toLowerCase().includes(q));

      const matchesCat =
        activeCategory === 'ALL' || p.category.toUpperCase() === activeCategory;

      return matchesSearch && matchesCat;
    });
  }, [products, search, activeCategory]);

  // Cart Calculations with Bill-Level and Item-Level Discounts
  const grossSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);
  }, [cart]);

  const itemDiscountsTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.itemDiscount || 0), 0);
  }, [cart]);

  const subtotalAfterItemDisc = Math.max(0, grossSubtotal - itemDiscountsTotal);

  const billDiscountAmount = useMemo(() => {
    if (discountType === 'PERCENT') {
      return Math.round((subtotalAfterItemDisc * Math.min(100, Math.max(0, discountValue))) / 100);
    }
    return Math.min(subtotalAfterItemDisc, Math.max(0, discountValue));
  }, [subtotalAfterItemDisc, discountType, discountValue]);

  const totalDiscountAmount = itemDiscountsTotal + billDiscountAmount;
  const taxableAmount = Math.max(0, grossSubtotal - totalDiscountAmount);
  const taxRate = settings.taxRate || 12;
  const taxAmount = Math.round((taxableAmount * taxRate) / 100);
  const grandTotal = taxableAmount + taxAmount;
  const totalItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  // Split payment totals
  const amountPaid = useMemo(() => {
    return paymentSplits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  }, [paymentSplits]);

  const remainingDue = Math.max(0, grandTotal - amountPaid);

  // For cash tender change
  const cashSplit = paymentSplits.find((s) => s.method === 'CASH');
  const cashAmountExpected = cashSplit ? Number(cashSplit.amount) || 0 : 0;
  const numCashTendered = Number(cashTendered) || 0;
  const changeToReturn = Math.max(0, numCashTendered - cashAmountExpected);

  // Auto-sync initial split amount to grandTotal if single split
  React.useEffect(() => {
    if (paymentSplits.length === 1 && paymentSplits[0].amount === 0 && grandTotal > 0) {
      setPaymentSplits([{ ...paymentSplits[0], amount: grandTotal }]);
    }
  }, [grandTotal, paymentSplits]);

  // Add Product / Variant to Cart
  const handleAddVariantToCart = (product: Product, variant: ProductVariant) => {
    if (variant.stock <= 0) {
      store.addToast('Variant Sold Out', `${variant.sku} is out of stock.`, 'warning');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.variant.id === variant.id);
      if (existing) {
        if (existing.quantity >= variant.stock) {
          store.addToast('Stock Limit', `Only ${variant.stock} available.`, 'warning');
          return prev;
        }
        return prev.map((i) =>
          i.variant.id === variant.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, variant, quantity: 1 }];
    });

    setActiveVariantProduct(null);
  };

  // Direct Product Tap: If 1 variant, add immediately; if multiple, open variant selection
  const handleProductTap = (product: Product) => {
    if (product.variants.length === 1) {
      handleAddVariantToCart(product, product.variants[0]);
    } else {
      setActiveVariantProduct(product);
    }
  };

  // Stepper adjustments
  const handleUpdateQuantity = (variantId: string, change: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variant.id === variantId) {
            const nextQty = item.quantity + change;
            if (nextQty > item.variant.stock) {
              store.addToast('Stock Limit', `Stock limit: ${item.variant.stock} pcs.`, 'warning');
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (variantId: string) => {
    setCart((prev) => prev.filter((i) => i.variant.id !== variantId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Clear all items from this bill?')) {
      setCart([]);
      setDiscountValue(0);
      setDiscountReason('NONE');
      setCustomDiscountReason('');
      setPaymentSplits([{ id: 'split-1', method: 'UPI', amount: 0 }]);
      setCashTendered('');
    }
  };

  // Item-level Custom Discount Handlers
  const handleOpenItemDiscount = (item: CartItem) => {
    setItemDiscountTarget(item);
    setItemDiscType(item.itemDiscountPercent ? 'PERCENT' : 'FIXED');
    setItemDiscVal(item.itemDiscountPercent || item.itemDiscount || 10);
    setItemDiscReason(item.itemDiscountReason || 'Item Special');
  };

  const handleApplyItemDiscount = () => {
    if (!itemDiscountTarget) return;
    const lineGross = itemDiscountTarget.variant.price * itemDiscountTarget.quantity;
    let discAmt = 0;
    if (itemDiscType === 'PERCENT') {
      discAmt = Math.round((lineGross * Math.min(100, Math.max(0, itemDiscVal))) / 100);
    } else {
      discAmt = Math.min(lineGross, Math.max(0, itemDiscVal));
    }

    setCart((prev) =>
      prev.map((i) => {
        if (i.variant.id === itemDiscountTarget.variant.id) {
          return {
            ...i,
            itemDiscount: discAmt,
            itemDiscountPercent:
              itemDiscType === 'PERCENT' ? itemDiscVal : Math.round((discAmt / lineGross) * 100),
            itemDiscountReason: itemDiscReason.trim() || 'Item Discount',
          };
        }
        return i;
      })
    );
    setItemDiscountTarget(null);
    store.addToast('Item Discount Set', `Applied -${formatINR(discAmt)} to ${itemDiscountTarget.product.name}.`, 'info');
  };

  const handleRemoveItemDiscount = (variantId: string) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.variant.id === variantId) {
          const { itemDiscount, itemDiscountPercent, itemDiscountReason, ...rest } = i;
          return rest;
        }
        return i;
      })
    );
    store.addToast('Item Discount Cleared', 'Restored item to catalog price.', 'info');
  };

  // Quick Customer Creation
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      store.addToast('Validation', 'Customer Name and Phone are required.', 'error');
      return;
    }

    const payload = {
      name: newCustName.trim(),
      email: `${newCustName.toLowerCase().replace(/\s+/g, '')}@patron.studiodeny.com`,
      phone: newCustPhone.trim(),
      address: 'Studio Deny In-Store Counter',
      city: 'Mumbai',
      segment: 'NEW' as const,
    };

    let created: Customer;
    try {
      created = await customersApi.create(payload);
      store.addCustomer(payload); // Ensure local store sync
    } catch (err: any) {
      if (import.meta.env.VITE_ENABLE_MOCK_FALLBACK === 'true') {
        created = store.addCustomer(payload);
      } else {
        store.addToast('Error', err.message || 'Could not register customer on server.', 'error');
        return;
      }
    }

    setSelectedCustomerId(created.id);
    setIsGuest(false);
    setIsAddingCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
  };

  // Split Payment Handlers
  const handleAddPaymentSplit = () => {
    const nextAmount = remainingDue > 0 ? remainingDue : 0;
    const newId = `split-${Date.now()}-${Math.random().toString(36).substring(2, 4)}`;
    setPaymentSplits((prev) => [...prev, { id: newId, method: 'CASH', amount: nextAmount }]);
  };

  const handleRemovePaymentSplit = (id: string) => {
    if (paymentSplits.length <= 1) return;
    setPaymentSplits((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateSplit = (
    id: string,
    updates: Partial<PaymentSplit>
  ) => {
    setPaymentSplits((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleSetSinglePaymentMethod = (method: 'CASH' | 'UPI' | 'CARD' | 'OTHER') => {
    setPaymentSplits([{ id: 'split-1', method, amount: grandTotal }]);
    if (method !== 'CASH') setCashTendered('');
  };

  // EXECUTE SETTLEMENT: SAVE FIRST, THEN PRINT
  const handleCompletePayment = async (shouldPrint: boolean) => {
    if (cart.length === 0) {
      store.addToast('Empty Bill', 'Add at least one product before checking out.', 'warning');
      return;
    }

    if (remainingDue > 0) {
      store.addToast('Payment Incomplete', `Remaining balance of ${formatINR(remainingDue)} must be tendered.`, 'error');
      return;
    }

    setIsProcessingPayment(true);
    setPrintError(null);

    const customerName = isGuest ? guestName : selectedCustomer?.name || 'Walk-in Patron';
    const customerPhone = isGuest ? guestPhone : selectedCustomer?.phone || '+91 99999 00000';
    const customerEmail = isGuest ? 'walkin@studiodeny.com' : selectedCustomer?.email || 'walkin@studiodeny.com';
    const customerCity = isGuest ? 'Mumbai' : selectedCustomer?.city || 'Mumbai';

    const effectiveDiscountReason =
      customDiscountReason.trim() ||
      (discountReason !== 'NONE'
        ? discountReason
        : totalDiscountAmount > 0
        ? `${discountValue}${discountType === 'PERCENT' ? '%' : '₹'} Discount`
        : undefined);

    const orderItems = cart.map((item) => ({
      productId: item.product.id,
      variantId: item.variant.id,
      name: item.product.name,
      variantName: `${item.variant.color} / ${item.variant.size}`,
      size: item.variant.size,
      color: item.variant.color,
      quantity: item.quantity,
      unitPrice: item.variant.price,
      total: item.variant.price * item.quantity - (item.itemDiscount || 0),
      itemDiscount: item.itemDiscount || 0,
      discountReason: item.itemDiscountReason,
    }));

    // Primary payment method label
    const primaryMethod =
      paymentSplits.length > 1
        ? 'SPLIT'
        : (paymentSplits[0]?.method as any) || 'UPI';

    const orderPayload = {
      customerId: isGuest ? 'guest' : selectedCustomerId,
      customerName,
      customerEmail,
      customerPhone,
      channel: 'OFFLINE' as const,
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
      discountType,
      discountPercent:
        discountType === 'PERCENT'
          ? discountValue
          : grossSubtotal > 0
          ? Math.round((totalDiscountAmount / grossSubtotal) * 100)
          : 0,
      discountReason: effectiveDiscountReason,
      shippingFee: 0,
      taxAmount,
      grandTotal,
      paymentStatus: 'PAID' as const,
      fulfillmentStatus: 'DELIVERED' as const, // Handed over in-store
      paymentMethod: primaryMethod,
      paymentSplits,
      tenderedAmount: numCashTendered > 0 ? numCashTendered : grandTotal,
      changeAmount: changeToReturn,
      notes: `In-store POS bill. Channel: OFFLINE. ${
        effectiveDiscountReason ? `Discount: [${effectiveDiscountReason}]. ` : ''
      }Tender: ${paymentSplits.map((s) => `${s.method}: ₹${s.amount}`).join(', ')}`,
    };

    try {
      let savedBill: Order;
      try {
        savedBill = await ordersApi.create(orderPayload);
      } catch (apiErr: any) {
        if (import.meta.env.VITE_ENABLE_MOCK_FALLBACK === 'true') {
          console.warn('[POS Billing] Backend API unavailable. Committing to local register.', apiErr);
          savedBill = store.createOrder(orderPayload);
        } else {
          store.addToast('Checkout Failed', apiErr.message || 'Error processing bill on backend.', 'error');
          setIsProcessingPayment(false);
          return;
        }
      }

      setIsProcessingPayment(false);
      setReceiptOrder(savedBill);

      // Clear register state for next transaction
      setCart([]);
      setDiscountValue(0);
      setDiscountReason('NONE');
      setCustomDiscountReason('');
      setPaymentSplits([{ id: 'split-1', method: 'UPI', amount: 0 }]);
      setCashTendered('');
      setMobileCartOpen(false);

      // 2. TRIGGER PRINT IF REQUESTED
      if (shouldPrint) {
        triggerThermalPrint(savedBill);
      }
    } catch (err: any) {
      setIsProcessingPayment(false);
      store.addToast('Error', err.message || 'Payment processing encountered an issue.', 'error');
    }
  };

  // Printing execution with dedicated isolated thermal print engine
  const triggerThermalPrint = (customOrder?: any) => {
    const orderToPrint = customOrder || receiptOrder;
    if (!orderToPrint) return;

    setIsPrinting(true);
    setPrintError(null);

    printThermalReceipt({
      orderNumber: orderToPrint.orderNumber,
      createdAt: orderToPrint.createdAt,
      customerName: orderToPrint.customerName,
      customerPhone: orderToPrint.customerPhone,
      items: orderToPrint.items,
      subtotal: orderToPrint.subtotal,
      discount: orderToPrint.discount,
      discountReason: orderToPrint.discountReason,
      discountPercent: orderToPrint.discountPercent,
      taxAmount: orderToPrint.taxAmount,
      grandTotal: orderToPrint.grandTotal,
      paymentMethod: orderToPrint.paymentMethod,
      paymentSplits: orderToPrint.paymentSplits,
      changeAmount: orderToPrint.changeAmount,
      storeSettings: {
        storeName: settings.storeName,
        address: settings.address,
        cityState: settings.cityState,
        gstin: settings.gstin,
        taxRate: settings.taxRate,
      },
    })
      .then(() => {
        setIsPrinting(false);
        store.addToast('Receipt Printed', 'Sent to Thermal POS-80 Register.', 'success');
      })
      .catch(() => {
        setIsPrinting(false);
        setPrintError('Printing failed. Thermal printer timeout or unavailable.');
        store.addToast('Printing Failed', 'Unable to reach printer. You can retry print.', 'error');
      });
  };

  const triggerTaxInvoicePrint = (customOrder?: any) => {
    const orderToPrint = customOrder || receiptOrder;
    if (!orderToPrint) return;

    setIsPrinting(true);
    setPrintError(null);

    printTaxInvoice({
      orderNumber: orderToPrint.orderNumber,
      createdAt: orderToPrint.createdAt,
      customerName: orderToPrint.customerName,
      customerPhone: orderToPrint.customerPhone,
      customerEmail: orderToPrint.customerEmail,
      items: orderToPrint.items,
      subtotal: orderToPrint.subtotal,
      discount: orderToPrint.discount,
      discountReason: orderToPrint.discountReason,
      discountPercent: orderToPrint.discountPercent,
      taxAmount: orderToPrint.taxAmount,
      grandTotal: orderToPrint.grandTotal,
      paymentMethod: orderToPrint.paymentMethod,
      paymentSplits: orderToPrint.paymentSplits,
      changeAmount: orderToPrint.changeAmount,
      storeSettings: {
        storeName: settings.storeName,
        address: settings.address,
        cityState: settings.cityState,
        gstin: settings.gstin,
        pan: settings.pan,
        taxRate: settings.taxRate,
      },
    })
      .then(() => {
        setIsPrinting(false);
        store.addToast('Tax Invoice Generated', 'Sent to A4 Invoice Printer.', 'success');
      })
      .catch(() => {
        setIsPrinting(false);
        setPrintError('Invoice generation failed.');
      });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* POS Screen Header Bar */}
      <div className="bg-[#0A0A0A] text-white p-3.5 sm:p-4 border border-[#0A0A0A] flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white text-[#0A0A0A] flex items-center justify-center font-black text-xs font-display">
            SD
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-base sm:text-lg tracking-tight">
                POS BILLING TERMINAL
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-neutral-800 text-neutral-300">
                MUMBAI FLAGSHIP
              </span>
            </div>
            <div className="text-[10px] font-mono text-neutral-400">
              PRINTER: {settings.printer?.name || 'POS-80 THERMAL'} (ONLINE)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-[11px] font-mono px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
            >
              CLEAR REGISTER
            </button>
          )}

          {/* iPad Portrait Cart Opener */}
          <button
            onClick={() => setMobileCartOpen(true)}
            className="lg:hidden bg-white text-[#0A0A0A] px-3.5 py-1.5 text-xs font-mono font-bold flex items-center gap-2 shadow-sm"
          >
            <ShoppingBag size={14} />
            <span>BILL ({totalItemCount}) · {formatINR(grandTotal)}</span>
          </button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/bills')}
            className="text-xs bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700"
          >
            BILLS HISTORY
          </Button>
        </div>
      </div>

      {/* Main Split: Left Catalog Grid vs Right Sticky Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* =========================================================================
            LEFT AREA (COL 7): PRODUCT CATALOG & TOUCH SELECTION
        ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 font-mono text-xs border-b border-[#CFCFD2]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-2 uppercase font-bold tracking-wider transition-colors shrink-0 ${
                  activeCategory === cat
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-white text-[#666666] border border-[#CFCFD2] hover:text-[#0A0A0A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Fast Search Input */}
          <div className="flex items-center gap-3 bg-white p-3 border border-[#CFCFD2]">
            <Search size={16} className="text-[#888888]" />
            <input
              type="text"
              placeholder="Search by silhouette, SKU, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent font-mono text-xs focus:outline-none placeholder:text-[#888888]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[#888888] hover:text-[#0A0A0A]">
                <X size={15} />
              </button>
            )}
          </div>

          {/* Touch-First Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => handleProductTap(prod)}
                className="bg-white border border-[#CFCFD2] hover:border-[#0A0A0A] p-2.5 flex flex-col justify-between cursor-pointer group transition-all shadow-xs select-none active:scale-[0.99]"
              >
                <div className="aspect-square bg-[#F1F1F3] overflow-hidden border border-[#E5E5E7] relative">
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute bottom-1.5 right-1.5 bg-[#0A0A0A]/90 text-white text-[9px] font-mono px-1.5 py-0.5">
                    {prod.totalStock} in stock
                  </div>
                </div>

                <div className="mt-2.5 space-y-1">
                  <div className="text-[9px] font-mono text-[#888888] uppercase tracking-wider truncate">
                    {prod.sku}
                  </div>
                  <h4 className="font-bold text-xs text-[#0A0A0A] group-hover:underline line-clamp-1">
                    {prod.name}
                  </h4>
                  <div className="flex items-center justify-between font-mono text-xs pt-0.5">
                    <span className="font-black text-[#0A0A0A]">{formatINR(prod.price)}</span>
                    <span className="text-[10px] text-[#666666] bg-[#F1F1F3] px-1.5 py-0.5 border border-[#E5E5E7]">
                      {prod.variants.length} {prod.variants.length === 1 ? 'size' : 'sizes'}
                    </span>
                  </div>

                  {/* Inline quick-tap size chips for rapid 1-tap addition */}
                  {prod.variants.length > 1 && (
                    <div className="pt-1.5 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                      {prod.variants.map((v) => (
                        <button
                          key={v.id}
                          disabled={v.stock <= 0}
                          onClick={() => handleAddVariantToCart(prod, v)}
                          className="px-2 py-1 bg-[#F1F1F3] hover:bg-[#0A0A0A] hover:text-white border border-[#CFCFD2] text-[10px] font-bold disabled:opacity-30 transition-colors"
                          title={`${v.color} - ${v.stock} in stock`}
                        >
                          {v.size}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* =========================================================================
            RIGHT AREA (COL 5): STICKY CART & MULTI-TENDER PAYMENT REGISTER
        ========================================================================= */}
        <div
          className={`lg:col-span-5 bg-white border border-[#CFCFD2] flex flex-col shadow-subtle lg:sticky lg:top-20 max-h-[calc(100vh-100px)] overflow-hidden ${
            mobileCartOpen
              ? 'fixed inset-0 z-50 p-4 bg-white overflow-y-auto'
              : 'hidden lg:flex'
          }`}
        >
          {/* Mobile Close Cart Header */}
          <div className="lg:hidden flex items-center justify-between pb-3 mb-2 border-b border-[#CFCFD2]">
            <span className="font-display font-extrabold text-sm uppercase">CURRENT BILL REGISTER</span>
            <button
              onClick={() => setMobileCartOpen(false)}
              className="p-2 border border-[#CFCFD2]"
            >
              <X size={18} />
            </button>
          </div>

          {/* 1. COMPACT CUSTOMER SELECTOR */}
          <div className="p-3.5 border-b border-[#CFCFD2] bg-[#FAFAFA] space-y-2 select-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#888888] flex items-center gap-1.5">
                <User size={12} /> PATRON PROFILE
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsGuest(!isGuest)}
                  className="text-[10px] font-mono uppercase underline text-[#666666] hover:text-[#0A0A0A]"
                >
                  {isGuest ? 'SELECT REGISTERED' : 'WALK-IN GUEST'}
                </button>
                <button
                  onClick={() => setIsAddingCustomer(!isAddingCustomer)}
                  className="text-[10px] font-mono uppercase bg-white border border-[#CFCFD2] px-2 py-0.5 hover:border-[#0A0A0A] flex items-center gap-1"
                >
                  <UserPlus size={10} /> + ADD
                </button>
              </div>
            </div>

            {/* Quick Add Customer Inline Drawer */}
            {isAddingCustomer && (
              <form onSubmit={handleQuickAddCustomer} className="p-2.5 bg-white border border-[#0A0A0A] space-y-2">
                <div className="text-[10px] font-mono font-bold uppercase">QUICK REGISTER PATRON</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Full Name *"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="p-1.5 border border-[#CFCFD2] font-mono text-xs focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Phone (e.g. 98200...)"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="p-1.5 border border-[#CFCFD2] font-mono text-xs focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomer(false)}
                    className="px-2 py-1 text-[10px] font-mono border border-[#CFCFD2]"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-[10px] font-mono bg-[#0A0A0A] text-white font-bold"
                  >
                    SAVE & SELECT
                  </button>
                </div>
              </form>
            )}

            {isGuest ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Guest Name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="p-2 bg-white border border-[#CFCFD2] text-xs font-mono focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Guest Phone"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="p-2 bg-white border border-[#CFCFD2] text-xs font-mono focus:outline-none"
                />
              </div>
            ) : (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-white border border-[#CFCFD2] p-2 text-xs font-mono focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.phone} ({c.segment})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. CART ITEMS LIST */}
          <div className="p-3.5 flex-1 overflow-y-auto max-h-[220px] divide-y divide-[#E5E5E7]">
            {cart.length === 0 ? (
              <div className="py-10 text-center font-mono text-[#888888] space-y-1.5">
                <ShoppingBag size={24} className="mx-auto text-[#CFCFD2]" />
                <div className="text-xs font-bold text-[#0A0A0A]">BILL REGISTER IS EMPTY</div>
                <div className="text-[11px]">Tap garments from the left catalog to add to bill</div>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.variant.id} className="py-2.5 space-y-1.5 font-mono text-xs">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[#0A0A0A] truncate">{item.product.name}</div>
                      <div className="text-[10px] text-[#666666] flex items-center gap-1.5 mt-0.5">
                        <span className="font-bold bg-[#0A0A0A] text-white px-1">
                          {item.variant.size}
                        </span>
                        <span>{item.variant.color}</span>
                        <span>·</span>
                        <span>{formatINR(item.variant.price)}</span>
                      </div>
                    </div>

                    {/* Touch-Friendly Stepper */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleUpdateQuantity(item.variant.id, -1)}
                        className="w-7 h-7 border border-[#CFCFD2] hover:bg-[#F1F1F3] active:bg-[#0A0A0A] active:text-white flex items-center justify-center text-[#0A0A0A] font-bold text-sm"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.variant.id, 1)}
                        className="w-7 h-7 border border-[#CFCFD2] hover:bg-[#F1F1F3] active:bg-[#0A0A0A] active:text-white flex items-center justify-center text-[#0A0A0A] font-bold text-sm"
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Line Total & Remove */}
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        {item.itemDiscount && item.itemDiscount > 0 ? (
                          <div>
                            <div className="text-[10px] text-[#888888] line-through">
                              {formatINR(item.variant.price * item.quantity)}
                            </div>
                            <div className="font-bold text-emerald-700">
                              {formatINR(item.variant.price * item.quantity - item.itemDiscount)}
                            </div>
                          </div>
                        ) : (
                          <span className="font-bold text-[#0A0A0A]">
                            {formatINR(item.variant.price * item.quantity)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.variant.id)}
                        className="text-[#888888] hover:text-red-600 p-1"
                        aria-label="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Item-level discount trigger & active badge */}
                  <div className="flex items-center justify-between text-[10px] pt-0.5">
                    {item.itemDiscount && item.itemDiscount > 0 ? (
                      <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded-xs">
                        <span className="font-bold">
                          -{formatINR(item.itemDiscount)} ({item.itemDiscountReason || 'Special Disc'})
                        </span>
                        <button
                          onClick={() => handleRemoveItemDiscount(item.variant.id)}
                          className="text-emerald-900 hover:text-red-600 underline font-bold ml-1"
                          title="Clear item discount"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <span className="text-[9px] text-[#888888]">NO ITEM DISCOUNT</span>
                    )}

                    <button
                      onClick={() => handleOpenItemDiscount(item)}
                      className={`px-1.5 py-0.5 border text-[9px] font-bold uppercase transition-colors ${
                        item.itemDiscount
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-[#555555] border-[#CFCFD2] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'
                      }`}
                    >
                      <Percent size={9} className="inline mr-0.5" />
                      {item.itemDiscount ? 'EDIT DISC' : '+ ITEM DISC'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 3. ADVANCED CUSTOM DISCOUNT & LEDGER SUMMARY */}
          <div className="p-3.5 border-t border-[#CFCFD2] bg-[#FAFAFA] space-y-3 font-mono text-xs">
            {/* Discount Engine Header & Mode Switch */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#0A0A0A] font-bold text-[11px] uppercase tracking-wide">
                  <Tag size={12} />
                  <span>CUSTOM BILL DISCOUNT</span>
                </div>
                <div className="flex items-center border border-[#CFCFD2] bg-white text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('PERCENT');
                      if (discountType === 'FIXED') setDiscountValue(0);
                    }}
                    className={`px-2 py-0.5 transition-colors ${
                      discountType === 'PERCENT'
                        ? 'bg-[#0A0A0A] text-white'
                        : 'text-[#666666] hover:text-[#0A0A0A]'
                    }`}
                  >
                    % PERCENT
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('FIXED');
                      if (discountType === 'PERCENT') setDiscountValue(0);
                    }}
                    className={`px-2 py-0.5 transition-colors ${
                      discountType === 'FIXED'
                        ? 'bg-[#0A0A0A] text-white'
                        : 'text-[#666666] hover:text-[#0A0A0A]'
                    }`}
                  >
                    ₹ FLAT CASH
                  </button>
                </div>
              </div>

              {/* Presets & Custom Value Row */}
              <div className="flex flex-wrap items-center gap-1">
                {discountType === 'PERCENT' ? (
                  <>
                    {[0, 5, 10, 15, 20, 25, 30, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setDiscountValue(pct)}
                        className={`px-1.5 py-0.5 border text-[10px] transition-colors ${
                          discountValue === pct
                            ? 'bg-[#0A0A0A] text-white border-[#0A0A0A] font-bold'
                            : 'bg-white text-[#666666] border-[#CFCFD2] hover:border-[#0A0A0A]'
                        }`}
                      >
                        {pct === 0 ? '0%' : `${pct}%`}
                      </button>
                    ))}
                    <div className="flex items-center ml-auto border border-[#CFCFD2] bg-white px-1.5 py-0.5">
                      <span className="text-[10px] text-[#888888] mr-1">CUSTOM:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        placeholder="%"
                        value={discountValue || ''}
                        onChange={(e) => setDiscountValue(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                        className="w-10 text-[10px] font-mono font-bold text-right focus:outline-none"
                      />
                      <span className="text-[10px] font-bold text-[#0A0A0A] ml-0.5">%</span>
                    </div>
                  </>
                ) : (
                  <>
                    {[0, 100, 250, 500, 1000].map((flat) => (
                      <button
                        key={flat}
                        type="button"
                        onClick={() => setDiscountValue(flat)}
                        className={`px-1.5 py-0.5 border text-[10px] transition-colors ${
                          discountValue === flat
                            ? 'bg-[#0A0A0A] text-white border-[#0A0A0A] font-bold'
                            : 'bg-white text-[#666666] border-[#CFCFD2] hover:border-[#0A0A0A]'
                        }`}
                      >
                        {flat === 0 ? '₹0' : `₹${flat}`}
                      </button>
                    ))}
                    <div className="flex items-center ml-auto border border-[#CFCFD2] bg-white px-1.5 py-0.5">
                      <span className="text-[10px] text-[#888888] mr-1">CUSTOM:</span>
                      <span className="text-[10px] font-bold text-[#0A0A0A] mr-0.5">₹</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max={subtotalAfterItemDisc}
                        placeholder="0"
                        value={discountValue || ''}
                        onChange={(e) => setDiscountValue(Math.min(subtotalAfterItemDisc, Math.max(0, Number(e.target.value) || 0)))}
                        className="w-14 text-[10px] font-mono font-bold text-right focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Discount Reason & Authorization Code */}
              {(discountValue > 0 || totalDiscountAmount > 0) && (
                <div className="pt-1 space-y-1.5 border-t border-[#E5E5E7]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#666666] font-bold uppercase shrink-0">REASON:</span>
                    <select
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      className="w-full bg-white border border-[#CFCFD2] p-1 text-[10px] font-mono focus:outline-none"
                    >
                      {DISCOUNT_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                  </div>

                  {discountReason === 'CUSTOM' && (
                    <input
                      type="text"
                      placeholder="Write authorization remark / promo code (e.g. VIP-FLAGSHIP-20)..."
                      value={customDiscountReason}
                      onChange={(e) => setCustomDiscountReason(e.target.value)}
                      className="w-full p-1 bg-white border border-[#0A0A0A] text-[10px] font-mono focus:outline-none"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Calculations Ledger */}
            <div className="space-y-1 pt-2 border-t border-[#E5E5E7] text-[11px]">
              <div className="flex justify-between text-[#666666]">
                <span>GROSS SUBTOTAL ({totalItemCount} ITEMS):</span>
                <span className="font-semibold text-[#0A0A0A]">{formatINR(grossSubtotal)}</span>
              </div>

              {itemDiscountsTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>ITEM-LEVEL SAVINGS:</span>
                  <span>-{formatINR(itemDiscountsTotal)}</span>
                </div>
              )}

              {billDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>
                    BILL DISCOUNT ({discountType === 'PERCENT' ? `${discountValue}%` : formatINR(discountValue)})
                    {discountReason !== 'NONE' && (
                      <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-900 px-1 py-0.2 border border-emerald-300">
                        {discountReason === 'CUSTOM' && customDiscountReason ? customDiscountReason : discountReason}
                      </span>
                    )}:
                  </span>
                  <span className="font-semibold">-{formatINR(billDiscountAmount)}</span>
                </div>
              )}

              {totalDiscountAmount > 0 && (
                <div className="flex justify-between font-bold text-emerald-800 bg-emerald-50 px-2 py-1 border border-emerald-200">
                  <span>TOTAL SAVINGS APPLIED:</span>
                  <span>-{formatINR(totalDiscountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-[#666666]">
                <span>NET TAXABLE VALUE:</span>
                <span>{formatINR(taxableAmount)}</span>
              </div>

              <div className="flex justify-between text-[#666666]">
                <span>GST APPAREL TAX ({taxRate}%):</span>
                <span>{formatINR(taxAmount)}</span>
              </div>

              {/* DOMINANT GRAND TOTAL */}
              <div className="flex justify-between items-baseline pt-2 border-t-2 border-[#0A0A0A]">
                <span className="font-bold text-sm text-[#0A0A0A] uppercase tracking-wider">
                  TOTAL DUE:
                </span>
                <span className="font-black text-2xl sm:text-3xl text-[#0A0A0A] tracking-tight">
                  {formatINR(grandTotal)}
                </span>
              </div>
            </div>

            {/* 4. MULTI-TENDER PAYMENT SECTION */}
            <div className="pt-2 border-t border-[#CFCFD2] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
                  PAYMENT TENDER
                </span>
                <button
                  type="button"
                  onClick={handleAddPaymentSplit}
                  className="text-[10px] uppercase font-bold text-[#0A0A0A] underline hover:text-neutral-700 flex items-center gap-1"
                >
                  <Plus size={11} /> ADD PAYMENT METHOD
                </button>
              </div>

              {/* Quick 1-tap tender presets if single payment */}
              {paymentSplits.length === 1 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {(['UPI', 'CARD', 'CASH', 'OTHER'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSetSinglePaymentMethod(m)}
                      className={`py-1.5 px-1 border text-center font-bold text-[10px] transition-colors ${
                        paymentSplits[0].method === m
                          ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                          : 'bg-white text-[#555555] border-[#CFCFD2] hover:border-[#0A0A0A]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}

              {/* Payment Splits Rows */}
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {paymentSplits.map((split) => (
                  <div key={split.id} className="flex items-center gap-2 bg-white p-1.5 border border-[#CFCFD2]">
                    <select
                      value={split.method}
                      onChange={(e) =>
                        handleUpdateSplit(split.id, {
                          method: e.target.value as any,
                        })
                      }
                      className="bg-[#F1F1F3] border border-[#CFCFD2] text-[10px] font-bold p-1 focus:outline-none"
                    >
                      <option value="UPI">UPI / QR</option>
                      <option value="CASH">CASH</option>
                      <option value="CARD">CARD POS</option>
                      <option value="OTHER">OTHER</option>
                    </select>

                    <div className="flex-1 flex items-center gap-1 font-mono text-xs">
                      <span className="text-[#888888]">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        value={split.amount || ''}
                        onChange={(e) =>
                          handleUpdateSplit(split.id, {
                            amount: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-transparent font-bold focus:outline-none"
                      />
                    </div>

                    {paymentSplits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePaymentSplit(split.id)}
                        className="text-[#888888] hover:text-red-600 p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Cash Change Tender Calculation (When Cash is selected) */}
              {cashSplit && (
                <div className="p-2 bg-[#F1F1F3] border border-[#CFCFD2] space-y-1 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">CASH RECEIVED:</span>
                    <div className="flex items-center gap-1">
                      <span>₹</span>
                      <input
                        type="number"
                        placeholder={String(cashAmountExpected)}
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="w-24 p-1 bg-white border border-[#CFCFD2] text-right font-bold focus:outline-none"
                      />
                    </div>
                  </div>
                  {numCashTendered > 0 && (
                    <div className="flex items-center justify-between font-bold text-emerald-800 pt-1 border-t border-[#E5E5E7]">
                      <span>CHANGE TO RETURN:</span>
                      <span className="text-sm font-black">{formatINR(changeToReturn)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Status: Paid vs Remaining Due */}
              <div className="pt-1 flex items-center justify-between text-[11px] font-bold">
                <span className="text-[#666666]">TOTAL TENDERED:</span>
                <span>{formatINR(amountPaid)}</span>
              </div>

              {remainingDue > 0 && (
                <div className="flex items-center justify-between text-[11px] font-bold text-rose-700 bg-rose-50 p-1.5 border border-rose-200">
                  <span className="flex items-center gap-1">
                    <AlertCircle size={13} />
                    <span>REMAINING DUE:</span>
                  </span>
                  <span>{formatINR(remainingDue)}</span>
                </div>
              )}
            </div>

            {/* 5. PAY & PRINT BUTTONS (SAVED FIRST) */}
            <div className="pt-2 space-y-2">
              {/* Dominant PAY & PRINT Button */}
              <button
                type="button"
                disabled={cart.length === 0 || remainingDue > 0 || isProcessingPayment}
                onClick={() => handleCompletePayment(true)}
                className="w-full py-3.5 bg-[#0A0A0A] text-white font-mono font-bold text-sm tracking-widest uppercase hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2.5 shadow-md active:scale-[0.99] cursor-pointer"
              >
                {isProcessingPayment ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>SAVING & PRINTING...</span>
                  </>
                ) : (
                  <>
                    <Printer size={16} />
                    <span>PAY & PRINT [{formatINR(grandTotal)}]</span>
                  </>
                )}
              </button>

              {/* PAY WITHOUT PRINT Button */}
              <button
                type="button"
                disabled={cart.length === 0 || remainingDue > 0 || isProcessingPayment}
                onClick={() => handleCompletePayment(false)}
                className="w-full py-2 bg-white text-[#0A0A0A] border border-[#CFCFD2] hover:border-[#0A0A0A] font-mono font-bold text-xs uppercase disabled:opacity-30 transition-colors"
              >
                PAY WITHOUT PRINT
              </button>

              {remainingDue > 0 && cart.length > 0 && (
                <div className="text-[10px] text-center text-rose-600 font-mono">
                  * Full amount must be tendered to settle bill.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          VARIANT SELECTION MODAL / DRAWER (Zero-friction 1-tap size selection)
      ========================================================================= */}
      {activeVariantProduct && (
        <Modal
          isOpen={!!activeVariantProduct}
          onClose={() => setActiveVariantProduct(null)}
          title={`CHOOSE SIZE — ${activeVariantProduct.name}`}
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3 p-3 bg-[#F1F1F3] border border-[#CFCFD2]">
              <img
                src={activeVariantProduct.image}
                alt={activeVariantProduct.name}
                className="w-14 h-14 object-cover border border-[#CFCFD2]"
              />
              <div>
                <div className="font-bold text-sm text-[#0A0A0A]">{activeVariantProduct.name}</div>
                <div className="text-[11px] text-[#666666]">
                  SKU: {activeVariantProduct.sku} · {formatINR(activeVariantProduct.price)}
                </div>
                <div className="text-[10px] text-[#888888] mt-0.5">
                  Collection: {activeVariantProduct.collection}
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#888888] block mb-2 font-bold">
                SELECT SIZE TO ADD TO CURRENT BILL:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {activeVariantProduct.variants.map((v) => (
                  <button
                    key={v.id}
                    disabled={v.stock <= 0}
                    onClick={() => handleAddVariantToCart(activeVariantProduct, v)}
                    className="p-3 border border-[#CFCFD2] hover:border-[#0A0A0A] hover:bg-[#FAFAFA] active:bg-[#0A0A0A] active:text-white disabled:opacity-30 disabled:bg-neutral-100 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <span className="font-display font-black text-xl">
                      {v.size}
                    </span>
                    <span className="text-[10px] opacity-80">{v.color}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 mt-1 ${
                        v.stock <= 0
                          ? 'bg-red-100 text-red-700'
                          : v.stock < 5
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-[#F1F1F3] text-[#0A0A0A]'
                      }`}
                    >
                      {v.stock <= 0 ? 'SOLD OUT' : `${v.stock} in stock`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          COMPLETED TRANSACTION & 80mm THERMAL RECEIPT MODAL
      ========================================================================= */}
      {receiptOrder && (
        <Modal
          isOpen={!!receiptOrder}
          onClose={() => setReceiptOrder(null)}
          title="TRANSACTION SETTLED · THERMAL INVOICE ISSUED"
        >
          <div className="space-y-4 font-mono text-xs">
            {/* Print Error / Warning Banner if printing failed */}
            {printError && (
              <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between no-print">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{printError} (Transaction remains saved)</span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={triggerThermalPrint}
                  className="bg-white text-xs"
                >
                  <RefreshCw size={12} className="mr-1" /> Retry Print
                </Button>
              </div>
            )}

            {/* 80mm Stylized Thermal Paper Slip Preview */}
            <div className="thermal-receipt-print p-6 bg-white border border-dashed border-[#0A0A0A] shadow-md max-w-sm mx-auto text-center space-y-3 animate-in slide-in-from-top-4 duration-300">
              <div className="border-b border-[#CFCFD2] pb-3">
                <div className="font-display font-black text-2xl tracking-tighter">
                  STUDIO DENY
                </div>
                <div className="text-[10px] tracking-widest text-[#666666] uppercase mt-0.5">
                  HIGH-CLASS STREETWEAR FLAGSHIP
                </div>
                <div className="text-[9px] text-[#888888] mt-0.5">
                  {settings.address || 'Flagship Store, Bandra West, Mumbai'}
                </div>
                <div className="text-[9px] text-[#888888]">
                  GSTIN: {settings.gstin || '27AAACS1429B1ZX'}
                </div>
              </div>

              <div className="text-left text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#666666]">INVOICE #:</span>
                  <span className="font-bold">{receiptOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">TIMESTAMP:</span>
                  <span>{receiptOrder.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">PATRON:</span>
                  <span className="font-semibold">{receiptOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">PHONE:</span>
                  <span>{receiptOrder.customerPhone}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="border-t border-b border-[#CFCFD2] py-2 text-left space-y-2 text-[11px]">
                {receiptOrder.items.map((i: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <div className="font-bold">{i.name}</div>
                      <div className="text-[10px] text-[#666666]">
                        {i.variantName} × {i.quantity} @ {formatINR(i.unitPrice)}
                      </div>
                    </div>
                    <span className="font-bold">{formatINR(i.total)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="text-right text-[11px] space-y-1">
                <div className="flex justify-between text-[#666666]">
                  <span>SUBTOTAL:</span>
                  <span>{formatINR(receiptOrder.subtotal)}</span>
                </div>
                {receiptOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>DISCOUNT:</span>
                    <span>-{formatINR(receiptOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#666666]">
                  <span>GST ({settings.taxRate || 12}%):</span>
                  <span>{formatINR(receiptOrder.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-black text-base border-t border-[#0A0A0A] pt-1 text-[#0A0A0A]">
                  <span>TOTAL PAID:</span>
                  <span>{formatINR(receiptOrder.grandTotal)}</span>
                </div>
              </div>

              {/* Split Tender Breakdown */}
              <div className="border-t border-[#E5E5E7] pt-2 text-left text-[10px] space-y-0.5">
                <div className="font-bold uppercase text-[#444444]">SETTLEMENT TENDER:</div>
                {receiptOrder.paymentSplits && receiptOrder.paymentSplits.length > 0 ? (
                  receiptOrder.paymentSplits.map((s: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[#666666]">
                      <span>{s.method}:</span>
                      <span className="font-semibold">{formatINR(s.amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between text-[#666666]">
                    <span>{receiptOrder.paymentMethod}:</span>
                    <span className="font-semibold">{formatINR(receiptOrder.grandTotal)}</span>
                  </div>
                )}
                {receiptOrder.changeAmount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold pt-0.5">
                    <span>CASH CHANGE RETURNED:</span>
                    <span>{formatINR(receiptOrder.changeAmount)}</span>
                  </div>
                )}
              </div>

              {/* Vector Barcode & Policy */}
              <div className="pt-2 border-t border-[#E5E5E7] space-y-1 text-center">
                <BarcodeSvg value={receiptOrder.orderNumber} width={180} height={28} />
                <div className="text-[9px] text-[#888888] uppercase mt-1">
                  ALL SALES FINAL ON CAPSULE RELEASES · DENY TERMINAL #01
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2 no-print">
              <Button
                variant="secondary"
                onClick={() => triggerThermalPrint()}
                disabled={isPrinting}
                className="text-xs"
              >
                <Printer size={13} className="mr-1.5" />
                {isPrinting ? 'Printing...' : '80mm Slip'}
              </Button>

              <Button
                variant="secondary"
                onClick={() => triggerTaxInvoicePrint()}
                disabled={isPrinting}
                className="text-xs"
              >
                <FileText size={13} className="mr-1.5" />
                A4 Tax Invoice
              </Button>

              <Button
                variant="primary"
                onClick={() => setReceiptOrder(null)}
                className="text-xs font-bold"
              >
                Start Next Bill <ArrowRight size={13} className="ml-1.5" />
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Item-Level Custom Discount Modal */}
      {itemDiscountTarget && (
        <Modal
          isOpen={!!itemDiscountTarget}
          onClose={() => setItemDiscountTarget(null)}
          title="ITEM-LEVEL CUSTOM DISCOUNT"
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="p-3 bg-[#F1F1F3] border border-[#CFCFD2] space-y-1">
              <div className="font-display font-bold text-sm text-[#0A0A0A]">
                {itemDiscountTarget.product.name}
              </div>
              <div className="text-[11px] text-[#666666]">
                Size: <span className="font-bold text-[#0A0A0A]">{itemDiscountTarget.variant.size}</span> · Color:{' '}
                <span className="font-bold text-[#0A0A0A]">{itemDiscountTarget.variant.color}</span>
              </div>
              <div className="text-[11px] text-[#666666]">
                Qty: {itemDiscountTarget.quantity} × {formatINR(itemDiscountTarget.variant.price)} ={' '}
                <span className="font-bold text-[#0A0A0A]">
                  {formatINR(itemDiscountTarget.variant.price * itemDiscountTarget.quantity)}
                </span>
              </div>
            </div>

            {/* Mode Switch */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">
                DISCOUNT TYPE:
              </label>
              <div className="flex border border-[#0A0A0A]">
                <button
                  type="button"
                  onClick={() => setItemDiscType('PERCENT')}
                  className={`flex-1 py-1.5 text-center font-bold transition-colors ${
                    itemDiscType === 'PERCENT' ? 'bg-[#0A0A0A] text-white' : 'bg-white text-[#666666]'
                  }`}
                >
                  % PERCENTAGE
                </button>
                <button
                  type="button"
                  onClick={() => setItemDiscType('FIXED')}
                  className={`flex-1 py-1.5 text-center font-bold transition-colors ${
                    itemDiscType === 'FIXED' ? 'bg-[#0A0A0A] text-white' : 'bg-white text-[#666666]'
                  }`}
                >
                  ₹ FLAT AMOUNT
                </button>
              </div>
            </div>

            {/* Discount Value */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">
                DISCOUNT VALUE ({itemDiscType === 'PERCENT' ? '%' : '₹'}):
              </label>
              <input
                type="number"
                min="0"
                max={
                  itemDiscType === 'PERCENT'
                    ? 100
                    : itemDiscountTarget.variant.price * itemDiscountTarget.quantity
                }
                value={itemDiscVal || ''}
                onChange={(e) => setItemDiscVal(Number(e.target.value) || 0)}
                placeholder={itemDiscType === 'PERCENT' ? 'e.g. 15%' : 'e.g. ₹300'}
                className="w-full p-2 bg-white border border-[#CFCFD2] text-sm font-mono focus:outline-none focus:border-[#0A0A0A]"
              />
            </div>

            {/* Discount Reason */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">
                REASON / REMARK:
              </label>
              <input
                type="text"
                value={itemDiscReason}
                onChange={(e) => setItemDiscReason(e.target.value)}
                placeholder="e.g. Floor display unit, Manager special, Sample piece..."
                className="w-full p-2 bg-white border border-[#CFCFD2] text-xs font-mono focus:outline-none focus:border-[#0A0A0A]"
              />
            </div>

            {/* Live Calculation Preview */}
            <div className="p-3 bg-emerald-50 border border-emerald-300 space-y-1 text-emerald-900">
              <div className="flex justify-between">
                <span>Calculated Item Savings:</span>
                <span className="font-bold">
                  -
                  {formatINR(
                    itemDiscType === 'PERCENT'
                      ? Math.round(
                          (itemDiscountTarget.variant.price *
                            itemDiscountTarget.quantity *
                            Math.min(100, itemDiscVal)) /
                            100
                        )
                      : Math.min(
                          itemDiscountTarget.variant.price * itemDiscountTarget.quantity,
                          itemDiscVal
                        )
                  )}
                </span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-emerald-200">
                <span>Revised Item Line Total:</span>
                <span>
                  {formatINR(
                    Math.max(
                      0,
                      itemDiscountTarget.variant.price * itemDiscountTarget.quantity -
                        (itemDiscType === 'PERCENT'
                          ? Math.round(
                              (itemDiscountTarget.variant.price *
                                itemDiscountTarget.quantity *
                                Math.min(100, itemDiscVal)) /
                                100
                            )
                          : Math.min(
                              itemDiscountTarget.variant.price * itemDiscountTarget.quantity,
                              itemDiscVal
                            ))
                    )
                  )}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              {itemDiscountTarget.itemDiscount && itemDiscountTarget.itemDiscount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    handleRemoveItemDiscount(itemDiscountTarget.variant.id);
                    setItemDiscountTarget(null);
                  }}
                  className="text-red-600 hover:underline text-xs"
                >
                  REMOVE DISCOUNT
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setItemDiscountTarget(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleApplyItemDiscount}>
                  Apply Discount
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
