import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatINR } from '../../utils/formatters';
import {
  Receipt,
  Search,
  Printer,
  PlusCircle,
  CreditCard,
  Banknote,
  QrCode,
  Split,
  Eye,
  RotateCcw,
  FileCheck,
  Store,
  Globe,
  Tag,
} from 'lucide-react';

export const BillsPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders } = useStore();
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'OFFLINE' | 'ONLINE'>('ALL');

  // Filtered bills list
  const filteredBills = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((b) => {
      const isOffline = b.channel === 'OFFLINE' || (!b.channel && b.notes?.toLowerCase().includes('in-store'));
      const matchesChannel =
        channelFilter === 'ALL' ||
        (channelFilter === 'OFFLINE' && isOffline) ||
        (channelFilter === 'ONLINE' && !isOffline);

      const matchesSearch =
        !q ||
        b.orderNumber.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.includes(q) ||
        (b.discountReason && b.discountReason.toLowerCase().includes(q));

      const isSplit = b.paymentSplits && b.paymentSplits.length > 1;
      const matchesMethod =
        methodFilter === 'ALL' ||
        (methodFilter === 'SPLIT' && isSplit) ||
        (!isSplit && b.paymentMethod === methodFilter);

      return matchesChannel && matchesSearch && matchesMethod;
    });
  }, [orders, search, methodFilter, channelFilter]);

  const totalBilled = orders.reduce((sum, o) => sum + o.grandTotal, 0);

  const handleReprint = (bill: any, e: React.MouseEvent) => {
    e.stopPropagation();
    store.addToast('Reprinting Bill', `Sent ${bill.orderNumber} to Thermal POS-80.`, 'info');
    window.print();
  };

  const getMethodBadge = (bill: any) => {
    const isSplit = bill.paymentSplits && bill.paymentSplits.length > 1;
    if (isSplit) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#111111] text-[#E2E2E4] text-[10px] font-bold">
          <Split size={10} /> SPLIT ({bill.paymentSplits.length})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] text-[10px] text-[#111111] font-semibold">
        {bill.paymentMethod === 'UPI' && <QrCode size={11} />}
        {bill.paymentMethod === 'CARD' && <CreditCard size={11} />}
        {(bill.paymentMethod === 'CASH' || bill.paymentMethod === 'COD') && <Banknote size={11} />}
        <span>{bill.paymentMethod}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[rgba(0,0,0,0.18)] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#4A4844]">
            REGISTER LOG
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#111111] mt-1">
            BILLS & TRANSACTIONS
          </h1>
          <div className="text-xs font-mono text-[#4A4844] mt-1">
            {orders.length} settled receipts · Total Revenue: {formatINR(totalBilled)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/audit')}
            icon={<FileCheck size={15} />}
          >
            SALES AUDIT
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate('/billing/new')}
            icon={<PlusCircle size={15} />}
          >
            START NEW BILL
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-2.5">
        {/* Channel Selector Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#E2E2E4] p-2.5 border border-[rgba(0,0,0,0.18)]">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-[10px] text-[#4A4844] font-bold uppercase mr-1">SALES CHANNEL:</span>
            {(['ALL', 'OFFLINE', 'ONLINE'] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`px-3 py-1 font-bold text-xs uppercase transition-colors ${
                  channelFilter === ch
                    ? ch === 'ONLINE'
                      ? 'bg-indigo-600 text-[#E2E2E4]'
                      : 'bg-[#111111] text-[#E2E2E4]'
                    : 'bg-[#D5D5D8] text-[#4A4844] border border-[rgba(0,0,0,0.18)] hover:text-[#111111]'
                }`}
              >
                {ch === 'ALL' ? 'ALL CHANNELS' : ch === 'OFFLINE' ? '🏢 OFFLINE POS' : '🌐 ONLINE STORE'}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono text-[#4A4844]">
            SHOWING {filteredBills.length} OF {orders.length} TRANSACTIONS
          </div>
        </div>

        {/* Method Filter & Search Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Tender Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 font-mono text-xs">
            <span className="text-[10px] text-[#4A4844] font-bold uppercase mr-1">TENDER:</span>
            {['ALL', 'UPI', 'CASH', 'CARD', 'SPLIT'].map((tab) => (
              <button
                key={tab}
                onClick={() => setMethodFilter(tab)}
                className={`px-3 py-1 font-bold uppercase transition-colors shrink-0 ${
                  methodFilter === tab
                    ? 'bg-[#111111] text-[#E2E2E4]'
                    : 'bg-[#D5D5D8] text-[#4A4844] border border-[rgba(0,0,0,0.18)] hover:text-[#111111]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-[#D5D5D8] px-3 py-2 border border-[rgba(0,0,0,0.18)] w-full sm:w-80">
            <Search size={14} className="text-[#4A4844]" />
            <input
              type="text"
              placeholder="Search invoice #, patron, phone, promo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent font-mono text-xs focus:outline-none placeholder:text-[#4A4844]"
            />
          </div>
        </div>
      </div>

      {/* Bills Transaction Table */}
      <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] text-[10px] uppercase text-[#4A4844]">
                <th className="py-3 px-4 font-medium">INVOICE #</th>
                <th className="py-3 px-4 font-medium">CHANNEL</th>
                <th className="py-3 px-4 font-medium">TIMESTAMP</th>
                <th className="py-3 px-4 font-medium">CUSTOMER</th>
                <th className="py-3 px-4 font-medium">ITEMS</th>
                <th className="py-3 px-4 font-medium">TENDER METHOD</th>
                <th className="py-3 px-4 font-medium text-right">TOTAL PAID</th>
                <th className="py-3 px-4 font-medium">STATUS</th>
                <th className="py-3 px-4 font-medium text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#4A4844]">
                    No bills found matching current filter.
                  </td>
                </tr>
              ) : (
                filteredBills.map((b) => {
                  const itemCount = b.items.reduce((sum, i) => sum + i.quantity, 0);
                  const isOffline = b.channel === 'OFFLINE' || (!b.channel && b.notes?.toLowerCase().includes('in-store'));
                  return (
                    <tr
                      key={b.id}
                      onClick={() => navigate(`/bills/${b.id}`)}
                      className="hover:bg-[#E2E2E4] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-bold text-[#111111] group-hover:underline">
                        {b.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        {isOffline ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#111111] text-[#E2E2E4] text-[9px] font-bold">
                            <Store size={9} /> POS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 text-[9px] font-bold">
                            <Globe size={9} /> WEB
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#4A4844]">{b.createdAt}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#111111]">{b.customerName}</div>
                        <div className="text-[10px] text-[#4A4844]">{b.customerPhone}</div>
                      </td>
                      <td className="py-3 px-4 text-[#4A4844]">{itemCount} pcs</td>
                      <td className="py-3 px-4">{getMethodBadge(b)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-black text-[#111111]">{formatINR(b.grandTotal)}</div>
                        {b.discount > 0 && (
                          <div className="text-[9px] text-emerald-700 font-bold">
                            -{formatINR(b.discount)}
                            {b.discountReason && <span className="text-[#4A4844] font-normal ml-0.5">({b.discountReason})</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={b.paymentStatus} />
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/bills/${b.id}`)}
                          className="px-2.5 py-1 text-[11px] font-mono border border-[rgba(0,0,0,0.18)] hover:border-[#111111] hover:bg-[#D5D5D8] text-[#111111]"
                          title="View Tax Invoice & Slip"
                        >
                          VIEW
                        </button>
                        <button
                          onClick={(e) => handleReprint(b, e)}
                          className="px-2.5 py-1 text-[11px] font-mono bg-[#111111] text-[#E2E2E4] hover:bg-neutral-800"
                          title="Instant Thermal Print"
                        >
                          PRINT
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
