import React, { useState } from 'react';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatINR } from '../../utils/formatters';
import { OrderItem } from '../../types';
import { slabTaxRate, taxFor, formatRate } from '../../utils/tax';
import { Search, Trash2, Plus, Save, AlertTriangle } from 'lucide-react';

export const EditInvoicePanel: React.FC = () => {
  const { orders, products, settings } = useStore();
  const [search, setSearch] = useState('');
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [discountReason, setDiscountReason] = useState('');
  // '' = GST slab (computed by the database); a number = custom % override.
  const [customTaxRate, setCustomTaxRate] = useState('');
  const [shippingFee, setShippingFee] = useState('0');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // Selected colour x size row to add (never just a product - stock moves per size).
  const [addVariantId, setAddVariantId] = useState('');

  const selectedBill = orders.find((o) => o.id === selectedBillId);

  const matchingBills = search.trim()
    ? orders.filter((o) => o.orderNumber.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8)
    : [];

  const selectBill = (billId: string) => {
    const bill = orders.find((o) => o.id === billId);
    if (!bill) return;
    setSelectedBillId(billId);
    setItems(bill.items.map((i) => ({ ...i })));
    setDiscount(String(bill.discount));
    setDiscountReason(bill.discountReason || '');
    setCustomTaxRate(bill.taxIsCustom && bill.taxRate !== undefined ? String(bill.taxRate) : '');
    setShippingFee(String(bill.shippingFee));
    setNotes(bill.notes || '');
    setSearch('');
  };

  const updateItem = (idx: number, field: 'quantity' | 'unitPrice', value: number) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const quantity = field === 'quantity' ? value : it.quantity;
        const unitPrice = field === 'unitPrice' ? value : it.unitPrice;
        return { ...it, quantity, unitPrice, total: quantity * unitPrice - (it.itemDiscount || 0) };
      })
    );
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    const product = products.find((p) => p.variants.some((v) => v.id === addVariantId));
    const variant = product?.variants.find((v) => v.id === addVariantId);
    if (!product || !variant) return;
    setItems((prev) => [
      ...prev,
      {
        id: undefined,
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        variantName: [variant.color, variant.size].filter(Boolean).join(' / '),
        size: variant.size,
        color: variant.color,
        quantity: 1,
        unitPrice: variant.price,
        total: variant.price,
      },
    ]);
    setAddVariantId('');
  };

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity - (i.itemDiscount || 0), 0);
  const taxable = Math.max(0, subtotal - (Number(discount) || 0));
  const isCustomTax = customTaxRate.trim() !== '';
  const previewTaxRate = isCustomTax ? Number(customTaxRate) || 0 : slabTaxRate(taxable, settings);
  const previewTax = taxFor(taxable, previewTaxRate);
  const grandTotal = taxable + previewTax + (Number(shippingFee) || 0);

  const handleSave = async () => {
    if (!selectedBillId || items.length === 0) return;
    if (isCustomTax) {
      const rate = Number(customTaxRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        store.addToast('Invalid Tax Rate', 'Custom tax % must be between 0 and 100, or empty for the GST slab.', 'error');
        return;
      }
    }
    setIsSaving(true);
    try {
      await store.editBill(selectedBillId, items, {
        discount: Number(discount) || 0,
        discountReason,
        customTaxRate: isCustomTax ? Number(customTaxRate) : null,
        shippingFee: Number(shippingFee) || 0,
        notes,
      });
      setSelectedBillId(null);
      setItems([]);
    } catch (err) {
      store.addToast('Edit Failed', err instanceof Error ? err.message : 'Could not save changes.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-6 space-y-5 shadow-subtle font-mono text-xs">
      <div className="border-b border-[rgba(0,0,0,0.1)] pb-3 flex items-center gap-2">
        <AlertTriangle size={16} className="text-red-600" />
        <h3 className="font-bold text-xs uppercase tracking-wider text-[#111111]">
          EDIT SETTLED INVOICE
        </h3>
      </div>

      <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 p-3">
        Changes here alter an already-issued tax invoice's items and totals directly, including stock and the
        customer's recorded lifetime spend. There is no separate change log - only use this to correct a genuine
        mistake, not routinely.
      </div>

      {!selectedBill ? (
        <>
          <div className="flex items-center gap-2 bg-[#D5D5D8] px-3 py-2 border border-[rgba(0,0,0,0.18)]">
            <Search size={14} className="text-[#4A4844]" />
            <input
              placeholder="Search bill number (e.g. SDS-2609-0001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent font-mono text-xs focus:outline-none placeholder:text-[#4A4844]"
            />
          </div>
          {matchingBills.length > 0 && (
            <div className="border border-[rgba(0,0,0,0.18)] divide-y divide-[rgba(0,0,0,0.1)]">
              {matchingBills.map((b) => (
                <button
                  key={b.id}
                  onClick={() => selectBill(b.id)}
                  className="w-full text-left px-3 py-2.5 hover:bg-[#D5D5D8] flex items-center justify-between"
                >
                  <span className="font-bold text-[#111111]">{b.orderNumber}</span>
                  <span className="text-[#4A4844]">{b.customerName} · {formatINR(b.grandTotal)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-bold text-[#111111] text-sm">{selectedBill.orderNumber}</div>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedBillId(null); setItems([]); }}>
              CANCEL / SEARCH ANOTHER
            </Button>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] text-[10px] uppercase text-[#4A4844]">
                <th className="py-2 px-2">ITEM</th>
                <th className="py-2 px-2 w-20">QTY</th>
                <th className="py-2 px-2 w-28">UNIT PRICE</th>
                <th className="py-2 px-2 text-right w-28">LINE TOTAL</th>
                <th className="py-2 px-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-2">
                    <div className="font-bold text-[#111111]">{item.name}</div>
                    <div className="text-[10px] text-[#4A4844]">{item.variantName}</div>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                      className="w-full bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-1.5 text-xs font-mono focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, 'unitPrice', Math.max(0, Number(e.target.value) || 0))}
                      className="w-full bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-1.5 text-xs font-mono focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-2 text-right font-bold text-[#111111]">{formatINR(item.total)}</td>
                  <td className="py-2 px-2 text-right">
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center gap-2">
            <select
              value={addVariantId}
              onChange={(e) => setAddVariantId(e.target.value)}
              className="flex-1 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-2 text-xs font-mono focus:outline-none"
            >
              <option value="">Add a product (pick colour / size) to this bill...</option>
              {products
                .filter((p) => p.variants.length > 0)
                .map((p) => (
                  <optgroup key={p.id} label={p.name}>
                    {p.variants.map((v) => (
                      <option key={v.id} value={v.id} disabled={v.stock <= 0}>
                        {[v.color, v.size].filter(Boolean).join(' / ') || 'ONE SIZE'} · {formatINR(v.price)} · {v.stock <= 0 ? 'SOLD OUT' : `${v.stock} in stock`}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
            <Button type="button" variant="secondary" size="sm" onClick={addItem} disabled={!addVariantId}>
              <Plus size={14} className="mr-1" /> ADD
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input label="DISCOUNT (₹)" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            <Input label="DISCOUNT REASON" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
            <Input
              label="CUSTOM TAX % (EMPTY = SLAB)"
              type="number"
              value={customTaxRate}
              onChange={(e) => setCustomTaxRate(e.target.value)}
              placeholder={`${formatRate(slabTaxRate(taxable, settings))} (slab)`}
            />
            <Input label="SHIPPING (₹)" type="number" value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} />
          </div>
          <Input label="NOTES" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="flex items-center justify-between border-t border-[rgba(0,0,0,0.18)] pt-3">
            <div className="text-sm">
              <span className="text-[#4A4844]">
                Subtotal: {formatINR(subtotal)} · GST {formatRate(previewTaxRate)}%{isCustomTax ? ' CUSTOM' : ' SLAB'}:{' '}
                {formatINR(previewTax)} ·{' '}
              </span>
              <span className="font-black text-[#111111]">New Grand Total: {formatINR(grandTotal)}</span>
            </div>
            <Button type="button" variant="primary" size="sm" onClick={handleSave} disabled={isSaving || items.length === 0}>
              <Save size={14} className="mr-1.5" /> {isSaving ? 'SAVING...' : 'SAVE INVOICE CHANGES'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
