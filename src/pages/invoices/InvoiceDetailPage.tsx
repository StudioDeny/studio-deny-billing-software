import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatINR, formatDate } from '../../utils/formatters';
import { ArrowLeft, Printer, Download, Receipt, ShieldCheck } from 'lucide-react';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orders, settings } = useStore();

  const order = orders.find((o) => o.id === id || o.orderNumber === id);

  if (!order) {
    return (
      <div className="py-16 text-center space-y-4 font-mono">
        <h2 className="font-display text-2xl font-bold text-[#0A0A0A]">Invoice Not Found</h2>
        <p className="text-xs text-[#666666]">The tax invoice record does not exist in Deny OS.</p>
        <Button variant="secondary" onClick={() => navigate('/invoices')}>
          <ArrowLeft size={14} className="mr-2" /> Back to Invoices
        </Button>
      </div>
    );
  }

  const invoiceNumber = order.orderNumber.replace('SD-', 'INV-');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Action Bar */}
      <div className="border-b border-[#CFCFD2] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
            <ArrowLeft size={14} className="mr-1.5" /> INVOICES
          </Button>
          <span className="text-[#CFCFD2]">/</span>
          <span className="font-mono text-xs font-semibold text-[#0A0A0A] uppercase tracking-wider">
            {invoiceNumber}
          </span>
          <StatusBadge status={order.paymentStatus} />
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer size={14} className="mr-1.5" /> PRINT TAX INVOICE
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              store.addToast('Invoice Downloaded', `${invoiceNumber}.pdf saved.`, 'success');
            }}
          >
            <Download size={14} className="mr-1.5" /> DOWNLOAD PDF
          </Button>
        </div>
      </div>

      {/* Printable GST Tax Invoice Document */}
      <div className="max-w-4xl mx-auto bg-white border border-[#CFCFD2] p-8 sm:p-12 space-y-8 font-mono shadow-subtle print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-[#0A0A0A] pb-6 gap-6">
          <div>
            <div className="font-display font-black text-3xl sm:text-4xl tracking-tighter text-[#0A0A0A]">
              STUDIO DENY
            </div>
            <div className="text-[11px] text-[#666666] uppercase tracking-widest mt-1">
              HIGH-CLASS STREETWEAR COMMERCE
            </div>
            <div className="text-xs text-[#444444] mt-2 space-y-0.5">
              <div>{settings.address || 'Studio Deny Flagship, 44 Fashion St'}</div>
              <div>{settings.cityState || 'Bandra West, Mumbai 400050, India'}</div>
              <div>GSTIN: {settings.gstin || '27AABCD1234E1Z5'} · PAN: {settings.pan || 'AABCD1234E'}</div>
              <div>support@studiodeny.com · +91 98200 88888</div>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="text-xs font-bold bg-[#0A0A0A] text-white px-2.5 py-1 inline-block uppercase tracking-widest">
              TAX INVOICE
            </div>
            <div className="font-display font-extrabold text-xl text-[#0A0A0A] pt-1">
              {invoiceNumber}
            </div>
            <div className="text-xs text-[#666666]">
              Order Ref: <span className="font-bold text-[#0A0A0A]">{order.orderNumber}</span>
            </div>
            <div className="text-xs text-[#666666]">Date: {order.createdAt.substring(0, 10)}</div>
          </div>
        </div>

        {/* Billed To / Shipped To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
          <div className="p-4 bg-[#F1F1F3] border border-[#CFCFD2] space-y-1">
            <div className="text-[10px] text-[#888888] uppercase tracking-wider">BILLED TO (PATRON):</div>
            <div className="font-bold text-sm text-[#0A0A0A]">{order.customerName}</div>
            <div className="text-[#666666]">{order.customerEmail}</div>
            <div className="text-[#666666]">{order.customerPhone}</div>
          </div>

          <div className="p-4 bg-[#F1F1F3] border border-[#CFCFD2] space-y-1">
            <div className="text-[10px] text-[#888888] uppercase tracking-wider">DISPATCH DESTINATION:</div>
            <div className="font-semibold text-[#0A0A0A]">{order.shippingAddress.street}</div>
            <div className="text-[#666666]">
              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
            </div>
            <div className="text-[#666666]">{order.shippingAddress.country}</div>
          </div>
        </div>

        {/* Items Table */}
        <div className="border border-[#CFCFD2] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#CFCFD2] bg-[#F1F1F3] text-[10px] uppercase text-[#666666]">
                <th className="py-2.5 px-4">HSN/SAC</th>
                <th className="py-2.5 px-4">ITEM DESCRIPTION</th>
                <th className="py-2.5 px-4 text-center">SIZE</th>
                <th className="py-2.5 px-4 text-center">QTY</th>
                <th className="py-2.5 px-4 text-right">UNIT RATE</th>
                <th className="py-2.5 px-4 text-right">TOTAL AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E7]">
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3 px-4 text-[#888888]">61091000</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#0A0A0A]">{item.name}</div>
                    <div className="text-[10px] text-[#666666]">{item.variantName}</div>
                  </td>
                  <td className="py-3 px-4 text-center font-bold">{item.size}</td>
                  <td className="py-3 px-4 text-center font-bold">{item.quantity}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatINR(item.unitPrice)}</td>
                  <td className="py-3 px-4 text-right font-bold text-[#0A0A0A]">{formatINR(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Totals */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
          <div className="text-xs space-y-2 max-w-sm">
            <div className="p-3 bg-[#FAFAFA] border border-[#CFCFD2] space-y-1">
              <span className="text-[10px] text-[#888888] uppercase block">TENDER SETTLEMENT</span>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-700" />
                <span className="font-bold text-emerald-800">
                  PAID IN FULL VIA {order.paymentMethod}
                </span>
              </div>
              <div className="text-[10px] text-[#666666]">
                Auth Ref: {order.id} · Zero Outstanding Balance
              </div>
            </div>
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-[#666666]">
              <span>SUBTOTAL:</span>
              <span>{formatINR(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>DISCOUNT:</span>
                <span>-{formatINR(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#666666]">
              <span>OUTPUT CGST (6%):</span>
              <span>{formatINR(Math.round(order.taxAmount / 2))}</span>
            </div>
            <div className="flex justify-between text-[#666666]">
              <span>OUTPUT SGST (6%):</span>
              <span>{formatINR(Math.round(order.taxAmount / 2))}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-[#0A0A0A] text-sm">
              <span className="font-bold text-[#0A0A0A]">GRAND TOTAL:</span>
              <span className="font-black text-xl text-[#0A0A0A]">{formatINR(order.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="border-t border-[#E5E5E7] pt-4 text-center text-[10px] text-[#888888] space-y-1">
          <div>This is a computer generated tax invoice in accordance with CGST/SGST Act 2017.</div>
          <div className="tracking-widest uppercase font-semibold text-[#0A0A0A]">
            STUDIO DENY · INTERNAL COMMERCE OPERATING SYSTEM
          </div>
        </div>
      </div>
    </div>
  );
};
