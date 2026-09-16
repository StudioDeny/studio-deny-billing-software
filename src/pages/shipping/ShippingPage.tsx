import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { Tabs } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { formatINR } from '../../utils/formatters';
import {
  Truck,
  Search,
  ArrowRight,
  ExternalLink,
  Package,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Send,
} from 'lucide-react';

export const ShippingPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders } = useStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  // Dispatch modal
  const [dispatchOrder, setDispatchOrder] = useState<any | null>(null);
  const [courierName, setCourierName] = useState('Blue Dart Air Express');
  const [trackingNumber, setTrackingNumber] = useState('');

  const shippedOrders = orders.filter((o) => o.fulfillmentStatus === 'SHIPPED');
  const deliveredOrders = orders.filter((o) => o.fulfillmentStatus === 'DELIVERED');
  const packedReadyOrders = orders.filter((o) => o.fulfillmentStatus === 'PACKED');

  const filterTabs = [
    { id: 'ALL', label: 'ALL LOGISTICS', count: packedReadyOrders.length + shippedOrders.length + deliveredOrders.length },
    { id: 'PACKED', label: 'READY FOR CARRIER', count: packedReadyOrders.length },
    { id: 'SHIPPED', label: 'IN TRANSIT', count: shippedOrders.length },
    { id: 'DELIVERED', label: 'DELIVERED', count: deliveredOrders.length },
  ];

  const filteredOrders = orders.filter((o) => {
    // Only show orders in logistics lifecycle
    if (!['PACKED', 'SHIPPED', 'DELIVERED'].includes(o.fulfillmentStatus)) return false;

    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (o.trackingNumber && o.trackingNumber.toLowerCase().includes(search.toLowerCase())) ||
      (o.courierName && o.courierName.toLowerCase().includes(search.toLowerCase()));

    const matchesTab = activeTab === 'ALL' || o.fulfillmentStatus === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleOpenDispatch = (order: any) => {
    setDispatchOrder(order);
    const randomTracking = `BD-${Math.floor(10000000 + Math.random() * 90000000)}`;
    setTrackingNumber(randomTracking);
  };

  const handleConfirmDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrder) return;

    store.updateFulfillmentStatus(
      dispatchOrder.id,
      'SHIPPED',
      courierName,
      trackingNumber
    );

    setDispatchOrder(null);
  };

  const handleMarkDelivered = (orderId: string) => {
    store.updateFulfillmentStatus(orderId, 'DELIVERED');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[rgba(0,0,0,0.18)] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest-editorial text-[#4A4844]">
            LOGISTICS & CARRIER INTEGRATIONS
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] mt-1">
            SHIPPING TRACKER
          </h1>
          <div className="text-xs font-mono text-[#4A4844] mt-2">
            Managing Carrier Dispatch, Waybills, and Blue Dart / Delhivery Express Live Status
          </div>
        </div>

        <Button variant="secondary" onClick={() => navigate('/fulfillment')}>
          <Package size={14} className="mr-2" /> PACKING QUEUE
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricBlock
          label="AWAITING CARRIER"
          value={packedReadyOrders.length}
          subtext="Manifested parcels ready"
        />
        <MetricBlock
          label="ACTIVE IN TRANSIT"
          value={shippedOrders.length}
          subtext="Blue Dart / Delhivery en route"
        />
        <MetricBlock
          label="DELIVERED THIS WEEK"
          value={deliveredOrders.length}
          subtext="Confirmed by customer OTP"
        />
        <MetricBlock
          label="ON-TIME DELIVERY"
          value="98.6%"
          subtext="Express air standard"
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={filterTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-[#D5D5D8] p-3 border border-[rgba(0,0,0,0.18)]">
        <Search size={15} className="text-[#4A4844]" />
        <input
          type="text"
          placeholder="Search by order number, patron name, or carrier AWB tracking number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent font-mono text-xs focus:outline-none placeholder:text-[#4A4844]"
        />
      </div>

      {/* Shipments Table */}
      <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] text-[10px] uppercase text-[#4A4844]">
                <th className="py-3 px-4 font-medium">ORDER NUMBER</th>
                <th className="py-3 px-4 font-medium">PATRON & DESTINATION</th>
                <th className="py-3 px-4 font-medium">CARRIER & AWB TRACKING</th>
                <th className="py-3 px-4 font-medium">PARCEL CONTENTS</th>
                <th className="py-3 px-4 font-medium">STATUS</th>
                <th className="py-3 px-4 font-medium text-right">DISPATCH ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-[#E2E2E4] transition-colors">
                  {/* Order */}
                  <td className="py-3.5 px-4 font-bold text-[#111111]">
                    <button
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="hover:underline font-bold text-[#111111]"
                    >
                      {order.orderNumber}
                    </button>
                  </td>

                  {/* Destination */}
                  <td className="py-3 px-4 text-[#111111]">
                    <div className="font-semibold text-[#111111]">{order.customerName}</div>
                    <div className="text-[11px] text-[#4A4844]">
                      {order.shippingAddress.city}, {order.shippingAddress.state}
                    </div>
                  </td>

                  {/* Carrier & Tracking */}
                  <td className="py-3 px-4">
                    {order.trackingNumber ? (
                      <div>
                        <div className="font-bold text-[#111111] flex items-center gap-1.5">
                          <Truck size={12} className="text-[#4A4844]" />
                          {order.trackingNumber}
                        </div>
                        <div className="text-[10px] text-[#4A4844] uppercase">
                          {order.courierName || 'Blue Dart Air Express'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[#4A4844] text-[11px] italic">
                        Not dispatched yet
                      </span>
                    )}
                  </td>

                  {/* Items */}
                  <td className="py-3 px-4 text-[#4A4844]">
                    {order.items.reduce((s, i) => s + i.quantity, 0)} garments (
                    {order.items.map((i) => i.size).join(', ')})
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    <StatusBadge status={order.fulfillmentStatus} />
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 text-right">
                    {order.fulfillmentStatus === 'PACKED' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenDispatch(order)}
                      >
                        <Send size={12} className="mr-1.5" /> DISPATCH CARRIER
                      </Button>
                    )}

                    {order.fulfillmentStatus === 'SHIPPED' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleMarkDelivered(order.id)}
                        >
                          <CheckCircle2 size={12} className="mr-1.5" /> CONFIRM DELIVERED
                        </Button>
                      </div>
                    )}

                    {order.fulfillmentStatus === 'DELIVERED' && (
                      <span className="text-[11px] font-bold text-emerald-700">
                        COMPLETED
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Modal */}
      {dispatchOrder && (
        <Modal
          isOpen={!!dispatchOrder}
          onClose={() => setDispatchOrder(null)}
          title={`DISPATCH TO COURIER — ${dispatchOrder.orderNumber}`}
        >
          <form onSubmit={handleConfirmDispatch} className="space-y-4 font-mono text-xs">
            <div className="p-3 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] space-y-1">
              <div className="flex justify-between">
                <span className="text-[#4A4844]">ORDER:</span>
                <span className="font-bold text-[#111111]">{dispatchOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A4844]">PATRON:</span>
                <span className="font-bold text-[#111111]">{dispatchOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A4844]">DESTINATION:</span>
                <span>{dispatchOrder.shippingAddress.city}, {dispatchOrder.shippingAddress.pincode}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
                Logistics Partner
              </label>
              <select
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                className="w-full bg-[#E2E2E4] border border-[rgba(0,0,0,0.18)] p-2.5 text-xs font-mono focus:bg-[#D5D5D8] focus:outline-none"
              >
                <option value="Blue Dart Air Express">Blue Dart Air Express (Priority Air)</option>
                <option value="Delhivery Express">Delhivery Express Surface & Air</option>
                <option value="Shiprocket Direct">Shiprocket Direct (Bluedart/DTDC)</option>
                <option value="DHL Express Worldwide">DHL Express International</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
                AWB Tracking Waybill Number
              </label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. BD-98218821"
                required
              />
            </div>

            <div className="pt-3 border-t border-[rgba(0,0,0,0.18)] flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setDispatchOrder(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Handover to Courier
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
