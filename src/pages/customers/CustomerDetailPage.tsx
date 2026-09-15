import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { formatINR, formatDate } from '../../utils/formatters';
import {
  ArrowLeft,
  Crown,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  ExternalLink,
  Receipt,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Pencil,
} from 'lucide-react';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers, orders, returns } = useStore();

  const customer = customers.find((c) => c.id === id);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = () => {
    if (!customer) return;
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditEmail(customer.email);
    setEditAddress(customer.address);
    setEditCity(customer.city);
    setIsEditing(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setIsSaving(true);
    try {
      await store.updateCustomer(customer.id, {
        name: editName,
        phone: editPhone,
        email: editEmail,
        address: editAddress,
        city: editCity,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!customer) {
    return (
      <div className="py-16 text-center space-y-4">
        <h2 className="font-display text-2xl font-bold text-[#0A0A0A]">Customer Not Found</h2>
        <p className="text-xs font-mono text-[#666666]">No customer profile exists matching this ID.</p>
        <Button variant="secondary" onClick={() => navigate('/customers')}>
          <ArrowLeft size={14} className="mr-2" /> Back to Customers
        </Button>
      </div>
    );
  }

  // Filter orders and returns for this customer
  const customerOrders = orders.filter(
    (o) =>
      o.customerId === customer.id ||
      o.customerEmail.toLowerCase() === customer.email.toLowerCase()
  );

  const customerReturns = returns.filter(
    (r) =>
      r.customerId === customer.id ||
      r.customerName.toLowerCase() === customer.name.toLowerCase()
  );

  // Real, computed from this customer's own order history - not fabricated.
  const itemCounts = new Map<string, number>();
  const paymentCounts = new Map<string, number>();
  customerOrders.forEach((o) => {
    o.items.forEach((i) => itemCounts.set(i.name, (itemCounts.get(i.name) || 0) + i.quantity));
    paymentCounts.set(o.paymentMethod, (paymentCounts.get(o.paymentMethod) || 0) + 1);
  });
  const topItem = [...itemCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topPayment = [...paymentCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Navigation */}
      <div className="border-b border-[#CFCFD2] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
            <ArrowLeft size={14} className="mr-1.5" /> CUSTOMERS
          </Button>
          <span className="text-[#CFCFD2]">/</span>
          <span className="font-mono text-xs font-semibold text-[#0A0A0A] uppercase tracking-wider">
            {customer.name}
          </span>
          <StatusBadge status={customer.segment} />
        </div>

        <div className="flex items-center gap-3">
          {!isEditing && (
            <Button variant="secondary" size="sm" onClick={startEditing}>
              <Pencil size={14} className="mr-1.5" /> EDIT
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/billing/new?customerId=${customer.id}`)}
          >
            <Receipt size={14} className="mr-1.5" /> BILL AT POS
          </Button>
        </div>
      </div>

      {/* Customer Header Dossier */}
      <div className="bg-white border border-[#CFCFD2] p-6">
        {isEditing ? (
          <form onSubmit={handleSaveCustomer} className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#666666] mb-1">Full Name</label>
              <input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-white border border-[#CFCFD2] p-2 text-xs font-mono focus:outline-none focus:border-[#0A0A0A]"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#666666] mb-1">Phone</label>
              <input
                required
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full bg-white border border-[#CFCFD2] p-2 text-xs font-mono focus:outline-none focus:border-[#0A0A0A]"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#666666] mb-1">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full bg-white border border-[#CFCFD2] p-2 text-xs font-mono focus:outline-none focus:border-[#0A0A0A]"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#666666] mb-1">City</label>
              <input
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                className="w-full bg-white border border-[#CFCFD2] p-2 text-xs font-mono focus:outline-none focus:border-[#0A0A0A]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase tracking-widest text-[#666666] mb-1">Address</label>
              <input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full bg-white border border-[#CFCFD2] p-2 text-xs font-mono focus:outline-none focus:border-[#0A0A0A]"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                CANCEL
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-[#0A0A0A] text-white flex items-center justify-center font-display font-black text-2xl shrink-0">
                {customer.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#0A0A0A]">
                    {customer.name}
                  </h1>
                  {customer.segment === 'VIP' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold uppercase">
                      <Crown size={12} className="fill-amber-500 text-amber-600" /> VIP PATRON
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#666666] mt-2">
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} className="text-[#888888]" /> {customer.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} className="text-[#888888]" /> {customer.phone}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-[#888888]" /> {customer.city}
                  </span>
                  <span className="flex items-center gap-1.5 text-[#888888]">
                    <Calendar size={13} /> Member Since {customer.createdAt}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t lg:border-t-0 lg:border-l border-[#CFCFD2] pt-4 lg:pt-0 lg:pl-6 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#888888] block">
                PRIMARY SHIPPING COORDINATES
              </span>
              <p className="text-xs font-mono text-[#0A0A0A] max-w-sm">
                {customer.address}, {customer.city}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricBlock
          label="LIFETIME VALUE (LTV)"
          value={formatINR(customer.totalSpend)}
          subtext="Total revenue generated"
        />
        <MetricBlock
          label="ORDER FREQUENCY"
          value={`${customerOrders.length} orders`}
          subtext="Total completed checkouts"
        />
        <MetricBlock
          label="AVERAGE ORDER VALUE"
          value={formatINR(customer.averageOrderValue)}
          subtext="Mean basket size"
        />
        <MetricBlock
          label="RETURN RATE"
          value={customerOrders.length ? `${Math.round((customerReturns.length / customerOrders.length) * 100)}%` : '0%'}
          subtext={`${customerReturns.length} return requests`}
        />
      </div>

      {/* Main Grid: Orders & CRM Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Orders Ledger */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-[#CFCFD2] overflow-hidden">
            <div className="p-4 border-b border-[#CFCFD2] flex items-center justify-between bg-[#FAFAFA]">
              <div className="flex items-center gap-2">
                <ShoppingBag size={15} className="text-[#0A0A0A]" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">
                  ORDER HISTORY LEDGER ({customerOrders.length})
                </h3>
              </div>
            </div>

            {customerOrders.length === 0 ? (
              <div className="py-10 text-center text-xs font-mono text-[#888888]">
                No orders recorded yet for this customer.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-[#CFCFD2] bg-[#F1F1F3] text-[10px] uppercase text-[#666666]">
                      <th className="py-2.5 px-4 font-medium">ORDER NUMBER</th>
                      <th className="py-2.5 px-4 font-medium">DATE</th>
                      <th className="py-2.5 px-4 font-medium">GARMENT ITEMS</th>
                      <th className="py-2.5 px-4 font-medium">TOTAL</th>
                      <th className="py-2.5 px-4 font-medium">FULFILLMENT</th>
                      <th className="py-2.5 px-4 font-medium text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E7]">
                    {customerOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-3 px-4 font-bold text-[#0A0A0A]">{ord.orderNumber}</td>
                        <td className="py-3 px-4 text-[#666666]">{ord.createdAt.substring(0, 10)}</td>
                        <td className="py-3 px-4 text-[#444444]">
                          {ord.items.map((i) => `${i.name} (${i.size})`).join(', ')}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#0A0A0A]">{formatINR(ord.grandTotal)}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={ord.fulfillmentStatus} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/orders/${ord.id}`)}
                          >
                            <ArrowLeft size={13} className="rotate-180" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Returns if any */}
          {customerReturns.length > 0 && (
            <div className="bg-white border border-[#CFCFD2] overflow-hidden">
              <div className="p-4 border-b border-[#CFCFD2] flex items-center justify-between bg-[#FAFAFA]">
                <div className="flex items-center gap-2">
                  <RotateCcw size={15} className="text-[#0A0A0A]" />
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">
                    RETURNS & SIZE EXCHANGES ({customerReturns.length})
                  </h3>
                </div>
              </div>
              <div className="divide-y divide-[#E5E5E7] font-mono text-xs">
                {customerReturns.map((ret) => (
                  <div key={ret.id} className="p-4 flex items-center justify-between hover:bg-[#FAFAFA]">
                    <div>
                      <div className="font-bold text-[#0A0A0A]">{ret.returnNumber}</div>
                      <div className="text-[11px] text-[#666666] mt-0.5">
                        {ret.productTitle} — {ret.variantName}
                      </div>
                      <div className="text-[10px] text-[#888888] mt-1">Reason: {ret.reason}</div>
                    </div>
                    <div className="text-right space-y-1">
                      <StatusBadge status={ret.status} />
                      <div className="text-[11px] font-bold text-[#0A0A0A]">
                        {formatINR(ret.refundAmount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: VIP Streetwear Dossier & Notes */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0A0A0A] text-white p-5 border border-[#0A0A0A] space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles size={16} />
              <span className="font-mono text-xs font-bold uppercase tracking-widest">
                PATRON STATUS INTELLIGENCE
              </span>
            </div>
            <p className="text-xs text-neutral-300 font-sans leading-relaxed">
              {customer.segment === 'VIP'
                ? `Lifetime spend of ${formatINR(customer.totalSpend)} across ${customerOrders.length} order${customerOrders.length === 1 ? '' : 's'} qualifies this patron for VIP status.`
                : `${customerOrders.length} order${customerOrders.length === 1 ? '' : 's'} on record so far.`}
            </p>
            <div className="pt-2 border-t border-neutral-800 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-neutral-400">
                <span>MOST PURCHASED ITEM:</span>
                <span className="text-white font-bold">{topItem || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>PREFERRED PAYMENT:</span>
                <span className="text-white font-bold">{topPayment || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
