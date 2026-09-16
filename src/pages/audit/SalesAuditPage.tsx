import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../services/store';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { Button } from '../../components/ui/Button';
import { formatINR, formatDate } from '../../utils/formatters';
import {
  FileCheck,
  Store,
  Globe,
  Receipt,
  Printer,
  Banknote,
  CreditCard,
  QrCode,
  Split,
  Search,
  ArrowRight,
  Download,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  Tag,
  ShieldCheck,
} from 'lucide-react';

export const SalesAuditPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders, returns, payments, settings } = useStore();

  const [channelFilter, setChannelFilter] = useState<'ALL' | 'OFFLINE' | 'ONLINE'>('ALL');
  const [search, setSearch] = useState('');
  const [timeRange, setTimeRange] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');

  // Today string YYYY-MM-DD
  const todayStr = new Date().toISOString().substring(0, 10);

  // Time-filtered orders
  const timeFilteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (timeRange === 'TODAY') {
        return o.createdAt.startsWith(todayStr);
      }
      if (timeRange === 'WEEK') {
        const orderDate = new Date(o.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orderDate >= weekAgo;
      }
      if (timeRange === 'MONTH') {
        const currentMonth = todayStr.substring(0, 7);
        return o.createdAt.startsWith(currentMonth);
      }
      return true;
    });
  }, [orders, timeRange, todayStr]);

  // Separate Orders by Sales Channel
  const offlineOrders = useMemo(() => {
    return timeFilteredOrders.filter((o) => o.channel === 'OFFLINE' || (!o.channel && o.notes?.toLowerCase().includes('in-store')));
  }, [timeFilteredOrders]);

  const onlineOrders = useMemo(() => {
    return timeFilteredOrders.filter((o) => o.channel === 'ONLINE' || (!o.channel && !o.notes?.toLowerCase().includes('in-store')));
  }, [timeFilteredOrders]);

  // Channel Metrics Calculations
  const offlineGross = offlineOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const offlineDiscounts = offlineOrders.reduce((sum, o) => sum + (o.discount || 0), 0);
  const offlineTax = offlineOrders.reduce((sum, o) => sum + o.taxAmount, 0);
  const offlineNetTotal = offlineOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const offlineAov = offlineOrders.length > 0 ? Math.round(offlineNetTotal / offlineOrders.length) : 0;
  const offlineOrderIds = useMemo(() => new Set(offlineOrders.map((o) => o.id)), [offlineOrders]);
  const offlineUnsettledReturns = returns.filter(
    (r) => offlineOrderIds.has(r.orderId) && r.status !== 'REFUNDED' && r.status !== 'REJECTED'
  ).length;

  // Staff accountability - who settled which POS bills, and how much
  // discount each staff member has given out. Only offline (counter) bills
  // carry a real staff_id; online orders are self-checkout, no staff to
  // attribute.
  const staffBreakdown = useMemo(() => {
    const byStaff = new Map<
      string,
      { staffId: string; staffName: string; billCount: number; totalDiscount: number; netRevenue: number }
    >();
    offlineOrders.forEach((o) => {
      const key = o.staffId || 'unknown';
      const name = o.staffName || 'Unknown Operator';
      const entry = byStaff.get(key) || { staffId: key, staffName: name, billCount: 0, totalDiscount: 0, netRevenue: 0 };
      entry.billCount += 1;
      entry.totalDiscount += o.discount || 0;
      entry.netRevenue += o.grandTotal;
      byStaff.set(key, entry);
    });
    return Array.from(byStaff.values()).sort((a, b) => b.totalDiscount - a.totalDiscount);
  }, [offlineOrders]);

  const onlineGross = onlineOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const onlineDiscounts = onlineOrders.reduce((sum, o) => sum + (o.discount || 0), 0);
  const onlineTax = onlineOrders.reduce((sum, o) => sum + o.taxAmount, 0);
  const onlineShipping = onlineOrders.reduce((sum, o) => sum + (o.shippingFee || 0), 0);
  const onlineNetTotal = onlineOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const onlineAov = onlineOrders.length > 0 ? Math.round(onlineNetTotal / onlineOrders.length) : 0;

  // Total Consolidated
  const totalNetRevenue = offlineNetTotal + onlineNetTotal;
  const totalOrdersCount = offlineOrders.length + onlineOrders.length;
  const totalDiscountsGiven = offlineDiscounts + onlineDiscounts;
  const totalTaxCollected = offlineTax + onlineTax;

  // Offline Cash Drawer Reconciliation Metrics
  const offlineCashTendered = offlineOrders.reduce((sum, o) => {
    if (o.paymentMethod === 'CASH') return sum + o.grandTotal;
    if (o.paymentSplits) {
      const c = o.paymentSplits.find((s) => s.method === 'CASH');
      if (c) return sum + (c.tendered || c.amount);
    }
    return sum;
  }, 0);

  const offlineCashChangeReturned = offlineOrders.reduce((sum, o) => sum + (o.changeAmount || 0), 0);
  const netCashInDrawer = Math.max(0, offlineCashTendered - offlineCashChangeReturned);

  const offlineCardTotal = offlineOrders.reduce((sum, o) => {
    if (o.paymentMethod === 'CARD') return sum + o.grandTotal;
    if (o.paymentSplits) {
      const c = o.paymentSplits.find((s) => s.method === 'CARD');
      if (c) return sum + c.amount;
    }
    return sum;
  }, 0);

  const offlineUpiTotal = offlineOrders.reduce((sum, o) => {
    if (o.paymentMethod === 'UPI') return sum + o.grandTotal;
    if (o.paymentSplits) {
      const c = o.paymentSplits.find((s) => s.method === 'UPI');
      if (c) return sum + c.amount;
    }
    return sum;
  }, 0);

  // Online Gateway Reconciliations
  const onlineUpiSettled = onlineOrders.filter((o) => o.paymentMethod === 'UPI').reduce((s, o) => s + o.grandTotal, 0);
  const onlineCardSettled = onlineOrders.filter((o) => o.paymentMethod === 'CARD').reduce((s, o) => s + o.grandTotal, 0);
  const onlineDeliveredCount = onlineOrders.filter((o) => o.fulfillmentStatus === 'DELIVERED').length;
  const onlineInTransitCount = onlineOrders.filter((o) => o.fulfillmentStatus === 'SHIPPED' || o.fulfillmentStatus === 'PACKED').length;

  // Filtered Table Items
  const auditedTransactions = useMemo(() => {
    let list = timeFilteredOrders;
    if (channelFilter === 'OFFLINE') {
      list = offlineOrders;
    } else if (channelFilter === 'ONLINE') {
      list = onlineOrders;
    }

    const q = search.trim().toLowerCase();
    return list.filter((item) => {
      const matchesSearch =
        !q ||
        item.orderNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.customerPhone.includes(q) ||
        (item.discountReason && item.discountReason.toLowerCase().includes(q));

      const isSplit = item.paymentSplits && item.paymentSplits.length > 1;
      const matchesMethod =
        methodFilter === 'ALL' ||
        (methodFilter === 'SPLIT' && isSplit) ||
        (!isSplit && item.paymentMethod === methodFilter);

      return matchesSearch && matchesMethod;
    });
  }, [timeFilteredOrders, offlineOrders, onlineOrders, channelFilter, search, methodFilter]);

  // Trigger print of official audit sheet
  const handlePrintAuditSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="border-b border-[rgba(0,0,0,0.18)] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#4A4844]">
            <span>STATUTORY FINANCIAL CONTROL</span>
            <span>/</span>
            <span>CHANNEL DISCREPANCY LEDGER</span>
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#111111] mt-1">
            SALES AUDIT & CHANNEL RECONCILIATION
          </h1>
          <p className="text-xs font-mono text-[#4A4844] mt-1">
            Independent Audit for In-Store Counter POS vs Online DTC Storefront Sales
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range switcher */}
          <div className="flex border border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] text-xs font-mono">
            {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 font-bold uppercase transition-colors ${
                  timeRange === r ? 'bg-[#111111] text-[#E2E2E4]' : 'text-[#4A4844] hover:text-[#111111]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handlePrintAuditSheet}
            icon={<Printer size={15} />}
          >
            PRINT AUDIT STATEMENT
          </Button>
        </div>
      </div>

      {/* =========================================================================
          CHANNEL REVENUE PROPORTION BAR
      ========================================================================= */}
      <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-5 shadow-subtle space-y-3 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#4A4844] font-bold">
              SALES CHANNEL CONTRIBUTION MATRIX
            </div>
            <div className="font-display font-extrabold text-xl text-[#111111] mt-0.5">
              {formatINR(totalNetRevenue)} Total Audited Revenue
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#111111]" />
              <span className="font-bold">OFFLINE POS:</span>
              <span>
                {formatINR(offlineNetTotal)} (
                {totalNetRevenue > 0 ? Math.round((offlineNetTotal / totalNetRevenue) * 100) : 0}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-indigo-600" />
              <span className="font-bold">ONLINE STORE:</span>
              <span>
                {formatINR(onlineNetTotal)} (
                {totalNetRevenue > 0 ? Math.round((onlineNetTotal / totalNetRevenue) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        {/* Proportional Segment Bar */}
        <div className="w-full h-3 bg-neutral-200 flex overflow-hidden">
          <div
            style={{
              width: `${totalNetRevenue > 0 ? (offlineNetTotal / totalNetRevenue) * 100 : 50}%`,
            }}
            className="bg-[#111111] transition-all duration-500"
            title={`Offline In-Store: ${formatINR(offlineNetTotal)}`}
          />
          <div
            style={{
              width: `${totalNetRevenue > 0 ? (onlineNetTotal / totalNetRevenue) * 100 : 50}%`,
            }}
            className="bg-indigo-600 transition-all duration-500"
            title={`Online Storefront: ${formatINR(onlineNetTotal)}`}
          />
        </div>
      </div>

      {/* =========================================================================
          SIDE-BY-SIDE AUDIT CARDS: OFFLINE POS VS ONLINE STOREFRONT
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        {/* LEFT: OFFLINE IN-STORE POS AUDIT DESK */}
        <div className="bg-[#D5D5D8] border-2 border-[#111111] p-5 space-y-4 shadow-subtle">
          <div className="flex items-center justify-between border-b-2 border-[#111111] pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#111111] text-[#E2E2E4]">
                <Store size={18} />
              </div>
              <div>
                <h2 className="font-display font-black text-base uppercase text-[#111111]">
                  OFFLINE IN-STORE POS AUDIT
                </h2>
                <div className="text-[10px] font-mono text-[#4A4844]">
                  Mumbai Flagship Counter · Physical Register #01
                </div>
              </div>
            </div>

            <span className="px-2 py-0.5 bg-[#111111] text-[#E2E2E4] text-[10px] font-mono font-bold uppercase">
              {offlineOrders.length} BILLS SETTLED
            </span>
          </div>

          {/* Offline Topline KPIs */}
          <div className="grid grid-cols-3 gap-2.5 font-mono">
            <div className="p-3 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)]">
              <div className="text-[9px] text-[#4A4844] uppercase">POS GROSS SALES</div>
              <div className="font-bold text-sm text-[#111111] mt-0.5">{formatINR(offlineGross)}</div>
            </div>
            <div className="p-3 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)]">
              <div className="text-[9px] text-[#4A4844] uppercase">DISCOUNTS GIVEN</div>
              <div className="font-bold text-sm text-emerald-700 mt-0.5">-{formatINR(offlineDiscounts)}</div>
            </div>
            <div className="p-3 bg-[#111111] text-[#E2E2E4]">
              <div className="text-[9px] text-neutral-400 uppercase">NET CASH & POS</div>
              <div className="font-bold text-sm mt-0.5">{formatINR(offlineNetTotal)}</div>
            </div>
          </div>

          {/* Cash Drawer & Counter Settlement Breakdown */}
          <div className="border border-[rgba(0,0,0,0.18)] bg-[#E2E2E4] p-3.5 space-y-2 font-mono text-xs">
            <div className="font-bold text-[10px] uppercase text-[#111111] flex items-center justify-between">
              <span>PHYSICAL REGISTER RECONCILIATION:</span>
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 size={12} /> RECONCILED
              </span>
            </div>

            <div className="divide-y divide-[rgba(0,0,0,0.1)] text-[11px]">
              <div className="py-1.5 flex justify-between text-[#4A4844]">
                <span>Total Cash Tendered Across Counter:</span>
                <span className="font-semibold text-[#111111]">{formatINR(offlineCashTendered)}</span>
              </div>
              <div className="py-1.5 flex justify-between text-[#4A4844]">
                <span>Customer Cash Change Returned:</span>
                <span className="text-red-600">-{formatINR(offlineCashChangeReturned)}</span>
              </div>
              <div className="py-1.5 flex justify-between font-bold bg-[#D5D5D8] px-2 border border-[rgba(0,0,0,0.18)]">
                <span className="text-[#111111]">NET CASH IN PHYSICAL DRAWER:</span>
                <span className="text-emerald-800 font-black">{formatINR(netCashInDrawer)}</span>
              </div>
              <div className="py-1.5 flex justify-between text-[#4A4844]">
                <span>EDC Card Machine Terminal Swipes:</span>
                <span className="font-semibold text-[#111111]">{formatINR(offlineCardTotal)}</span>
              </div>
              <div className="py-1.5 flex justify-between text-[#4A4844]">
                <span>Counter Dynamic UPI QR Collections:</span>
                <span className="font-semibold text-[#111111]">{formatINR(offlineUpiTotal)}</span>
              </div>
              <div className="py-1.5 flex justify-between text-[#4A4844]">
                <span>GST Tax Collected (CGST 6% + SGST 6%):</span>
                <span className="font-semibold text-[#111111]">{formatINR(offlineTax)}</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-[#4A4844] flex items-center justify-between pt-1">
            <span>Average Bill Size: <strong>{formatINR(offlineAov)}</strong></span>
            <span>Returns At Counter: <strong>{offlineUnsettledReturns} Unsettled</strong></span>
          </div>
        </div>

        {/* RIGHT: ONLINE E-COMMERCE STOREFRONT AUDIT DESK */}
        <div className="bg-[#D5D5D8] border-2 border-indigo-600 p-5 space-y-4 shadow-subtle">
          <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600 text-[#E2E2E4]">
                <Globe size={18} />
              </div>
              <div>
                <h2 className="font-display font-black text-base uppercase text-indigo-950">
                  ONLINE STOREFRONT DTC AUDIT
                </h2>
                <div className="text-[10px] font-mono text-[#4A4844]">
                  Online Web Orders · E-Commerce Gateways & Couriers
                </div>
              </div>
            </div>

            <span className="px-2 py-0.5 bg-indigo-600 text-[#E2E2E4] text-[10px] font-mono font-bold uppercase">
              {onlineOrders.length} ORDERS PROCESSED
            </span>
          </div>

          {/* Online Topline KPIs */}
          <div className="grid grid-cols-3 gap-2.5 font-mono">
            <div className="p-3 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)]">
              <div className="text-[9px] text-[#4A4844] uppercase">WEB GROSS SALES</div>
              <div className="font-bold text-sm text-[#111111] mt-0.5">{formatINR(onlineGross)}</div>
            </div>
            <div className="p-3 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)]">
              <div className="text-[9px] text-[#4A4844] uppercase">WEB PROMO CODES</div>
              <div className="font-bold text-sm text-emerald-700 mt-0.5">-{formatINR(onlineDiscounts)}</div>
            </div>
            <div className="p-3 bg-indigo-950 text-[#E2E2E4]">
              <div className="text-[9px] text-indigo-300 uppercase">NET REALIZED DTC</div>
              <div className="font-bold text-sm mt-0.5">{formatINR(onlineNetTotal)}</div>
            </div>
          </div>

          {/* Online Gateway & Logistics Reconciliation */}
          <div className="border border-[rgba(0,0,0,0.18)] bg-[#E2E2E4] p-3.5 space-y-2 font-mono text-xs">
            <div className="font-bold text-[10px] uppercase text-[#111111] flex items-center justify-between">
              <span>ONLINE GATEWAY & COURIER AUDIT:</span>
              <span className="text-indigo-700 flex items-center gap-1">
                <ShieldCheck size={12} /> GATEWAY CAPTURED
              </span>
            </div>

            <div className="divide-y divide-[rgba(0,0,0,0.1)] text-[11px]">
              <div className="py-1.5 flex justify-between text-[#4A4844]">
                <span>Online UPI Direct Gateway Settlement:</span>
                <span className="font-semibold text-[#111111]">{formatINR(onlineUpiSettled)}</span>
              </div>
              <div className="py-1.5 flex justify-between text-[#4A4844]">
                <span>Internet Payment Gateway (Card / Netbanking):</span>
                <span className="font-semibold text-[#111111]">{formatINR(onlineCardSettled)}</span>
              </div>
              <div className="py-1.5 flex justify-between text-[#4A4844]">
                <span>Shipping Fees Invoiced to Customers:</span>
                <span className="font-semibold text-[#111111]">{formatINR(onlineShipping)}</span>
              </div>
              <div className="py-1.5 flex justify-between text-[#4A4844]">
                <span>Shipments Successfully Delivered:</span>
                <span className="font-bold text-emerald-700">{onlineDeliveredCount} Parcels</span>
              </div>
              <div className="py-1.5 flex justify-between text-[#4A4844]">
                <span>Parcels In Transit / Dispatch (Delhivery, Blue Dart):</span>
                <span className="font-bold text-amber-700">{onlineInTransitCount} Dispatched</span>
              </div>
              <div className="py-1.5 flex justify-between text-[#4A4844]">
                <span>GST Tax On E-Commerce Sales:</span>
                <span className="font-semibold text-[#111111]">{formatINR(onlineTax)}</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-[#4A4844] flex items-center justify-between pt-1">
            <span>Average Online Basket: <strong>{formatINR(onlineAov)}</strong></span>
            <span>Courier Partners: <strong>Delhivery, Blue Dart, Shadowfax</strong></span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          STAFF ACCOUNTABILITY - who settled what, and how much they discounted
      ========================================================================= */}
      <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] shadow-subtle overflow-hidden no-print">
        <div className="p-4 border-b border-[rgba(0,0,0,0.18)] bg-[#E2E2E4] flex items-center gap-2">
          <ShieldCheck size={15} className="text-[#111111]" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#111111]">
            STAFF ACCOUNTABILITY - POS COUNTER
          </h3>
        </div>
        {staffBreakdown.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-[#4A4844]">
            No in-store bills settled for the selected time range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] text-[10px] uppercase text-[#4A4844]">
                  <th className="py-2.5 px-4">STAFF MEMBER</th>
                  <th className="py-2.5 px-4 text-right">BILLS SETTLED</th>
                  <th className="py-2.5 px-4 text-right">TOTAL DISCOUNT GIVEN</th>
                  <th className="py-2.5 px-4 text-right">AVG DISCOUNT / BILL</th>
                  <th className="py-2.5 px-4 text-right">NET REVENUE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
                {staffBreakdown.map((s) => (
                  <tr key={s.staffId}>
                    <td className="py-3 px-4 font-bold text-[#111111]">{s.staffName}</td>
                    <td className="py-3 px-4 text-right">{s.billCount}</td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-semibold">
                      {formatINR(s.totalDiscount)}
                    </td>
                    <td className="py-3 px-4 text-right text-[#4A4844]">
                      {formatINR(Math.round(s.totalDiscount / s.billCount))}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#111111]">{formatINR(s.netRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          CHANNEL TRANSACTION AUDIT LEDGER
      ========================================================================= */}
      <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] shadow-subtle overflow-hidden space-y-0 no-print">
        {/* Ledger Filter Toolbar */}
        <div className="p-4 bg-[#E2E2E4] border-b border-[rgba(0,0,0,0.18)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
          {/* Channel Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setChannelFilter('ALL')}
              className={`px-3 py-1.5 font-bold uppercase transition-colors shrink-0 ${
                channelFilter === 'ALL'
                  ? 'bg-[#111111] text-[#E2E2E4]'
                  : 'bg-[#D5D5D8] text-[#4A4844] border border-[rgba(0,0,0,0.18)] hover:text-[#111111]'
              }`}
            >
              ALL CHANNELS ({timeFilteredOrders.length})
            </button>
            <button
              onClick={() => setChannelFilter('OFFLINE')}
              className={`px-3 py-1.5 font-bold uppercase transition-colors shrink-0 ${
                channelFilter === 'OFFLINE'
                  ? 'bg-[#111111] text-[#E2E2E4]'
                  : 'bg-[#D5D5D8] text-[#4A4844] border border-[rgba(0,0,0,0.18)] hover:text-[#111111]'
              }`}
            >
              🏢 OFFLINE POS ({offlineOrders.length})
            </button>
            <button
              onClick={() => setChannelFilter('ONLINE')}
              className={`px-3 py-1.5 font-bold uppercase transition-colors shrink-0 ${
                channelFilter === 'ONLINE'
                  ? 'bg-indigo-600 text-[#E2E2E4] border-indigo-600'
                  : 'bg-[#D5D5D8] text-[#4A4844] border border-[rgba(0,0,0,0.18)] hover:text-[#111111]'
              }`}
            >
              🌐 ONLINE STORE ({onlineOrders.length})
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-[#D5D5D8] px-3 py-1.5 border border-[rgba(0,0,0,0.18)] w-full sm:w-80">
            <Search size={14} className="text-[#4A4844]" />
            <input
              type="text"
              placeholder="Search invoice #, patron, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent font-mono text-xs focus:outline-none placeholder:text-[#4A4844]"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] text-[10px] uppercase text-[#4A4844]">
                <th className="py-3 px-4 font-medium">INVOICE #</th>
                <th className="py-3 px-4 font-medium">CHANNEL</th>
                <th className="py-3 px-4 font-medium">TIMESTAMP</th>
                <th className="py-3 px-4 font-medium">CUSTOMER</th>
                <th className="py-3 px-4 font-medium">STAFF</th>
                <th className="py-3 px-4 text-right font-medium">SUBTOTAL</th>
                <th className="py-3 px-4 text-right font-medium">DISCOUNT</th>
                <th className="py-3 px-4 text-right font-medium">TAX (GST)</th>
                <th className="py-3 px-4 text-right font-medium">GRAND TOTAL</th>
                <th className="py-3 px-4 font-medium">SETTLEMENT TENDER</th>
                <th className="py-3 px-4 text-right font-medium">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
              {auditedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#4A4844]">
                    No sales audit records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                auditedTransactions.map((order) => {
                  const isOffline = order.channel === 'OFFLINE' || (!order.channel && order.notes?.toLowerCase().includes('in-store'));
                  return (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/bills/${order.id}`)}
                      className="hover:bg-[#E2E2E4] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-bold text-[#111111]">{order.orderNumber}</td>
                      <td className="py-3 px-4">
                        {isOffline ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#111111] text-[#E2E2E4] text-[9px] font-bold">
                            <Store size={10} /> POS COUNTER
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 text-[9px] font-bold">
                            <Globe size={10} /> ONLINE STORE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#4A4844] text-[11px]">{order.createdAt}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#111111]">{order.customerName}</div>
                        <div className="text-[10px] text-[#4A4844]">{order.customerPhone}</div>
                      </td>
                      <td className="py-3 px-4 text-[#111111]">{order.staffName || (isOffline ? 'Unknown Operator' : '—')}</td>
                      <td className="py-3 px-4 text-right">{formatINR(order.subtotal)}</td>
                      <td className="py-3 px-4 text-right">
                        {order.discount > 0 ? (
                          <div>
                            <span className="font-bold text-emerald-700">-{formatINR(order.discount)}</span>
                            {order.discountReason && (
                              <div className="text-[9px] text-[#4A4844] truncate max-w-[120px]">
                                {order.discountReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#4A4844]">₹0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-[#4A4844]">{formatINR(order.taxAmount)}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#111111]">{formatINR(order.grandTotal)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] text-[10px] font-semibold text-[#111111]">
                          {order.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/bills/${order.id}`);
                          }}
                        >
                          View Bill <ArrowRight size={11} className="ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          OFFICIAL AUDIT STATEMENT (PRINT ENGINE)
          Rendered cleanly when invoking Print
      ========================================================================= */}
      <div className="hidden print:block font-mono text-xs text-[#111111] p-8 max-w-4xl mx-auto space-y-6">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0;
              }
              .no-print {
                display: none !important;
              }
            }
          `,
        }} />

        {/* Audit Sheet Header */}
        <div className="border-b-2 border-[#111111] pb-4 flex justify-between items-start">
          <div>
            <div className="font-black text-2xl tracking-tight">STUDIO DENY</div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-600">
              AUDITOR FINANCIAL RECONCILIATION STATEMENT
            </div>
            <div className="text-xs text-neutral-600 mt-1">
              GSTIN: {settings.gstin || '—'} · PAN: {settings.pan || '—'}
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block bg-[#111111] text-[#E2E2E4] text-xs font-bold px-2.5 py-1 uppercase">
              STATUTORY AUDIT
            </div>
            <div className="text-xs mt-1">Generated: {new Date().toLocaleString('en-IN')}</div>
            <div className="text-xs font-bold">Scope: {timeRange} Records</div>
          </div>
        </div>

        {/* Channel Comparative Table */}
        <div className="space-y-2">
          <div className="font-bold text-xs uppercase border-b border-[#111111] pb-1">
            CHANNEL SALES BREAKDOWN SUMMARY
          </div>
          <table className="w-full text-left border-collapse border border-[#111111] text-xs">
            <thead>
              <tr className="bg-neutral-100 border-b border-[#111111] text-[10px] uppercase">
                <th className="p-2 border-r border-[#111111]">CHANNEL TYPE</th>
                <th className="p-2 border-r border-[#111111] text-center">BILLS / ORDERS</th>
                <th className="p-2 border-r border-[#111111] text-right">GROSS SALES</th>
                <th className="p-2 border-r border-[#111111] text-right">DISCOUNTS</th>
                <th className="p-2 border-r border-[#111111] text-right">CGST (6%)</th>
                <th className="p-2 border-r border-[#111111] text-right">SGST (6%)</th>
                <th className="p-2 text-right">NET REVENUE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111111]">
              <tr>
                <td className="p-2 font-bold border-r border-[#111111]">OFFLINE IN-STORE POS</td>
                <td className="p-2 text-center border-r border-[#111111]">{offlineOrders.length}</td>
                <td className="p-2 text-right border-r border-[#111111]">{formatINR(offlineGross)}</td>
                <td className="p-2 text-right border-r border-[#111111]">-{formatINR(offlineDiscounts)}</td>
                <td className="p-2 text-right border-r border-[#111111]">{formatINR(offlineTax / 2)}</td>
                <td className="p-2 text-right border-r border-[#111111]">{formatINR(offlineTax / 2)}</td>
                <td className="p-2 text-right font-bold">{formatINR(offlineNetTotal)}</td>
              </tr>
              <tr>
                <td className="p-2 font-bold border-r border-[#111111]">ONLINE STOREFRONT DTC</td>
                <td className="p-2 text-center border-r border-[#111111]">{onlineOrders.length}</td>
                <td className="p-2 text-right border-r border-[#111111]">{formatINR(onlineGross)}</td>
                <td className="p-2 text-right border-r border-[#111111]">-{formatINR(onlineDiscounts)}</td>
                <td className="p-2 text-right border-r border-[#111111]">{formatINR(onlineTax / 2)}</td>
                <td className="p-2 text-right border-r border-[#111111]">{formatINR(onlineTax / 2)}</td>
                <td className="p-2 text-right font-bold">{formatINR(onlineNetTotal)}</td>
              </tr>
              <tr className="bg-neutral-200 font-bold">
                <td className="p-2 border-r border-[#111111]">CONSOLIDATED TOTAL</td>
                <td className="p-2 text-center border-r border-[#111111]">{totalOrdersCount}</td>
                <td className="p-2 text-right border-r border-[#111111]">{formatINR(offlineGross + onlineGross)}</td>
                <td className="p-2 text-right border-r border-[#111111]">-{formatINR(totalDiscountsGiven)}</td>
                <td className="p-2 text-right border-r border-[#111111]">{formatINR(totalTaxCollected / 2)}</td>
                <td className="p-2 text-right border-r border-[#111111]">{formatINR(totalTaxCollected / 2)}</td>
                <td className="p-2 text-right text-base">{formatINR(totalNetRevenue)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Counter Cash Drawer Reconciled Ledger */}
        <div className="grid grid-cols-2 gap-4 border border-[#111111] p-4">
          <div>
            <div className="font-bold text-xs uppercase mb-2">PHYSICAL REGISTER CASH TALLY:</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Total Cash Inflow:</span>
                <span className="font-bold">{formatINR(offlineCashTendered)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cash Change Paid:</span>
                <span>-{formatINR(offlineCashChangeReturned)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-[#111111] pt-1">
                <span>NET CASH IN REGISTER:</span>
                <span>{formatINR(netCashInDrawer)}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="font-bold text-xs uppercase mb-2">ELECTRONIC & GATEWAY TALLY:</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>EDC Card Machine Batch:</span>
                <span className="font-bold">{formatINR(offlineCardTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Counter UPI Settlements:</span>
                <span className="font-bold">{formatINR(offlineUpiTotal)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-[#111111] pt-1">
                <span>Online Web Gateway Settled:</span>
                <span>{formatINR(onlineUpiSettled + onlineCardSettled)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Auditor Sign-Off Blocks */}
        <div className="pt-8 border-t-2 border-[#111111] grid grid-cols-3 gap-8 text-center text-xs">
          <div>
            <div className="h-12 border-b border-[#111111]" />
            <div className="font-bold mt-1">HEAD CASHIER</div>
            <div className="text-[10px] text-neutral-600">Counter Register #01</div>
          </div>
          <div>
            <div className="h-12 border-b border-[#111111]" />
            <div className="font-bold mt-1">SHIFT / STORE MANAGER</div>
            <div className="text-[10px] text-neutral-600">Mumbai Flagship</div>
          </div>
          <div>
            <div className="h-12 border-b border-[#111111]" />
            <div className="font-bold mt-1">STATUTORY AUDITOR / CA</div>
            <div className="text-[10px] text-neutral-600">Verification & Reconciliation</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesAuditPage;
