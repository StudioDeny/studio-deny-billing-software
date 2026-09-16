import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { Tabs } from '../../components/ui/Tabs';
import { formatINR } from '../../utils/formatters';
import {
  CreditCard,
  Search,
  ArrowRight,
  QrCode,
  Banknote,
  Building2,
  TrendingUp,
  Receipt,
  Download,
} from 'lucide-react';
import { PaymentMethod } from '../../types';

export const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { payments, orders } = useStore();
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');

  const successfulPayments = payments.filter((p) => p.status === 'SUCCESS');
  const refundedPayments = payments.filter((p) => p.status === 'REFUNDED');

  const totalCaptured = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = refundedPayments.reduce((sum, p) => sum + p.amount, 0);
  const netSettled = totalCaptured - totalRefunded;

  const upiTotal = successfulPayments
    .filter((p) => p.method === 'UPI')
    .reduce((sum, p) => sum + p.amount, 0);

  const cardTotal = successfulPayments
    .filter((p) => p.method === 'CARD')
    .reduce((sum, p) => sum + p.amount, 0);

  const cashTotal = successfulPayments
    .filter((p) => p.method === 'COD')
    .reduce((sum, p) => sum + p.amount, 0);

  const filterTabs = [
    { id: 'ALL', label: 'ALL TRANSACTIONS', count: payments.length },
    { id: 'UPI', label: 'UPI / QR', count: payments.filter((p) => p.method === 'UPI').length },
    { id: 'CARD', label: 'CARDS', count: payments.filter((p) => p.method === 'CARD').length },
    { id: 'COD', label: 'CASH / COD', count: payments.filter((p) => p.method === 'COD').length },
    { id: 'REFUNDED', label: 'REFUNDS', count: refundedPayments.length },
  ];

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.transactionRef.toLowerCase().includes(search.toLowerCase()) ||
      p.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.toLowerCase().includes(search.toLowerCase());

    let matchesTab = true;
    if (methodFilter === 'REFUNDED') {
      matchesTab = p.status === 'REFUNDED';
    } else if (methodFilter !== 'ALL') {
      matchesTab = p.method === methodFilter;
    }

    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[rgba(0,0,0,0.18)] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest-editorial text-[#4A4844]">
            COMMERCE TREASURY & SETTLEMENTS
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] mt-1">
            PAYMENT TRANSACTIONS
          </h1>
          <div className="text-xs font-mono text-[#4A4844] mt-2">
            Real-time Gateway Settlements, UPI QR Clearing, and POS Card Reconciliation
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              store.addToast('Settlement Exported', 'Bank settlement statement downloaded as CSV.', 'success');
            }}
          >
            <Download size={14} className="mr-2" /> EXPORT SETTLEMENT CSV
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate('/billing/new')}
          >
            <Receipt size={14} className="mr-2" /> NEW POS BILL
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricBlock
          label="NET SETTLED GMV"
          value={formatINR(netSettled)}
          subtext="Net revenues after refunds"
        />
        <MetricBlock
          label="UPI / QR VOLUME"
          value={formatINR(upiTotal)}
          subtext="Instant bank payment"
        />
        <MetricBlock
          label="CARD TERMINAL"
          value={formatINR(cardTotal)}
          subtext="Credit / Debit swipe"
        />
        <MetricBlock
          label="TOTAL REFUNDED"
          value={formatINR(totalRefunded)}
          subtext="Reverse return payouts"
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={filterTabs} activeTab={methodFilter} onChange={setMethodFilter} />

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-[#D5D5D8] p-3 border border-[rgba(0,0,0,0.18)]">
        <Search size={15} className="text-[#4A4844]" />
        <input
          type="text"
          placeholder="Filter by transaction ref, order number, or patron..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent font-mono text-xs focus:outline-none placeholder:text-[#4A4844]"
        />
      </div>

      {/* Transactions Table */}
      <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] text-[10px] uppercase text-[#4A4844]">
                <th className="py-3 px-4 font-medium">TRANSACTION REF</th>
                <th className="py-3 px-4 font-medium">ORDER REF</th>
                <th className="py-3 px-4 font-medium">PATRON</th>
                <th className="py-3 px-4 font-medium">TIMESTAMP</th>
                <th className="py-3 px-4 font-medium">TENDER METHOD</th>
                <th className="py-3 px-4 font-medium">AMOUNT</th>
                <th className="py-3 px-4 font-medium">STATUS</th>
                <th className="py-3 px-4 font-medium text-right">INVOICE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
              {filteredPayments.map((pay) => (
                <tr key={pay.id} className="hover:bg-[#E2E2E4] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#111111]">{pay.transactionRef}</td>
                  <td className="py-3 px-4 font-semibold text-[#4A4844]">{pay.orderNumber}</td>
                  <td className="py-3 px-4 text-[#111111]">{pay.customerName}</td>
                  <td className="py-3 px-4 text-[#4A4844]">{pay.date}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#D5D5D8] text-[#111111] border border-[rgba(0,0,0,0.18)] font-semibold text-[10px]">
                      {pay.method === 'UPI' && <QrCode size={11} />}
                      {pay.method === 'CARD' && <CreditCard size={11} />}
                      {pay.method === 'COD' && <Banknote size={11} />}
                      {pay.method}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-black text-[#111111]">
                    <span className={pay.status === 'REFUNDED' ? 'text-red-700' : 'text-[#111111]'}>
                      {pay.status === 'REFUNDED' ? `-${formatINR(pay.amount)}` : formatINR(pay.amount)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={pay.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/invoices/${pay.orderId}`)}
                    >
                      <Receipt size={13} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
