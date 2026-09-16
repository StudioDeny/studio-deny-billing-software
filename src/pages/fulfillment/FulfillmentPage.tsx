import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { Tabs } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { formatINR } from '../../utils/formatters';
import {
  PackageCheck,
  Search,
  ArrowRight,
  Printer,
  CheckCircle,
  Truck,
  Box,
  CheckSquare,
  Square,
  AlertCircle,
} from 'lucide-react';

export const FulfillmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders } = useStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('UNFULFILLED');

  // Slip Print Modal
  const [printOrder, setPrintOrder] = useState<any | null>(null);

  const unfulfilledOrders = orders.filter((o) => o.fulfillmentStatus === 'UNFULFILLED');
  const processingOrders = orders.filter((o) => o.fulfillmentStatus === 'PROCESSING');
  const packedOrders = orders.filter((o) => o.fulfillmentStatus === 'PACKED');
  const shippedOrders = orders.filter((o) => o.fulfillmentStatus === 'SHIPPED');

  const filterTabs = [
    { id: 'UNFULFILLED', label: 'READY TO PACK', count: unfulfilledOrders.length },
    { id: 'PROCESSING', label: 'IN PICKING', count: processingOrders.length },
    { id: 'PACKED', label: 'READY TO DISPATCH', count: packedOrders.length },
    { id: 'SHIPPED', label: 'DISPATCHED TODAY', count: shippedOrders.length },
  ];

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()));

    const matchesTab = o.fulfillmentStatus === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleMarkPacked = (orderId: string) => {
    store.updateFulfillmentStatus(orderId, 'PACKED');
  };

  const handleBatchPackAll = () => {
    unfulfilledOrders.forEach((o) => {
      store.updateFulfillmentStatus(o.id, 'PACKED');
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[rgba(0,0,0,0.18)] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest-editorial text-[#4A4844]">
            WAREHOUSE FULFILLMENT STATION
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] mt-1">
            PACKING & PICK QUEUE
          </h1>
          <div className="text-xs font-mono text-[#4A4844] mt-2">
            {unfulfilledOrders.length} Streetwear Orders Awaiting Inspection, Garment Folding & Bagging
          </div>
        </div>

        <div className="flex items-center gap-3">
          {unfulfilledOrders.length > 0 && (
            <Button variant="primary" onClick={handleBatchPackAll}>
              <CheckCircle size={14} className="mr-2" /> BATCH PACK ALL ({unfulfilledOrders.length})
            </Button>
          )}

          <Button variant="secondary" onClick={() => navigate('/shipping')}>
            <Truck size={14} className="mr-2" /> SHIPPING DISPATCH
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricBlock
          label="PENDING PACK"
          value={unfulfilledOrders.length}
          subtext="Orders awaiting bagging"
        />
        <MetricBlock
          label="PACKED & STAGED"
          value={packedOrders.length}
          subtext="Ready for carrier pickup"
        />
        <MetricBlock
          label="DISPATCHED TODAY"
          value={shippedOrders.length}
          subtext="Courier manifests generated"
        />
        <MetricBlock
          label="PACKING SLA"
          value="4.2 HRS"
          subtext="Target < 6.0 hrs"
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={filterTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-[#D5D5D8] p-3 border border-[rgba(0,0,0,0.18)]">
        <Search size={15} className="text-[#4A4844]" />
        <input
          type="text"
          placeholder="Filter queue by order number, customer name, or garment silhouette..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent font-mono text-xs focus:outline-none placeholder:text-[#4A4844]"
        />
      </div>

      {/* Queue Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-12 text-center font-mono">
          <PackageCheck size={32} className="mx-auto text-[#4A4844] mb-3" />
          <h3 className="font-bold text-sm text-[#111111]">Queue Clean</h3>
          <p className="text-xs text-[#4A4844] mt-1">No orders in [{activeTab}] state right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-5 hover:border-[#111111] transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[rgba(0,0,0,0.1)] pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#111111] text-[#E2E2E4] flex items-center justify-center font-mono font-bold text-xs">
                    <Box size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#111111]">
                        {order.orderNumber}
                      </span>
                      <StatusBadge status={order.fulfillmentStatus} />
                    </div>
                    <div className="text-xs font-mono text-[#4A4844] mt-0.5">
                      Customer: <span className="text-[#111111] font-semibold">{order.customerName}</span> · {order.shippingAddress.city}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPrintOrder(order)}
                  >
                    <Printer size={13} className="mr-1.5" /> PACKING SLIP
                  </Button>

                  {order.fulfillmentStatus === 'UNFULFILLED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleMarkPacked(order.id)}
                    >
                      <CheckCircle size={13} className="mr-1.5" /> MARK AS PACKED
                    </Button>
                  )}

                  {order.fulfillmentStatus === 'PACKED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/shipping')}
                    >
                      <Truck size={13} className="mr-1.5" /> DISPATCH COURIER
                    </Button>
                  )}
                </div>
              </div>

              {/* Garment Pick List */}
              <div className="mt-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#4A4844] mb-2">
                  GARMENT PICK LIST ({order.items.reduce((s, i) => s + i.quantity, 0)} PIECES)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] flex items-center justify-between font-mono text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#111111]">{item.name}</div>
                        <div className="text-[11px] text-[#4A4844]">
                          COLOR: {item.color} · SIZE:{' '}
                          <span className="font-bold text-[#111111] bg-[#D5D5D8] px-1 border border-[rgba(0,0,0,0.18)]">
                            {item.size}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold px-2 py-1 bg-[#111111] text-[#E2E2E4]">
                          QTY {item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Note & Timestamp */}
              <div className="mt-4 pt-3 border-t border-[rgba(0,0,0,0.1)] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-[#4A4844] gap-2">
                <div>
                  Destination: {order.shippingAddress.street}, {order.shippingAddress.city} - {order.shippingAddress.pincode}
                </div>
                <div>Ordered: {order.createdAt}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Simulated Thermal Packing Slip Modal */}
      {printOrder && (
        <Modal
          isOpen={!!printOrder}
          onClose={() => setPrintOrder(null)}
          title={`PACKING SLIP — ${printOrder.orderNumber}`}
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="p-5 bg-[#E2E2E4] border border-dashed border-[#111111] text-center space-y-3">
              <div className="border-b border-[rgba(0,0,0,0.18)] pb-3">
                <div className="font-display font-black text-xl tracking-tight">STUDIO DENY</div>
                <div className="text-[10px] tracking-widest text-[#4A4844]">
                  WAREHOUSE PACKING SLIP · FULFILLMENT DEPT
                </div>
              </div>

              <div className="text-left space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#4A4844]">ORDER:</span>
                  <span className="font-bold">{printOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4A4844]">CLIENT:</span>
                  <span className="font-bold">{printOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4A4844]">DESTINATION:</span>
                  <span>{printOrder.shippingAddress.city}, {printOrder.shippingAddress.state}</span>
                </div>
              </div>

              <div className="border-t border-b border-[rgba(0,0,0,0.18)] py-2 text-left space-y-2">
                <span className="text-[10px] text-[#4A4844] uppercase block">INSPECTED SILHOUETTES</span>
                {printOrder.items.map((i: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span>
                      [✓] {i.name} ({i.color} / {i.size})
                    </span>
                    <span className="font-bold">x{i.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-[#4A4844] pt-1">
                DENY OS VERIFIED · ZERO DEFECT STANDARD
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setPrintOrder(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  store.addToast('Packing Slip Printed', `Printed slip for ${printOrder.orderNumber} on Brother Laser.`, 'success');
                  setPrintOrder(null);
                }}
              >
                <Printer size={13} className="mr-1.5" /> Print Thermal Slip
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
