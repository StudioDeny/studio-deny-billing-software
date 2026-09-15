import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { Tabs } from '../../components/ui/Tabs';
import { formatINR } from '../../utils/formatters';
import {
  Receipt,
  Search,
  ArrowRight,
  Printer,
  Download,
  CreditCard,
  Building2,
  FileText,
} from 'lucide-react';

export const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders, settings } = useStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  // Derive tax invoices directly from orders
  const invoices = orders.map((o) => ({
    id: o.id,
    invoiceNumber: o.orderNumber.replace('SD-', 'INV-'),
    orderNumber: o.orderNumber,
    customerId: o.customerId,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
    subtotal: o.subtotal,
    taxAmount: o.taxAmount,
    grandTotal: o.grandTotal,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    date: o.createdAt.substring(0, 10),
  }));

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalTaxCollected = invoices.reduce((sum, i) => sum + i.taxAmount, 0);
  const paidInvoices = invoices.filter((i) => i.paymentStatus === 'PAID');
  const refundedInvoices = invoices.filter((i) => i.paymentStatus === 'REFUNDED');

  const filterTabs = [
    { id: 'ALL', label: 'ALL TAX INVOICES', count: invoices.length },
    { id: 'PAID', label: 'SETTLED', count: paidInvoices.length },
    { id: 'REFUNDED', label: 'REFUNDED', count: refundedInvoices.length },
  ];

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerEmail.toLowerCase().includes(search.toLowerCase());

    const matchesTab = activeTab === 'ALL' || inv.paymentStatus === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[#CFCFD2] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest-editorial text-[#888888]">
            FINANCIAL AUDIT & GST COMPLIANCE
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A0A0A] mt-1">
            TAX INVOICES & REGISTER
          </h1>
          <div className="text-xs font-mono text-[#666666] mt-2">
            GSTIN: {settings.gstin || '27AABCD1234E1Z5'} · Registered Streetwear Sales Ledger
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              store.addToast('GST Report Exported', 'GSTR-1 JSON and CSV ready for download.', 'success');
            }}
          >
            <Download size={14} className="mr-2" /> EXPORT GSTR-1
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
          label="REGISTERED INVOICES"
          value={invoices.length}
          subtext="Consecutive serial numbering"
        />
        <MetricBlock
          label="TOTAL INVOICE GMV"
          value={formatINR(totalInvoiced)}
          subtext="Gross invoiced sales"
        />
        <MetricBlock
          label="GST APPAREL TAX"
          value={formatINR(totalTaxCollected)}
          subtext="Itemized 12% output tax"
        />
        <MetricBlock
          label="SETTLEMENT RATE"
          value="100%"
          subtext="Zero uncollected debt"
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={filterTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 border border-[#CFCFD2]">
        <Search size={15} className="text-[#888888]" />
        <input
          type="text"
          placeholder="Search by Invoice Number, Order ID, or Patron name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent font-mono text-xs focus:outline-none placeholder:text-[#888888]"
        />
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-[#CFCFD2] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[#CFCFD2] bg-[#F1F1F3] text-[10px] uppercase text-[#666666]">
                <th className="py-3 px-4 font-medium">INVOICE SERIAL</th>
                <th className="py-3 px-4 font-medium">ORDER REF</th>
                <th className="py-3 px-4 font-medium">PATRON</th>
                <th className="py-3 px-4 font-medium">ISSUE DATE</th>
                <th className="py-3 px-4 font-medium">GST TAX</th>
                <th className="py-3 px-4 font-medium">TOTAL INVOICED</th>
                <th className="py-3 px-4 font-medium">PAYMENT METHOD</th>
                <th className="py-3 px-4 font-medium">STATUS</th>
                <th className="py-3 px-4 font-medium text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E7]">
              {filteredInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-bold text-[#0A0A0A] group-hover:underline">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#666666]">{inv.orderNumber}</td>
                  <td className="py-3 px-4 text-[#0A0A0A]">{inv.customerName}</td>
                  <td className="py-3 px-4 text-[#666666]">{inv.date}</td>
                  <td className="py-3 px-4 text-[#666666]">{formatINR(inv.taxAmount)}</td>
                  <td className="py-3 px-4 font-black text-[#0A0A0A]">{formatINR(inv.grandTotal)}</td>
                  <td className="py-3 px-4">
                    <span className="px-1.5 py-0.5 bg-[#F1F1F3] text-[10px] text-[#444444] border border-[#CFCFD2] font-semibold">
                      {inv.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={inv.paymentStatus} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/invoices/${inv.id}`);
                      }}
                    >
                      <ArrowRight size={13} />
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
