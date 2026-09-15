import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { formatINR, formatDate, formatDateTime } from '../../utils/formatters';
import {
  ArrowLeft,
  Printer,
  Package,
  Truck,
  RotateCcw,
  Check,
  XCircle,
  FileText,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  User,
} from 'lucide-react';
import { FulfillmentStatus } from '../../types';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orders } = useStore();
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);

  // Return form state
  const [returnItemIndex, setReturnItemIndex] = useState(0);
  const [returnReason, setReturnReason] = useState('Size too oversized, requested exchange');
  const [returnCondition, setReturnCondition] = useState('Brand new with tags intact');

  // Shipping form state
  const [courierName, setCourierName] = useState('Blue Dart Air');
  const [trackingNumber, setTrackingNumber] = useState(`BD-${Date.now().toString().slice(-7)}`);

  const order = orders.find((o) => o.id === id || o.orderNumber === id);

  if (!order) {
    return (
      <div className="p-12 text-center border border-[#CFCFD2] bg-white">
        <h2 className="font-display text-xl font-bold uppercase">ORDER NOT FOUND</h2>
        <p className="text-xs text-[#666666] font-mono mt-2">
          The requested order does not exist in Deny OS.
        </p>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/orders')}>
          Return to Orders
        </Button>
      </div>
    );
  }

  const handleMarkPacked = () => {
    store.updateFulfillmentStatus(order.id, 'PACKED');
  };

  const handleShipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateFulfillmentStatus(order.id, 'SHIPPED', courierName, trackingNumber);
    setIsShipModalOpen(false);
  };

  const handleMarkDelivered = () => {
    store.updateFulfillmentStatus(order.id, 'DELIVERED');
  };

  const handleCancelOrder = () => {
    store.updateFulfillmentStatus(order.id, 'CANCELLED');
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = order.items[returnItemIndex] || order.items[0];
    if (!item.id) {
      store.addToast('Cannot Start Return', 'This line item has no record id to return against.', 'error');
      return;
    }
    await store.createReturnRequest({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      productTitle: item.name,
      variantName: item.variantName,
      reason: returnReason,
      condition: returnCondition,
      refundAmount: item.total,
      billItemId: item.id,
      qty: item.quantity,
    });
    setIsReturnModalOpen(false);
    navigate('/returns');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print border-b border-[#CFCFD2] pb-4">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-1.5 text-xs font-mono text-[#666666] hover:text-[#0A0A0A]"
        >
          <ArrowLeft size={14} />
          <span>BACK TO ORDERS</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Printer size={13} />}
            onClick={handlePrint}
          >
            PRINT PACKING SLIP
          </Button>

          {order.fulfillmentStatus === 'UNFULFILLED' && (
            <Button
              variant="primary"
              size="sm"
              icon={<Package size={13} />}
              onClick={handleMarkPacked}
            >
              MARK AS PACKED
            </Button>
          )}

          {order.fulfillmentStatus === 'PACKED' && (
            <Button
              variant="primary"
              size="sm"
              icon={<Truck size={13} />}
              onClick={() => setIsShipModalOpen(true)}
            >
              MARK AS SHIPPED
            </Button>
          )}

          {order.fulfillmentStatus === 'SHIPPED' && (
            <Button
              variant="primary"
              size="sm"
              icon={<Check size={13} />}
              onClick={handleMarkDelivered}
            >
              MARK AS DELIVERED
            </Button>
          )}

          {order.fulfillmentStatus === 'DELIVERED' && (
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw size={13} />}
              onClick={() => setIsReturnModalOpen(true)}
            >
              CREATE RETURN
            </Button>
          )}

          {order.fulfillmentStatus !== 'CANCELLED' && order.fulfillmentStatus !== 'DELIVERED' && (
            <Button
              variant="danger"
              size="sm"
              icon={<XCircle size={13} />}
              onClick={handleCancelOrder}
            >
              CANCEL ORDER
            </Button>
          )}
        </div>
      </div>

      {/* Order Header Summary */}
      <div className="p-6 md:p-8 bg-white border border-[#0A0A0A] shadow-subtle flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-2xl sm:text-3xl tracking-tight text-[#0A0A0A]">
              ORDER {order.orderNumber}
            </span>
            <StatusBadge status={order.fulfillmentStatus} />
          </div>

          <div className="mt-2 text-xs font-mono text-[#666666] flex flex-wrap items-center gap-4">
            <div>PLACED: {formatDateTime(order.createdAt)}</div>
            <span>•</span>
            <div>PAYMENT: <span className="font-bold text-[#0A0A0A] uppercase">{order.paymentStatus} ({order.paymentMethod})</span></div>
            {order.trackingNumber && (
              <>
                <span>•</span>
                <div>COURIER: <span className="font-bold text-[#0A0A0A]">{order.courierName} ({order.trackingNumber})</span></div>
              </>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-mono uppercase text-[#888888]">TOTAL SETTLEMENT</div>
          <div className="font-display font-extrabold text-2xl sm:text-3xl text-[#0A0A0A]">
            {formatINR(order.grandTotal)}
          </div>
        </div>
      </div>

      {/* Main Grid: Products + Financials on Left, Customer + Timeline on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Itemized Products & Financial Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Products List */}
          <div className="border border-[#CFCFD2] bg-white p-6">
            <div className="border-b border-[#CFCFD2] pb-3 mb-4 flex justify-between items-center">
              <h3 className="font-display font-bold text-base text-[#0A0A0A] uppercase">
                ORDERED STREETWEAR ITEMS ({order.items.length})
              </h3>
              <span className="text-xs font-mono text-[#666666]">
                {order.items.reduce((s, i) => s + i.quantity, 0)} TOTAL PIECES
              </span>
            </div>

            <div className="divide-y divide-[#E7E7E9]">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-14 bg-[#F1F1F3] border border-[#CFCFD2] flex items-center justify-center font-mono text-xs font-bold text-[#0A0A0A]">
                      SD
                    </div>
                    <div>
                      <div className="font-display font-bold text-sm sm:text-base text-[#0A0A0A]">
                        {item.name}
                      </div>
                      <div className="text-xs font-mono text-[#666666] mt-0.5">
                        VARIANT: <span className="font-semibold text-[#111111]">{item.variantName}</span>
                      </div>
                      <div className="text-[11px] font-mono text-[#888888] mt-0.5">
                        Rate: {formatINR(item.unitPrice)} × {item.quantity} Qty
                      </div>
                    </div>
                  </div>

                  <div className="font-mono text-sm font-bold text-[#0A0A0A]">
                    {formatINR(item.total)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="border border-[#CFCFD2] bg-white p-6">
            <h3 className="font-display font-bold text-base text-[#0A0A0A] uppercase pb-3 border-b border-[#CFCFD2] mb-4">
              FINANCIAL SETTLEMENT SUMMARY
            </h3>

            <div className="max-w-md ml-auto space-y-2.5 font-mono text-xs">
              <div className="flex justify-between text-[#666666]">
                <span>SUBTOTAL:</span>
                <span className="font-medium text-[#111111]">{formatINR(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>DISCOUNT:</span>
                  <span>-{formatINR(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#666666]">
                <span>SHIPPING:</span>
                <span>{order.shippingFee === 0 ? 'FREE COMPLIMENTARY' : formatINR(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-[#666666]">
                <span>ESTIMATED TAX (GST 18%):</span>
                <span>{formatINR(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#0A0A0A] pt-3 border-t-2 border-[#0A0A0A] bg-[#F1F1F3] p-2 mt-2">
                <span>TOTAL PAID:</span>
                <span>{formatINR(order.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Customer Details & Order Timeline */}
        <div className="space-y-6">
          {/* Customer Information (Requirement 7) */}
          <div className="border border-[#CFCFD2] bg-white p-6">
            <div className="border-b border-[#CFCFD2] pb-3 mb-4 flex justify-between items-center">
              <h3 className="font-display font-bold text-sm text-[#0A0A0A] uppercase">
                CUSTOMER & SHIPPING
              </h3>
              <button
                onClick={() => navigate(`/customers/${order.customerId}`)}
                className="text-[10px] font-mono text-[#0A0A0A] hover:underline"
              >
                VIEW PROFILE →
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono text-[#666666]">
              <div>
                <div className="text-[10px] uppercase text-[#888888]">FULL NAME</div>
                <div className="text-[#0A0A0A] font-bold text-sm mt-0.5">{order.customerName}</div>
              </div>

              <div>
                <div className="text-[10px] uppercase text-[#888888]">EMAIL ADDRESS</div>
                <div className="text-[#111111] mt-0.5">{order.customerEmail}</div>
              </div>

              <div>
                <div className="text-[10px] uppercase text-[#888888]">CONTACT PHONE</div>
                <div className="text-[#111111] mt-0.5">{order.customerPhone}</div>
              </div>

              <div>
                <div className="text-[10px] uppercase text-[#888888]">DELIVERY ADDRESS</div>
                <div className="text-[#111111] mt-0.5 leading-relaxed">
                  {order.shippingAddress.street}<br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}<br />
                  {order.shippingAddress.country}
                </div>
              </div>
            </div>
          </div>

          {/* Fulfillment Timeline (Requirement 7) */}
          <div className="border border-[#CFCFD2] bg-white p-6">
            <h3 className="font-display font-bold text-sm text-[#0A0A0A] uppercase pb-3 border-b border-[#CFCFD2] mb-4">
              FULFILLMENT TIMELINE
            </h3>

            <div className="space-y-4">
              {order.timeline.map((evt, idx) => (
                <div key={idx} className="relative pl-4 border-l-2 border-[#0A0A0A]">
                  <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-[#0A0A0A]" />
                  <div className="font-mono text-xs font-bold text-[#0A0A0A]">
                    {evt.status}
                  </div>
                  {evt.note && (
                    <div className="text-xs text-[#666666] mt-0.5 font-sans">
                      {evt.note}
                    </div>
                  )}
                  <div className="text-[10px] font-mono text-[#888888] mt-1">
                    {formatDateTime(evt.time)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SHIP MODAL */}
      <Modal
        isOpen={isShipModalOpen}
        onClose={() => setIsShipModalOpen(false)}
        title="DISPATCH PARCEL & ASSIGN COURIER"
        subtitle={`ORDER: ${order.orderNumber}`}
        maxWidth="md"
      >
        <form onSubmit={handleShipSubmit} className="space-y-4">
          <Select
            label="COURIER SERVICE"
            value={courierName}
            onChange={(e) => setCourierName(e.target.value)}
            options={[
              { value: 'Blue Dart Air', label: 'Blue Dart Air Express' },
              { value: 'Delhivery Surface', label: 'Delhivery Surface' },
              { value: 'Shadowfax Express', label: 'Shadowfax Hyperlocal' },
              { value: 'DTDC Premium', label: 'DTDC Premium' },
            ]}
          />

          <Input
            label="TRACKING NUMBER / AWB"
            required
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />

          <div className="pt-3 flex justify-end gap-3 border-t border-[#CFCFD2]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsShipModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              [ CONFIRM DISPATCH ]
            </Button>
          </div>
        </form>
      </Modal>

      {/* RETURN MODAL */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="INITIATE RETURN / SIZE EXCHANGE"
        subtitle={`ORDER: ${order.orderNumber}`}
        maxWidth="md"
      >
        <form onSubmit={handleCreateReturn} className="space-y-4">
          <Select
            label="SELECT ITEM TO RETURN"
            value={String(returnItemIndex)}
            onChange={(e) => setReturnItemIndex(Number(e.target.value))}
            options={order.items.map((it, idx) => ({
              value: String(idx),
              label: `${it.name} (${it.variantName}) — ₹${it.total.toLocaleString('en-IN')}`,
            }))}
          />

          <Input
            label="RETURN / EXCHANGE REASON"
            required
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
          />

          <Input
            label="RETURN ITEM CONDITION"
            required
            value={returnCondition}
            onChange={(e) => setReturnCondition(e.target.value)}
          />

          <div className="pt-3 flex justify-end gap-3 border-t border-[#CFCFD2]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReturnModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              [ INITIATE RETURN ]
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
