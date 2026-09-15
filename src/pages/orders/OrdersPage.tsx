import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { Tabs } from '../../components/ui/Tabs';
import { formatINR, formatDate } from '../../utils/formatters';
import { Search, ArrowRight, ShoppingBag, Plus, Receipt } from 'lucide-react';
import { FulfillmentStatus } from '../../types';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const totalOrders = orders.length;
  const unfulfilledOrders = orders.filter((o) => o.fulfillmentStatus === 'UNFULFILLED');
  const packedOrders = orders.filter((o) => o.fulfillmentStatus === 'PACKED');
  const shippedOrders = orders.filter((o) => o.fulfillmentStatus === 'SHIPPED');

  const filterTabs = [
    { id: 'ALL', label: 'ALL ORDERS', count: orders.length },
    { id: 'UNFULFILLED', label: 'UNFULFILLED', count: unfulfilledOrders.length },
    { id: 'PROCESSING', label: 'PROCESSING', count: orders.filter((o) => o.fulfillmentStatus === 'PROCESSING').length },
    { id: 'PACKED', label: 'PACKED', count: packedOrders.length },
    { id: 'SHIPPED', label: 'SHIPPED', count: shippedOrders.length },
    { id: 'DELIVERED', label: 'DELIVERED', count: orders.filter((o) => o.fulfillmentStatus === 'DELIVERED').length },
    { id: 'CANCELLED', label: 'CANCELLED', count: orders.filter((o) => o.fulfillmentStatus === 'CANCELLED').length },
    { id: 'RETURNED', label: 'RETURNED', count: orders.filter((o) => o.fulfillmentStatus === 'RETURNED').length },
  ];

  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      ord.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(search.toLowerCase()) ||
      ord.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
      (ord.trackingNumber && ord.trackingNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || ord.fulfillmentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[#CFCFD2] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest-editorial text-[#888888]">
            COMMERCE LEDGER
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A0A0A] mt-1">
            ORDERS MANAGEMENT
          </h1>
          <div className="text-xs font-mono text-[#666666] mt-2">
            Managing {totalOrders} Direct-to-Consumer & POS Customer Orders
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/fulfillment')}
          >
            PACKING STATION
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Receipt size={14} />}
            onClick={() => navigate('/billing/new')}
          >
            [ POS NEW BILL ]
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricBlock
          label="TOTAL COMMERCE ORDERS"
          value={String(totalOrders)}
          subValue="D2C & Flagship Counter"
        />
        <MetricBlock
          label="UNFULFILLED QUEUE"
          value={String(unfulfilledOrders.length)}
          trend={unfulfilledOrders.length > 0 ? { value: 'PACKING REQUIRED', isPositive: false } : undefined}
          subValue="Awaiting warehouse box pack"
        />
        <MetricBlock
          label="PACKED & READY"
          value={String(packedOrders.length)}
          subValue="Ready for courier handover"
        />
        <MetricBlock
          label="IN TRANSIT / SHIPPED"
          value={String(shippedOrders.length)}
          subValue="Air & Surface dispatch"
        />
      </div>

      {/* Filter Tabs (Requirement 6) */}
      <Tabs tabs={filterTabs} activeTab={statusFilter} onChange={setStatusFilter} />

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 p-3 bg-[#F1F1F3] border border-[#CFCFD2]">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number (SD-1000248), customer name, or AWB..."
            className="w-full bg-white text-xs font-mono pl-9 pr-3 py-2 border border-[#CFCFD2] focus:border-[#0A0A0A] focus:outline-none"
          />
        </div>

        <div className="text-xs font-mono text-[#666666]">
          SHOWING {filteredOrders.length} OF {orders.length}
        </div>
      </div>

      {/* Orders Table (Requirement 6) */}
      <div className="border border-[#CFCFD2] bg-white overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-[#0A0A0A] bg-[#F1F1F3] text-[10px] font-mono uppercase tracking-widest-editorial text-[#0A0A0A]">
              <th className="py-3 px-4 font-bold">ORDER</th>
              <th className="py-3 px-4 font-bold">CUSTOMER</th>
              <th className="py-3 px-4 font-bold">ITEMS</th>
              <th className="py-3 px-4 font-bold">DATE</th>
              <th className="py-3 px-4 text-right font-bold">AMOUNT</th>
              <th className="py-3 px-4 font-bold">PAYMENT</th>
              <th className="py-3 px-4 font-bold">STATUS</th>
              <th className="py-3 px-4 text-right font-bold">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E7E9] text-xs">
            {filteredOrders.map((ord) => (
              <tr
                key={ord.id}
                onClick={() => navigate(`/orders/${ord.id}`)}
                className="hover:bg-[#F1F1F3] transition-colors cursor-pointer group"
              >
                <td className="py-4 px-4 font-mono font-bold text-[#0A0A0A]">
                  {ord.orderNumber}
                </td>

                <td className="py-4 px-4">
                  <div className="font-display font-bold text-sm text-[#0A0A0A]">
                    {ord.customerName}
                  </div>
                  <div className="text-xs font-mono text-[#666666] mt-0.5">
                    {ord.shippingAddress.city}
                  </div>
                </td>

                <td className="py-4 px-4 font-mono text-[#111111]">
                  <span className="font-bold">{ord.items.reduce((s, i) => s + i.quantity, 0)} ITEMS</span>
                  <div className="text-[11px] text-[#888888] truncate max-w-xs">
                    {ord.items.map((i) => i.name).join(', ')}
                  </div>
                </td>

                <td className="py-4 px-4 font-mono text-[#666666]">
                  {formatDate(ord.createdAt)}
                </td>

                <td className="py-4 px-4 text-right font-mono font-bold text-[#0A0A0A] text-sm">
                  {formatINR(ord.grandTotal)}
                </td>

                <td className="py-4 px-4">
                  <span className="font-mono text-[11px] px-2 py-0.5 border border-[#CFCFD2] bg-white font-semibold text-[#0A0A0A] uppercase">
                    {ord.paymentStatus} ({ord.paymentMethod})
                  </span>
                </td>

                <td className="py-4 px-4">
                  <StatusBadge status={ord.fulfillmentStatus} />
                </td>

                <td className="py-4 px-4 text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-mono text-[#0A0A0A] group-hover:underline">
                    <span>VIEW</span>
                    <ArrowRight size={13} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
