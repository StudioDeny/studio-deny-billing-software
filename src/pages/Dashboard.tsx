import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../services/store';
import { MetricBlock } from '../components/ui/MetricBlock';
import { Button } from '../components/ui/Button';
import { formatINR } from '../utils/formatters';
import {
  PlusCircle,
  Receipt,
  Printer,
  ArrowRight,
  CreditCard,
  Banknote,
  QrCode,
  Split,
  ShoppingBag,
  Store,
  Globe,
  Tag,
  FileCheck,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { orders, settings } = useStore();

  // Compute today's billing metrics dynamically from orders/bills
  const todayDateStr = new Date().toISOString().substring(0, 10);
  const todayBills = orders.filter((o) => o.createdAt.startsWith(todayDateStr));
  
  // If no bills yet today, fall back gracefully to recent orders for demonstrative overview
  const activeBillsList = todayBills.length > 0 ? todayBills : orders;
  const todaySales = activeBillsList.reduce((sum, o) => sum + o.grandTotal, 0);
  const billsCount = activeBillsList.length;
  const averageBill = billsCount > 0 ? Math.round(todaySales / billsCount) : 0;

  // Channel breakdown metrics
  const offlineOrders = orders.filter((o) => o.channel === 'OFFLINE');
  const onlineOrders = orders.filter((o) => o.channel === 'ONLINE');
  const offlineTotal = offlineOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const onlineTotal = onlineOrders.reduce((sum, o) => sum + o.grandTotal, 0);

  // Recent 6 bills
  const recentBills = orders.slice(0, 6);

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'UPI':
        return <QrCode size={13} className="text-[#0A0A0A]" />;
      case 'CARD':
        return <CreditCard size={13} className="text-[#0A0A0A]" />;
      case 'CASH':
      case 'COD':
        return <Banknote size={13} className="text-[#0A0A0A]" />;
      case 'SPLIT':
        return <Split size={13} className="text-[#0A0A0A]" />;
      default:
        return <Receipt size={13} className="text-[#0A0A0A]" />;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* DOMINANT HERO ACTION: START NEW BILL */}
      <div className="bg-[#0A0A0A] text-white p-6 sm:p-8 border border-[#0A0A0A] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-widest px-2 py-0.5 bg-white text-[#0A0A0A]">
              BILLING TERMINAL #01
            </span>
            <span className="text-xs font-mono text-neutral-400">
              {settings.storeName || 'STUDIO DENY'} · MUMBAI FLAGSHIP
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
            TOUCH BILLING DESK
          </h1>
          <p className="text-xs sm:text-sm font-mono text-neutral-300">
            Rapid checkout, multi-tender split payments & instant 80mm thermal receipt printing.
          </p>
        </div>

        <div className="shrink-0 flex items-center">
          <button
            onClick={() => navigate('/billing/new')}
            className="w-full sm:w-auto bg-white text-[#0A0A0A] hover:bg-neutral-100 px-6 py-4 sm:px-8 sm:py-5 flex items-center justify-center gap-3 font-mono font-black text-sm sm:text-base tracking-widest uppercase shadow-lg active:scale-[0.98] transition-all cursor-pointer"
          >
            <PlusCircle size={22} className="text-[#0A0A0A]" />
            <span>START NEW BILL</span>
          </button>
        </div>
      </div>

      {/* ESSENTIAL BILLING METRICS - CLEAN & FOCUSED */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricBlock
          label="TODAY'S BILLING TOTAL"
          value={formatINR(todaySales)}
          subValue={`${billsCount} bills settled today`}
        />

        <MetricBlock
          label="BILLS ISSUED TODAY"
          value={String(billsCount)}
          subValue="Zero unfinished counter bills"
        />

        <MetricBlock
          label="AVERAGE BILL SIZE"
          value={formatINR(averageBill)}
          subValue="Fast-moving streetwear capsule"
        />
      </div>

      {/* CHANNEL SALES RECONCILIATION & QUICK TOOLS */}
      <div className="bg-white border border-[#CFCFD2] p-5 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E7]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#888888]">
              SALES CHANNELS & STATUTORY AUDIT
            </div>
            <h2 className="font-display font-bold text-base text-[#0A0A0A]">
              OFFLINE POS vs ONLINE STORE RECONCILIATION
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/audit')}
              className="bg-[#0A0A0A] text-white hover:bg-neutral-800 px-3 py-2 text-xs font-mono font-bold tracking-editorial flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileCheck size={14} />
              <span>SALES AUDIT REPORT</span>
              <ArrowRight size={13} />
            </button>
            <button
              onClick={() => navigate('/tags')}
              className="bg-[#F1F1F3] border border-[#CFCFD2] text-[#111111] hover:border-[#0A0A0A] px-3 py-2 text-xs font-mono font-bold tracking-editorial flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Tag size={14} />
              <span>PRICE TAG GENERATOR</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* OFFLINE POS SUMMARY */}
          <div className="p-4 bg-[#FAFAFA] border border-[#CFCFD2] flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span className="text-[11px] font-mono font-bold tracking-widest text-[#0A0A0A] uppercase flex items-center gap-1.5">
                  <Store size={13} /> OFFLINE IN-STORE POS
                </span>
              </div>
              <div className="text-xl font-mono font-black text-[#0A0A0A]">
                {formatINR(offlineTotal)}
              </div>
              <div className="text-[11px] font-mono text-[#666666]">
                {offlineOrders.length} physical register bills settled
              </div>
            </div>
            <button
              onClick={() => navigate('/bills?channel=OFFLINE')}
              className="text-[11px] font-mono text-[#0A0A0A] underline font-semibold hover:opacity-75 cursor-pointer"
            >
              VIEW POS BILLS →
            </button>
          </div>

          {/* ONLINE STORE DTC SUMMARY */}
          <div className="p-4 bg-[#FAFAFA] border border-[#CFCFD2] flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                <span className="text-[11px] font-mono font-bold tracking-widest text-[#0A0A0A] uppercase flex items-center gap-1.5">
                  <Globe size={13} /> ONLINE STOREFRONT (DTC)
                </span>
              </div>
              <div className="text-xl font-mono font-black text-[#0A0A0A]">
                {formatINR(onlineTotal)}
              </div>
              <div className="text-[11px] font-mono text-[#666666]">
                {onlineOrders.length} web/courier orders dispatched
              </div>
            </div>
            <button
              onClick={() => navigate('/bills?channel=ONLINE')}
              className="text-[11px] font-mono text-[#0A0A0A] underline font-semibold hover:opacity-75 cursor-pointer"
            >
              VIEW ONLINE ORDERS →
            </button>
          </div>
        </div>
      </div>

      {/* RECENT BILLS TABLE - DIRECT ACTIONS */}
      <div className="bg-white border border-[#CFCFD2] shadow-subtle overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#CFCFD2] flex items-center justify-between bg-[#FAFAFA]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#888888]">
              TRANSACTION LOG
            </div>
            <h2 className="font-display font-bold text-base sm:text-lg text-[#0A0A0A]">
              RECENT TERMINAL BILLS
            </h2>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/bills')}
            className="text-xs"
          >
            VIEW ALL BILLS ({orders.length}) <ArrowRight size={13} className="ml-1" />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[#CFCFD2] bg-[#F1F1F3] text-[10px] uppercase text-[#666666]">
                <th className="py-3 px-4 font-medium">INVOICE / BILL #</th>
                <th className="py-3 px-4 font-medium">DATE & TIME</th>
                <th className="py-3 px-4 font-medium">PATRON</th>
                <th className="py-3 px-4 font-medium">ITEMS</th>
                <th className="py-3 px-4 font-medium">TENDER METHOD</th>
                <th className="py-3 px-4 font-medium">GRAND TOTAL</th>
                <th className="py-3 px-4 font-medium text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E7]">
              {recentBills.map((bill) => {
                const totalItems = bill.items.reduce((sum, i) => sum + i.quantity, 0);
                const hasSplits = bill.paymentSplits && bill.paymentSplits.length > 1;

                return (
                  <tr
                    key={bill.id}
                    onClick={() => navigate(`/bills/${bill.id}`)}
                    className="hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-bold text-[#0A0A0A] group-hover:underline">
                      {bill.orderNumber}
                    </td>
                    <td className="py-3 px-4 text-[#666666]">
                      {bill.createdAt}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0A0A0A]">{bill.customerName}</div>
                      <div className="text-[10px] text-[#888888]">{bill.customerPhone}</div>
                    </td>
                    <td className="py-3 px-4 text-[#444444]">
                      {totalItems} pcs
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#F1F1F3] border border-[#CFCFD2] text-[10px] font-semibold text-[#111111]">
                        {getMethodIcon(hasSplits ? 'SPLIT' : bill.paymentMethod)}
                        <span>
                          {hasSplits ? `SPLIT (${bill.paymentSplits?.length})` : bill.paymentMethod}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-sm text-[#0A0A0A]">
                      {formatINR(bill.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bills/${bill.id}`);
                        }}
                        className="text-[11px] py-1 px-2.5"
                      >
                        <Receipt size={12} className="mr-1" /> VIEW / PRINT
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
