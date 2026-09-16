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
  Ban,
} from 'lucide-react';

export const BillDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orders, settings, currentStaff } = useStore();
  const [activeView, setActiveView] = useState<'SLIP' | 'TAX_INVOICE'>('SLIP');
  const [isVoiding, setIsVoiding] = useState(false);
  const canVoid = currentStaff?.permissions.includes('BILLS');

  const bill = orders.find(
    (o) =>
      o.id === id ||
      o.orderNumber === id ||
      o.orderNumber.replace('SD-', 'INV-') === id
  );

  if (!bill) {
    return (
      <div className="py-16 text-center space-y-4 font-mono">
        <h2 className="font-display text-2xl font-bold text-[#111111]">Bill Not Found</h2>
        <p className="text-xs text-[#4A4844]">This transaction does not exist in the register.</p>
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

  const handleVoidBill = async () => {
    const reason = window.prompt(
      `Void ${bill.orderNumber}? This restores all ${bill.items.reduce((s, i) => s + i.quantity, 0)} units to stock and cannot be undone.\n\nReason for voiding:`
    );
    if (reason === null) return;
    if (!reason.trim()) {
      store.addToast('Reason Required', 'A reason is required to void a bill.', 'error');
      return;
    }
    setIsVoiding(true);
    try {
      await store.voidBill(bill.id, reason.trim());
    } catch (err) {
      store.addToast('Void Failed', err instanceof Error ? err.message : 'Could not void this bill.', 'error');
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Action Bar (hidden when printing) */}
      <div className="border-b border-[rgba(0,0,0,0.18)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/bills')}>
            <ArrowLeft size={14} className="mr-1.5" /> BILLS
          </Button>
          <span className="text-[rgba(0,0,0,0.18)]">/</span>
          <span className="font-mono text-xs font-bold text-[#111111]">
            {bill.orderNumber}
          </span>
          <StatusBadge status={bill.paymentStatus} />
          {bill.billStatus === 'VOID' && (
            <span className="px-2 py-0.5 bg-red-600 text-[#E2E2E4] text-[10px] font-bold font-mono uppercase">
              VOIDED
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Toggle between 80mm Slip and Tax Invoice View */}
          <div className="flex border border-[rgba(0,0,0,0.18)] font-mono text-xs">
            <button
              onClick={() => setActiveView('SLIP')}
              className={`px-3 py-1.5 font-bold ${
                activeView === 'SLIP'
                  ? 'bg-[#111111] text-[#E2E2E4]'
                  : 'bg-[#D5D5D8] text-[#4A4844] hover:text-[#111111]'
              }`}
            >
              80MM THERMAL SLIP
            </button>
            <button
              onClick={() => setActiveView('TAX_INVOICE')}
              className={`px-3 py-1.5 font-bold ${
                activeView === 'TAX_INVOICE'
                  ? 'bg-[#111111] text-[#E2E2E4]'
                  : 'bg-[#D5D5D8] text-[#4A4844] hover:text-[#111111]'
              }`}
            >
              FULL TAX INVOICE
            </button>
          </div>

          {canVoid && bill.billStatus !== 'VOID' && (
            <Button variant="secondary" size="sm" onClick={handleVoidBill} disabled={isVoiding}>
              <Ban size={14} className="mr-1.5" /> {isVoiding ? 'VOIDING...' : 'VOID BILL'}
            </Button>
          )}

          <Button variant="primary" size="sm" onClick={handlePrint}>
            <Printer size={14} className="mr-1.5" /> REPRINT
          </Button>
        </div>
      </div>

      {/* VIEW 1: 80MM THERMAL RECEIPT SLIP */}
      {activeView === 'SLIP' && (
        <div className="thermal-receipt-print max-w-md mx-auto bg-[#D5D5D8] border border-dashed border-[#111111] p-6 sm:p-8 font-mono text-xs shadow-md space-y-4 print:border-none print:shadow-none print:p-0">
          <div className="border-b border-[rgba(0,0,0,0.18)] pb-3 text-center">
            <div className="font-display font-black text-2xl tracking-tighter">
              {settings.storeName || 'STUDIO DENY'}
            </div>
            <div className="text-[10px] tracking-widest text-[#4A4844] uppercase mt-0.5">
              HIGH-CLASS STREETWEAR FLAGSHIP
            </div>
            {settings.address && (
              <div className="text-[9px] text-[#4A4844] mt-1">{settings.address}</div>
            )}
            {settings.gstin && (
              <div className="text-[9px] text-[#4A4844]">GSTIN: {settings.gstin}</div>
            )}
          </div>

          <div className="text-left text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-[#4A4844]">INVOICE #:</span>
              <span className="font-bold">{bill.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4A4844]">TIMESTAMP:</span>
              <span>{bill.createdAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4A4844]">PATRON:</span>
              <span className="font-semibold">{bill.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4A4844]">PHONE:</span>
              <span>{bill.customerPhone}</span>
            </div>
          </div>

          {/* Line Items */}
          <div className="border-t border-b border-[rgba(0,0,0,0.18)] py-2.5 text-left space-y-2 text-[11px]">
            {bill.items.map((i, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div>
                  <div className="font-bold">{i.name}</div>
                  <div className="text-[10px] text-[#4A4844]">
                    {i.size} · {i.color} × {i.quantity} @ {formatINR(i.unitPrice)}
                  </div>
                </div>
                <span className="font-bold">{formatINR(i.total)}</span>
              </div>
            ))}
          </div>

          {/* Ledger Totals */}
          <div className="text-right text-[11px] space-y-1">
            <div className="flex justify-between text-[#4A4844]">
              <span>SUBTOTAL:</span>
              <span>{formatINR(bill.subtotal)}</span>
            </div>
            {bill.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>DISCOUNT{bill.discountReason ? ` (${bill.discountReason})` : ''}:</span>
                <span className="font-bold">-{formatINR(bill.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#4A4844]">
              <span>GST ({settings.taxRate ?? 0}%):</span>
              <span>{formatINR(bill.taxAmount)}</span>
            </div>
            <div className="flex justify-between font-black text-base border-t border-[#111111] pt-1 text-[#111111]">
              <span>TOTAL PAID:</span>
              <span>{formatINR(bill.grandTotal)}</span>
            </div>
          </div>

          {/* Tender Breakdown */}
          <div className="border-t border-[rgba(0,0,0,0.1)] pt-2 text-left text-[10px] space-y-0.5">
            <div className="font-bold uppercase text-[#111111]">TENDER METHOD:</div>
            {bill.paymentSplits && bill.paymentSplits.length > 0 ? (
              bill.paymentSplits.map((s, idx) => (
                <div key={idx} className="flex justify-between text-[#4A4844]">
                  <span>{s.method}:</span>
                  <span className="font-semibold">{formatINR(s.amount)}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-[#4A4844]">
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
          <div className="pt-3 border-t border-[rgba(0,0,0,0.1)] space-y-1 text-center">
            <BarcodeSvg value={bill.orderNumber} width={180} height={28} />
            <div className="text-[9px] text-[#4A4844] uppercase mt-1">
              STUDIO DENY · ALL SALES FINAL ON DROP CAPSULES
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FULL GST TAX INVOICE */}
      {activeView === 'TAX_INVOICE' && (
        <div className="invoice-tax-print max-w-3xl mx-auto bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-8 sm:p-12 space-y-8 font-mono shadow-subtle print:border-none print:shadow-none print:p-0 text-xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-[#111111] pb-6 gap-6">
            <div>
              <div className="font-display font-black text-3xl tracking-tighter text-[#111111]">
                {settings.storeName || 'STUDIO DENY'}
              </div>
              <div className="text-[11px] text-[#4A4844] uppercase tracking-widest mt-0.5">
                HIGH-CLASS STREETWEAR COMMERCE
              </div>
              <div className="text-xs text-[#111111] mt-2 space-y-0.5">
                {settings.address && <div>{settings.address}</div>}
                {settings.cityState && <div>{settings.cityState}</div>}
                {(settings.gstin || settings.pan) && (
                  <div>
                    {settings.gstin && `GSTIN: ${settings.gstin}`}
                    {settings.gstin && settings.pan && ' · '}
                    {settings.pan && `PAN: ${settings.pan}`}
                  </div>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="text-xs font-bold bg-[#111111] text-[#E2E2E4] px-2.5 py-1 inline-block uppercase tracking-widest">
                TAX INVOICE
              </div>
              <div className="font-display font-extrabold text-xl text-[#111111] pt-1">
                {bill.orderNumber}
              </div>
              <div className="text-xs text-[#4A4844]">Date: {bill.createdAt}</div>
            </div>
          </div>

          {/* Patron Info */}
          <div className="p-4 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-[#4A4844] font-bold">
              BILLED TO PATRON
            </div>
            <div className="font-bold text-sm text-[#111111]">{bill.customerName}</div>
            <div className="text-[#4A4844]">{bill.customerPhone}</div>
            <div className="text-[#4A4844]">{bill.customerEmail}</div>
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[#111111] bg-[#D5D5D8] text-[10px] uppercase text-[#4A4844]">
                <th className="py-2.5 px-3">ITEM DESCRIPTION</th>
                <th className="py-2.5 px-3">SIZE / COLOR</th>
                <th className="py-2.5 px-3 text-center">QTY</th>
                <th className="py-2.5 px-3 text-right">UNIT PRICE</th>
                <th className="py-2.5 px-3 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
              {bill.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3 px-3 font-bold">{item.name}</td>
                  <td className="py-3 px-3 text-[#4A4844]">{item.size} · {item.color}</td>
                  <td className="py-3 px-3 text-center font-bold">{item.quantity}</td>
                  <td className="py-3 px-3 text-right">{formatINR(item.unitPrice)}</td>
                  <td className="py-3 px-3 text-right font-bold">{formatINR(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end pt-4 border-t border-[#111111]">
            <div className="w-64 space-y-1.5 text-xs text-right">
              <div className="flex justify-between text-[#4A4844]">
                <span>SUBTOTAL:</span>
                <span>{formatINR(bill.subtotal)}</span>
              </div>
              {bill.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>DISCOUNT{bill.discountReason ? ` (${bill.discountReason})` : ''}:</span>
                  <span className="font-bold">-{formatINR(bill.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#4A4844]">
                <span>GST ({settings.taxRate ?? 0}%):</span>
                <span>{formatINR(bill.taxAmount)}</span>
              </div>
              <div className="flex justify-between font-black text-base border-t border-[#111111] pt-2 text-[#111111]">
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
