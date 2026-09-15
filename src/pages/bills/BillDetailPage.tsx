import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatINR } from '../../utils/formatters';
import { printThermalReceipt, printTaxInvoice } from '../../utils/receiptPrinter';
import { BarcodeSvg } from '../../components/common/BarcodeSvg';
import {
  ArrowLeft,
  Printer,
  Receipt,
  Download,
  CreditCard,
  Banknote,
  QrCode,
  Split,
  Building2,
  CheckCircle2,
} from 'lucide-react';

export const BillDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orders, settings } = useStore();
  const [activeView, setActiveView] = useState<'SLIP' | 'TAX_INVOICE'>('SLIP');

  const bill = orders.find(
    (o) =>
      o.id === id ||
      o.orderNumber === id ||
      o.orderNumber.replace('SD-', 'INV-') === id
  );

  if (!bill) {
    return (
      <div className="py-16 text-center space-y-4 font-mono">
        <h2 className="font-display text-2xl font-bold text-[#0A0A0A]">Bill Not Found</h2>
        <p className="text-xs text-[#666666]">This transaction does not exist in the register.</p>
        <Button variant="secondary" onClick={() => navigate('/bills')}>
          <ArrowLeft size={14} className="mr-2" /> Back to Bills
        </Button>
      </div>
    );
  }

  const handlePrint = () => {
    const receiptData = {
      orderNumber: bill.orderNumber,
      createdAt: bill.createdAt,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
      customerEmail: bill.customerEmail,
      items: bill.items,
      subtotal: bill.subtotal,
      discount: bill.discount,
      taxAmount: bill.taxAmount,
      grandTotal: bill.grandTotal,
      paymentMethod: bill.paymentMethod,
      paymentSplits: bill.paymentSplits,
      changeAmount: bill.changeAmount,
      storeSettings: {
        storeName: settings.storeName,
        address: settings.address,
        cityState: settings.cityState,
        gstin: settings.gstin,
        pan: settings.pan,
        taxRate: settings.taxRate,
      },
    };

    if (activeView === 'SLIP') {
      store.addToast('Printing Receipt', `Sent ${bill.orderNumber} to Thermal POS-80.`, 'info');
      printThermalReceipt(receiptData);
    } else {
      store.addToast('Generating Invoice', `Opening A4 Tax Invoice for ${bill.orderNumber}.`, 'info');
      printTaxInvoice(receiptData);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Action Bar (hidden when printing) */}
      <div className="border-b border-[#CFCFD2] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/bills')}>
            <ArrowLeft size={14} className="mr-1.5" /> BILLS
          </Button>
          <span className="text-[#CFCFD2]">/</span>
          <span className="font-mono text-xs font-bold text-[#0A0A0A]">
            {bill.orderNumber}
          </span>
          <StatusBadge status={bill.paymentStatus} />
        </div>

        <div className="flex items-center gap-2.5">
          {/* Toggle between 80mm Slip and Tax Invoice View */}
          <div className="flex border border-[#CFCFD2] font-mono text-xs">
            <button
              onClick={() => setActiveView('SLIP')}
              className={`px-3 py-1.5 font-bold ${
                activeView === 'SLIP'
                  ? 'bg-[#0A0A0A] text-white'
                  : 'bg-white text-[#666666] hover:text-[#0A0A0A]'
              }`}
            >
              80MM THERMAL SLIP
            </button>
            <button
              onClick={() => setActiveView('TAX_INVOICE')}
              className={`px-3 py-1.5 font-bold ${
                activeView === 'TAX_INVOICE'
                  ? 'bg-[#0A0A0A] text-white'
                  : 'bg-white text-[#666666] hover:text-[#0A0A0A]'
              }`}
            >
              FULL TAX INVOICE
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={handlePrint}>
            <Printer size={14} className="mr-1.5" /> REPRINT
          </Button>
        </div>
      </div>

      {/* VIEW 1: 80MM THERMAL RECEIPT SLIP */}
      {activeView === 'SLIP' && (
        <div className="thermal-receipt-print max-w-md mx-auto bg-white border border-dashed border-[#0A0A0A] p-6 sm:p-8 font-mono text-xs shadow-md space-y-4 print:border-none print:shadow-none print:p-0">
          <div className="border-b border-[#CFCFD2] pb-3 text-center">
            <div className="font-display font-black text-2xl tracking-tighter">
              STUDIO DENY
            </div>
            <div className="text-[10px] tracking-widest text-[#666666] uppercase mt-0.5">
              HIGH-CLASS STREETWEAR FLAGSHIP
            </div>
            <div className="text-[9px] text-[#888888] mt-1">
              {settings.address || 'Studio 4B, The Mill Compound, Lower Parel'}
            </div>
            <div className="text-[9px] text-[#888888]">
              GSTIN: {settings.gstin || '27AAACS1429B1ZX'}
            </div>
          </div>

          <div className="text-left text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-[#666666]">INVOICE #:</span>
              <span className="font-bold">{bill.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">TIMESTAMP:</span>
              <span>{bill.createdAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">PATRON:</span>
              <span className="font-semibold">{bill.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">PHONE:</span>
              <span>{bill.customerPhone}</span>
            </div>
          </div>

          {/* Line Items */}
          <div className="border-t border-b border-[#CFCFD2] py-2.5 text-left space-y-2 text-[11px]">
            {bill.items.map((i, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div>
                  <div className="font-bold">{i.name}</div>
                  <div className="text-[10px] text-[#666666]">
                    {i.size} · {i.color} × {i.quantity} @ {formatINR(i.unitPrice)}
                  </div>
                </div>
                <span className="font-bold">{formatINR(i.total)}</span>
              </div>
            ))}
          </div>

          {/* Ledger Totals */}
          <div className="text-right text-[11px] space-y-1">
            <div className="flex justify-between text-[#666666]">
              <span>SUBTOTAL:</span>
              <span>{formatINR(bill.subtotal)}</span>
            </div>
            {bill.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>DISCOUNT{bill.discountReason ? ` (${bill.discountReason})` : ''}:</span>
                <span className="font-bold">-{formatINR(bill.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#666666]">
              <span>GST ({settings.taxRate || 12}%):</span>
              <span>{formatINR(bill.taxAmount)}</span>
            </div>
            <div className="flex justify-between font-black text-base border-t border-[#0A0A0A] pt-1 text-[#0A0A0A]">
              <span>TOTAL PAID:</span>
              <span>{formatINR(bill.grandTotal)}</span>
            </div>
          </div>

          {/* Tender Breakdown */}
          <div className="border-t border-[#E5E5E7] pt-2 text-left text-[10px] space-y-0.5">
            <div className="font-bold uppercase text-[#444444]">TENDER METHOD:</div>
            {bill.paymentSplits && bill.paymentSplits.length > 0 ? (
              bill.paymentSplits.map((s, idx) => (
                <div key={idx} className="flex justify-between text-[#666666]">
                  <span>{s.method}:</span>
                  <span className="font-semibold">{formatINR(s.amount)}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-[#666666]">
                <span>{bill.paymentMethod}:</span>
                <span className="font-semibold">{formatINR(bill.grandTotal)}</span>
              </div>
            )}
            {bill.changeAmount && bill.changeAmount > 0 && (
              <div className="flex justify-between text-emerald-800 font-bold pt-0.5">
                <span>CHANGE RETURNED:</span>
                <span>{formatINR(bill.changeAmount)}</span>
              </div>
            )}
          </div>

          {/* Barcode & Footer */}
          <div className="pt-3 border-t border-[#E5E5E7] space-y-1 text-center">
            <BarcodeSvg value={bill.orderNumber} width={180} height={28} />
            <div className="text-[9px] text-[#888888] uppercase mt-1">
              STUDIO DENY · ALL SALES FINAL ON DROP CAPSULES
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FULL GST TAX INVOICE */}
      {activeView === 'TAX_INVOICE' && (
        <div className="invoice-tax-print max-w-3xl mx-auto bg-white border border-[#CFCFD2] p-8 sm:p-12 space-y-8 font-mono shadow-subtle print:border-none print:shadow-none print:p-0 text-xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-[#0A0A0A] pb-6 gap-6">
            <div>
              <div className="font-display font-black text-3xl tracking-tighter text-[#0A0A0A]">
                STUDIO DENY
              </div>
              <div className="text-[11px] text-[#666666] uppercase tracking-widest mt-0.5">
                HIGH-CLASS STREETWEAR COMMERCE
              </div>
              <div className="text-xs text-[#444444] mt-2 space-y-0.5">
                <div>{settings.address || 'Studio 4B, The Mill Compound, Lower Parel'}</div>
                <div>{settings.cityState || 'Mumbai, MH 400013'}</div>
                <div>GSTIN: {settings.gstin || '27AAACS1429B1ZX'} · PAN: {settings.pan || 'AAACS1429B'}</div>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="text-xs font-bold bg-[#0A0A0A] text-white px-2.5 py-1 inline-block uppercase tracking-widest">
                TAX INVOICE
              </div>
              <div className="font-display font-extrabold text-xl text-[#0A0A0A] pt-1">
                {bill.orderNumber}
              </div>
              <div className="text-xs text-[#666666]">Date: {bill.createdAt}</div>
            </div>
          </div>

          {/* Patron Info */}
          <div className="p-4 bg-[#F1F1F3] border border-[#CFCFD2] space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
              BILLED TO PATRON
            </div>
            <div className="font-bold text-sm text-[#0A0A0A]">{bill.customerName}</div>
            <div className="text-[#666666]">{bill.customerPhone}</div>
            <div className="text-[#666666]">{bill.customerEmail}</div>
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[#0A0A0A] bg-[#F1F1F3] text-[10px] uppercase text-[#666666]">
                <th className="py-2.5 px-3">ITEM DESCRIPTION</th>
                <th className="py-2.5 px-3">SIZE / COLOR</th>
                <th className="py-2.5 px-3 text-center">QTY</th>
                <th className="py-2.5 px-3 text-right">UNIT PRICE</th>
                <th className="py-2.5 px-3 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E7]">
              {bill.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3 px-3 font-bold">{item.name}</td>
                  <td className="py-3 px-3 text-[#666666]">{item.size} · {item.color}</td>
                  <td className="py-3 px-3 text-center font-bold">{item.quantity}</td>
                  <td className="py-3 px-3 text-right">{formatINR(item.unitPrice)}</td>
                  <td className="py-3 px-3 text-right font-bold">{formatINR(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end pt-4 border-t border-[#0A0A0A]">
            <div className="w-64 space-y-1.5 text-xs text-right">
              <div className="flex justify-between text-[#666666]">
                <span>SUBTOTAL:</span>
                <span>{formatINR(bill.subtotal)}</span>
              </div>
              {bill.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>DISCOUNT{bill.discountReason ? ` (${bill.discountReason})` : ''}:</span>
                  <span className="font-bold">-{formatINR(bill.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#666666]">
                <span>GST ({settings.taxRate || 12}%):</span>
                <span>{formatINR(bill.taxAmount)}</span>
              </div>
              <div className="flex justify-between font-black text-base border-t border-[#0A0A0A] pt-2 text-[#0A0A0A]">
                <span>TOTAL:</span>
                <span>{formatINR(bill.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
