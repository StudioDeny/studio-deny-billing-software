import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import { formatINR } from '../../utils/formatters';
import {
  Boxes,
  Search,
  ArrowRight,
  History,
  Plus,
  Minus,
  AlertTriangle,
  Download,
  Filter,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { products, collections } = useStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  // Adjust Modal state
  const [adjustingItem, setAdjustingItem] = useState<{
    productId: string;
    productName: string;
    variantId: string;
    sku: string;
    color: string;
    size: string;
    stock: number;
  } | null>(null);
  const [adjustQty, setAdjustQty] = useState('10');
  const [adjustReason, setAdjustReason] = useState<'RESTOCK' | 'ADJUSTMENT' | 'DAMAGED'>('RESTOCK');

  // Flatten all variants with their parent product
  const allVariants = products.flatMap((p) =>
    p.variants.map((v) => ({
      productId: p.id,
      productName: p.name,
      collection: p.collection,
      category: p.category,
      image: p.image,
      variantId: v.id,
      sku: v.sku,
      color: v.color,
      size: v.size,
      price: v.price,
      stock: v.stock,
    }))
  );

  const totalStockUnits = allVariants.reduce((sum, v) => sum + v.stock, 0);
  const totalValuation = allVariants.reduce((sum, v) => sum + v.stock * v.price, 0);
  const lowStockVariants = allVariants.filter((v) => v.stock > 0 && v.stock < 10);
  const outOfStockVariants = allVariants.filter((v) => v.stock === 0);

  const filterTabs = [
    { id: 'ALL', label: 'ALL SKUS', count: allVariants.length },
    { id: 'LOW_STOCK', label: 'LOW STOCK (< 10)', count: lowStockVariants.length },
    { id: 'OUT_OF_STOCK', label: 'OUT OF STOCK', count: outOfStockVariants.length },
    ...collections.map((c) => ({
      id: c.name,
      label: c.name,
      count: allVariants.filter((v) => v.collection === c.name).length,
    })),
  ];

  const filteredVariants = allVariants.filter((v) => {
    const matchesSearch =
      v.sku.toLowerCase().includes(search.toLowerCase()) ||
      v.productName.toLowerCase().includes(search.toLowerCase()) ||
      v.color.toLowerCase().includes(search.toLowerCase()) ||
      v.size.toLowerCase().includes(search.toLowerCase());

    let matchesTab = true;
    if (activeTab === 'LOW_STOCK') {
      matchesTab = v.stock > 0 && v.stock < 10;
    } else if (activeTab === 'OUT_OF_STOCK') {
      matchesTab = v.stock === 0;
    } else if (activeTab !== 'ALL') {
      matchesTab = v.collection === activeTab;
    }

    return matchesSearch && matchesTab;
  });

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;

    const qty = Number(adjustQty) || 0;
    if (qty === 0) return;

    const finalQty = adjustReason === 'DAMAGED' ? -Math.abs(qty) : qty;
    store.adjustStock(adjustingItem.productId, adjustingItem.variantId, finalQty, adjustReason);
    setAdjustingItem(null);
    setAdjustQty('10');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[#CFCFD2] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest-editorial text-[#888888]">
            WAREHOUSE & SUPPLY CHAIN
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A0A0A] mt-1">
            INVENTORY LEDGER
          </h1>
          <div className="text-xs font-mono text-[#666666] mt-2">
            Real-time variant tracking across {allVariants.length} distinct streetwear garment SKUs
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate('/inventory/history')}
          >
            <History size={14} className="mr-2" /> AUDIT LOG
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate('/products')}
          >
            <Plus size={14} className="mr-2" /> ADD PRODUCT SKU
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricBlock
          label="WAREHOUSE ON HAND"
          value={`${totalStockUnits} pcs`}
          subtext="Total units ready for dispatch"
        />
        <MetricBlock
          label="INVENTORY VALUATION"
          value={formatINR(totalValuation)}
          subtext="Aggregate retail stock value"
        />
        <MetricBlock
          label="LOW STOCK ALERTS"
          value={lowStockVariants.length}
          subtext="Under 10 units threshold"
        />
        <MetricBlock
          label="SOLD OUT SKUS"
          value={outOfStockVariants.length}
          subtext="Immediate restock required"
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={filterTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-[#CFCFD2]">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <Search size={15} className="text-[#888888]" />
          <input
            type="text"
            placeholder="Search SKU, garment silhouette, size..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent font-mono text-xs focus:outline-none placeholder:text-[#888888]"
          />
        </div>

        <div className="text-xs font-mono text-[#888888] flex items-center gap-2">
          <span>Showing {filteredVariants.length} of {allVariants.length} SKUs</span>
        </div>
      </div>

      {/* Inventory Matrix Table */}
      <div className="bg-white border border-[#CFCFD2] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[#CFCFD2] bg-[#F1F1F3] text-[10px] uppercase text-[#666666]">
                <th className="py-3 px-4 font-medium">GARMENT SILHOUETTE</th>
                <th className="py-3 px-4 font-medium">VARIANT SKU</th>
                <th className="py-3 px-4 font-medium">COLOR</th>
                <th className="py-3 px-4 font-medium">SIZE</th>
                <th className="py-3 px-4 font-medium">PRICE</th>
                <th className="py-3 px-4 font-medium text-center">ON HAND</th>
                <th className="py-3 px-4 font-medium">STATUS</th>
                <th className="py-3 px-4 font-medium text-right">STOCK ADJUSTMENT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E7]">
              {filteredVariants.map((item) => (
                <tr key={item.sku} className="hover:bg-[#FAFAFA] transition-colors">
                  {/* Garment Title & Image */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-9 h-9 object-cover border border-[#CFCFD2] bg-neutral-100 shrink-0"
                      />
                      <div>
                        <Link
                          to={`/products/${item.productId}`}
                          className="font-semibold text-[#0A0A0A] hover:underline"
                        >
                          {item.productName}
                        </Link>
                        <span className="text-[10px] text-[#888888] block">
                          {item.collection} · {item.category}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="py-3 px-4 font-bold text-[#0A0A0A]">{item.sku}</td>

                  {/* Color */}
                  <td className="py-3 px-4 text-[#444444]">{item.color}</td>

                  {/* Size */}
                  <td className="py-3 px-4">
                    <span className="inline-block w-7 h-7 leading-7 text-center bg-[#0A0A0A] text-white text-[11px] font-bold">
                      {item.size}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="py-3 px-4 font-medium text-[#0A0A0A]">{formatINR(item.price)}</td>

                  {/* Current Stock */}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`font-bold px-2 py-0.5 text-xs ${
                        item.stock === 0
                          ? 'bg-red-100 text-red-700'
                          : item.stock < 10
                          ? 'bg-amber-100 text-amber-800'
                          : 'text-[#0A0A0A]'
                      }`}
                    >
                      {item.stock} pcs
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4">
                    <StatusBadge
                      status={
                        item.stock === 0
                          ? 'OUT OF STOCK'
                          : item.stock < 10
                          ? 'LOW STOCK'
                          : 'IN STOCK'
                      }
                    />
                  </td>

                  {/* Stock Quick Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        title="Decrement 1 unit"
                        disabled={item.stock <= 0}
                        onClick={() => store.adjustStock(item.productId, item.variantId, -1, 'ADJUSTMENT')}
                        className="w-7 h-7 border border-[#CFCFD2] hover:bg-[#F1F1F3] disabled:opacity-30 flex items-center justify-center text-[#0A0A0A] transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <button
                        title="Increment 1 unit"
                        onClick={() => store.adjustStock(item.productId, item.variantId, 1, 'RESTOCK')}
                        className="w-7 h-7 border border-[#CFCFD2] hover:bg-[#F1F1F3] flex items-center justify-center text-[#0A0A0A] transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setAdjustingItem(item);
                          setAdjustQty('10');
                        }}
                      >
                        ADJUST
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustment Modal */}
      {adjustingItem && (
        <Modal
          isOpen={!!adjustingItem}
          onClose={() => setAdjustingItem(null)}
          title={`ADJUST STOCK — ${adjustingItem.sku}`}
        >
          <form onSubmit={handleAdjustStock} className="space-y-4 font-mono text-xs">
            <div className="p-3 bg-[#F1F1F3] border border-[#CFCFD2] space-y-1">
              <div className="flex justify-between">
                <span className="text-[#666666]">PRODUCT:</span>
                <span className="font-bold text-[#0A0A0A]">{adjustingItem.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666666]">VARIANT:</span>
                <span className="font-bold text-[#0A0A0A]">
                  {adjustingItem.color} / SIZE {adjustingItem.size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666666]">CURRENT ON HAND:</span>
                <span className="font-bold text-[#0A0A0A]">{adjustingItem.stock} units</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-[#666666] mb-1">
                Reason for Adjustment
              </label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value as any)}
                className="w-full bg-[#FAFAFA] border border-[#CFCFD2] p-2.5 text-xs font-mono focus:bg-white focus:outline-none"
              >
                <option value="RESTOCK">RESTOCK (Warehouse inbound shipment)</option>
                <option value="ADJUSTMENT">MANUAL INVENTORY AUDIT / RECONCILIATION</option>
                <option value="DAMAGED">DAMAGED / DEFECTIVE SILHOUETTE REMOVAL</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-[#666666] mb-1">
                Quantity Units {adjustReason === 'DAMAGED' ? '(to deduct)' : '(to add)'}
              </label>
              <Input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                min="1"
                required
              />
            </div>

            <div className="pt-3 border-t border-[#CFCFD2] flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setAdjustingItem(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Execute Stock Update
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
