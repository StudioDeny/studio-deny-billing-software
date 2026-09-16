import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { formatINR, formatDate } from '../../utils/formatters';
import {
  ArrowLeft,
  Shirt,
  Layers,
  Tag,
  Boxes,
  Plus,
  Minus,
  Edit3,
  Check,
  History,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, inventoryLogs } = useStore();

  const product = products.find((p) => p.id === id || p.sku.toLowerCase() === id?.toLowerCase());

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(String(product?.price || ''));
  const [description, setDescription] = useState(product?.description || '');

  // Stock Adjustment Modal
  const [adjustingVariantId, setAdjustingVariantId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState('10');
  const [adjustReason, setAdjustReason] = useState<'RESTOCK' | 'ADJUSTMENT' | 'DAMAGED'>('RESTOCK');

  if (!product) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-neutral-100 border border-[rgba(0,0,0,0.18)] flex items-center justify-center mx-auto text-[#4A4844]">
          <Shirt size={22} />
        </div>
        <h2 className="font-display text-2xl font-bold text-[#111111]">Product Not Found</h2>
        <p className="text-xs font-mono text-[#4A4844]">The streetwear SKU or identifier does not exist in Deny OS.</p>
        <Button variant="secondary" onClick={() => navigate('/products')}>
          <ArrowLeft size={14} className="mr-2" /> Back to Catalog
        </Button>
      </div>
    );
  }

  const activeVariant = product.variants.find((v) => v.id === adjustingVariantId);
  const productLogs = inventoryLogs.filter((l) => l.productId === product.id);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    await store.updateProduct(product.id, {
      name,
      price: Number(price) || product.price,
      description,
    });
    setIsEditing(false);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingVariantId) return;

    const qty = Number(adjustQty) || 0;
    if (qty === 0) return;

    const finalQty = adjustReason === 'DAMAGED' ? -Math.abs(qty) : qty;
    await store.adjustStock(product.id, adjustingVariantId, finalQty, adjustReason);
    setAdjustingVariantId(null);
    setAdjustQty('10');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Action Bar */}
      <div className="border-b border-[rgba(0,0,0,0.18)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
            <ArrowLeft size={14} className="mr-1.5" /> PRODUCTS
          </Button>
          <span className="text-[rgba(0,0,0,0.18)]">/</span>
          <span className="font-mono text-xs font-semibold text-[#111111] uppercase tracking-wider">
            {product.sku}
          </span>
          <StatusBadge status={product.status} />
          {product.totalStock < 20 && <StatusBadge status="LOW STOCK" />}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={isEditing ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <>
                <Check size={14} className="mr-1.5" /> CANCEL EDITING
              </>
            ) : (
              <>
                <Edit3 size={14} className="mr-1.5" /> EDIT DETAILS
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/tags?productId=${product.id}`)}
          >
            <Tag size={14} className="mr-1.5" /> PRICE TAGS
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/billing/new')}
          >
            <ExternalLink size={14} className="mr-1.5" /> BILL AT POS
          </Button>
        </div>
      </div>

      {/* Main Grid: Hero Info + Photography */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Product Imagery & Badges */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] aspect-4/5 overflow-hidden relative group">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-3 left-3 bg-[#111111] text-[#E2E2E4] text-[10px] font-mono px-2 py-1 uppercase tracking-widest">
              COLLECTION: {product.collection}
            </div>
            <div className="absolute bottom-3 right-3 bg-[#D5D5D8]/90 backdrop-blur-xs text-[#111111] text-[11px] font-mono px-2.5 py-1 border border-[rgba(0,0,0,0.18)]">
              TOTAL STOCK: {product.totalStock} UNITS
            </div>
          </div>

          {/* Quick Stats Block */}
          <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-4 space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-widest-editorial text-[#4A4844]">
              SPECIFICATIONS
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-[#4A4844] block text-[10px]">CATEGORY</span>
                <span className="font-semibold text-[#111111]">{product.category}</span>
              </div>
              <div>
                <span className="text-[#4A4844] block text-[10px]">COLLECTION</span>
                <span className="font-semibold text-[#111111]">{product.collection}</span>
              </div>
              <div>
                <span className="text-[#4A4844] block text-[10px]">SIZES ACTIVE</span>
                <span className="font-semibold text-[#111111]">{product.sizes.join(' · ')}</span>
              </div>
              <div>
                <span className="text-[#4A4844] block text-[10px]">COLORWAYS</span>
                <span className="font-semibold text-[#111111]">{product.colors.join(' · ')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Master Details & Metrics */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Block */}
          <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-6">
            {isEditing ? (
              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
                      Product Name
                    </label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
                      Master Price (INR)
                    </label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
                    Editorial Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#E2E2E4] border border-[rgba(0,0,0,0.18)] p-2.5 text-xs font-mono focus:bg-[#D5D5D8] focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-widest-editorial text-[#4A4844]">
                      {product.sku}
                    </div>
                    <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] mt-1">
                      {product.name}
                    </h1>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-2xl font-bold text-[#111111]">
                      {formatINR(product.price)}
                    </div>
                    {product.compareAtPrice && (
                      <div className="font-mono text-xs text-[#4A4844] line-through">
                        MRP {formatINR(product.compareAtPrice)}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#111111] font-sans mt-4 leading-relaxed max-w-2xl">
                  {product.description}
                </p>

                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[rgba(0,0,0,0.1)]">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono uppercase px-2.5 py-1 bg-[#D5D5D8] text-[#111111] border border-[rgba(0,0,0,0.18)]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Metric Blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricBlock
              label="TOTAL STOCK"
              value={product.totalStock}
              subtext="Units in Studio warehouse"
            />
            <MetricBlock
              label="ACTIVE VARIANTS"
              value={product.variants.length}
              subtext="Sizes & color combinations"
            />
            <MetricBlock
              label="INVENTORY VALUE"
              value={formatINR(product.price * product.totalStock)}
              subtext="Valuation at retail price"
            />
            <MetricBlock
              label="STOCK STATUS"
              value={product.totalStock === 0 ? 'SOLD OUT' : product.totalStock < 20 ? 'LOW STOCK' : 'HEALTHY'}
              subtext="Reorder threshold 20"
            />
          </div>

          {/* Multi-Variant Matrix Table */}
          <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] overflow-hidden">
            <div className="p-4 border-b border-[rgba(0,0,0,0.18)] flex items-center justify-between bg-[#E2E2E4]">
              <div>
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#111111]">
                  VARIANT INVENTORY MATRIX
                </h3>
                <p className="text-[11px] font-mono text-[#4A4844] mt-0.5">
                  Independent stock tracking per color and size
                </p>
              </div>
              <div className="text-xs font-mono text-[#4A4844]">
                {product.variants.length} SKUs Listed
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] text-[10px] uppercase text-[#4A4844]">
                    <th className="py-2.5 px-4 font-medium">VARIANT SKU</th>
                    <th className="py-2.5 px-4 font-medium">COLOR</th>
                    <th className="py-2.5 px-4 font-medium">SIZE</th>
                    <th className="py-2.5 px-4 font-medium">PRICE</th>
                    <th className="py-2.5 px-4 font-medium text-center">ON HAND</th>
                    <th className="py-2.5 px-4 font-medium">STATUS</th>
                    <th className="py-2.5 px-4 font-medium text-right">QUICK ADJUST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
                  {product.variants.map((v) => (
                    <tr key={v.id} className="hover:bg-[#E2E2E4] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#111111]">{v.sku}</td>
                      <td className="py-3 px-4 text-[#111111]">{v.color}</td>
                      <td className="py-3 px-4 font-bold text-[#111111]">
                        <span className="inline-block w-7 h-7 leading-7 text-center bg-[#111111] text-[#E2E2E4] text-[11px]">
                          {v.size}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#111111]">{formatINR(v.price)}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-bold px-2 py-0.5 text-xs ${
                            v.stock === 0
                              ? 'bg-red-100 text-red-700'
                              : v.stock < 5
                              ? 'bg-amber-100 text-amber-800'
                              : 'text-[#111111]'
                          }`}
                        >
                          {v.stock} pcs
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          status={v.stock === 0 ? 'OUT OF STOCK' : v.stock < 5 ? 'LOW STOCK' : 'IN STOCK'}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Decrement 1 unit"
                            disabled={v.stock <= 0}
                            onClick={() => { void store.adjustStock(product.id, v.id, -1, 'ADJUSTMENT'); }}
                            className="w-7 h-7 border border-[rgba(0,0,0,0.18)] hover:bg-[#D5D5D8] disabled:opacity-30 flex items-center justify-center text-[#111111] transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <button
                            title="Increment 1 unit"
                            onClick={() => { void store.adjustStock(product.id, v.id, 1, 'RESTOCK'); }}
                            className="w-7 h-7 border border-[rgba(0,0,0,0.18)] hover:bg-[#D5D5D8] flex items-center justify-center text-[#111111] transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setAdjustingVariantId(v.id);
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

          {/* Audit Trail for this product */}
          <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.1)] pb-3">
              <div className="flex items-center gap-2">
                <History size={15} className="text-[#4A4844]" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#111111]">
                  STOCK LOG AUDIT TRAIL
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#4A4844]">
                {productLogs.length} recent transactions
              </span>
            </div>

            {productLogs.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-[#4A4844]">
                No inventory changes logged yet for this item.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-[rgba(0,0,0,0.1)] text-[#4A4844] pb-1">
                      <th className="py-1.5 px-2">TIMESTAMP</th>
                      <th className="py-1.5 px-2">SKU</th>
                      <th className="py-1.5 px-2">CHANGE</th>
                      <th className="py-1.5 px-2">RESULTING STOCK</th>
                      <th className="py-1.5 px-2">REASON</th>
                      <th className="py-1.5 px-2">OPERATOR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5D5D8]">
                    {productLogs.slice(0, 5).map((log) => (
                      <tr key={log.id}>
                        <td className="py-2 px-2 text-[#4A4844]">{log.date}</td>
                        <td className="py-2 px-2 font-semibold text-[#111111]">{log.variantSku}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`font-bold ${
                              log.changeQty > 0 ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            {log.changeQty > 0 ? `+${log.changeQty}` : log.changeQty}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-bold text-[#111111]">{log.newStock} pcs</td>
                        <td className="py-2 px-2">
                          <span className="px-1.5 py-0.5 bg-[#D5D5D8] text-[10px] text-[#111111] border border-[rgba(0,0,0,0.18)]">
                            {log.reason}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-[#4A4844]">{log.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Variant Stock Adjustment Modal */}
      {activeVariant && (
        <Modal
          isOpen={!!adjustingVariantId}
          onClose={() => setAdjustingVariantId(null)}
          title={`ADJUST STOCK — ${activeVariant.sku}`}
        >
          <form onSubmit={handleAdjustSubmit} className="space-y-4 font-mono text-xs">
            <div className="p-3 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] space-y-1">
              <div className="flex justify-between">
                <span className="text-[#4A4844]">PRODUCT:</span>
                <span className="font-bold text-[#111111]">{product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A4844]">VARIANT:</span>
                <span className="font-bold text-[#111111]">
                  {activeVariant.color} / SIZE {activeVariant.size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A4844]">CURRENT STOCK:</span>
                <span className="font-bold text-[#111111]">{activeVariant.stock} units</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
                Reason for Change
              </label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value as any)}
                className="w-full bg-[#E2E2E4] border border-[rgba(0,0,0,0.18)] p-2.5 text-xs font-mono focus:bg-[#D5D5D8] focus:outline-none"
              >
                <option value="RESTOCK">RESTOCK (Factory batch arrived)</option>
                <option value="ADJUSTMENT">MANUAL AUDIT / CORRECTION</option>
                <option value="DAMAGED">DEFECT / DAMAGED IN WAREHOUSE</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
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

            <div className="pt-3 border-t border-[rgba(0,0,0,0.18)] flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setAdjustingVariantId(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Confirm Adjustment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
