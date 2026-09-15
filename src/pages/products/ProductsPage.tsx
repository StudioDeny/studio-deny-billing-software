import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Tabs } from '../../components/ui/Tabs';
import { formatINR } from '../../utils/formatters';
import { Plus, Search, ArrowRight, Shirt, Layers, Tag } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { products, collections } = useStore();
  const [search, setSearch] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [collection, setCollection] = useState(collections[0]?.name || 'CORE');
  const [category, setCategory] = useState('T-Shirts');
  const [price, setPrice] = useState('2490');
  const [stock, setStock] = useState('30');
  const [description, setDescription] = useState('');

  const totalUnits = products.reduce((sum, p) => sum + p.totalStock, 0);
  const totalCatalogValue = products.reduce((sum, p) => sum + p.price * p.totalStock, 0);
  const lowStockCount = products.filter((p) => p.totalStock < 20).length;

  const filterTabs = [
    { id: 'ALL', label: 'ALL COLLECTIONS', count: products.length },
    ...collections.map((c) => ({
      id: c.name,
      label: c.name,
      count: products.filter((p) => p.collection === c.name).length,
    })),
  ];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesColl = collectionFilter === 'ALL' || p.collection === collectionFilter;
    return matchesSearch && matchesColl;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku) return;

    const numPrice = Number(price) || 2490;
    const numStock = Number(stock) || 20;

    const newProd = await store.addProduct({
      name,
      sku: sku.toUpperCase(),
      collection,
      category,
      price: numPrice,
      compareAtPrice: Math.round(numPrice * 1.2),
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Black'],
      status: 'ACTIVE',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      description: description || `Studio Deny ${collection} release.`,
      tags: [collection, category],
      variants: [
        { id: `var-${Date.now()}-s`, sku: `${sku.toUpperCase()}-S`, color: 'Black', size: 'S', price: numPrice, stock: Math.round(numStock * 0.2) },
        { id: `var-${Date.now()}-m`, sku: `${sku.toUpperCase()}-M`, color: 'Black', size: 'M', price: numPrice, stock: Math.round(numStock * 0.4) },
        { id: `var-${Date.now()}-l`, sku: `${sku.toUpperCase()}-L`, color: 'Black', size: 'L', price: numPrice, stock: Math.round(numStock * 0.3) },
        { id: `var-${Date.now()}-xl`, sku: `${sku.toUpperCase()}-XL`, color: 'Black', size: 'XL', price: numPrice, stock: Math.round(numStock * 0.1) },
      ],
    });

    setIsModalOpen(false);
    navigate(`/products/${newProd.id}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[#CFCFD2] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest-editorial text-[#888888]">
            STREETWEAR CATALOG
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A0A0A] mt-1">
            PRODUCTS & VARIANTS
          </h1>
          <div className="text-xs font-mono text-[#666666] mt-2">
            Managing {products.length} Active Master Streetwear SKUs
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            icon={<Tag size={14} />}
            onClick={() => navigate('/tags')}
          >
            PRICE TAG GENERATOR
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<Plus size={14} />}
            onClick={() => setIsModalOpen(true)}
          >
            [ NEW PRODUCT RELEASE ]
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricBlock
          label="TOTAL CATALOG UNITS"
          value={`${totalUnits} PCS`}
          subValue="Across all sizes and colorways"
        />
        <MetricBlock
          label="WAREHOUSE INVENTORY VALUE"
          value={formatINR(totalCatalogValue)}
          subValue="Retail inventory evaluation"
        />
        <MetricBlock
          label="LOW STOCK SKUS"
          value={String(lowStockCount)}
          trend={lowStockCount > 0 ? { value: 'RESTOCK REQUIRED', isPositive: false } : undefined}
          subValue="Under 20 pieces remaining"
        />
      </div>

      {/* Collection Tabs */}
      <Tabs tabs={filterTabs} activeTab={collectionFilter} onChange={setCollectionFilter} />

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 p-3 bg-[#F1F1F3] border border-[#CFCFD2]">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, SKU (DNY-TEE-001), or category..."
            className="w-full bg-white text-xs font-mono pl-9 pr-3 py-2 border border-[#CFCFD2] focus:border-[#0A0A0A] focus:outline-none"
          />
        </div>

        <div className="text-xs font-mono text-[#666666]">
          SHOWING {filteredProducts.length} OF {products.length}
        </div>
      </div>

      {/* Streetwear Products Grid & Table */}
      <div className="border border-[#CFCFD2] bg-white overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-[#0A0A0A] bg-[#F1F1F3] text-[10px] font-mono uppercase tracking-widest-editorial text-[#0A0A0A]">
              <th className="py-3 px-4 font-bold">PRODUCT & SKU</th>
              <th className="py-3 px-4 font-bold">COLLECTION</th>
              <th className="py-3 px-4 font-bold">CATEGORY</th>
              <th className="py-3 px-4 font-bold">SIZES</th>
              <th className="py-3 px-4 text-right font-bold">RETAIL PRICE</th>
              <th className="py-3 px-4 text-right font-bold">TOTAL STOCK</th>
              <th className="py-3 px-4 font-bold">STATUS</th>
              <th className="py-3 px-4 text-right font-bold">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E7E9] text-xs">
            {filteredProducts.map((prod) => (
              <tr
                key={prod.id}
                onClick={() => navigate(`/products/${prod.id}`)}
                className="hover:bg-[#F1F1F3] transition-colors cursor-pointer group"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-11 h-11 object-cover border border-[#CFCFD2] shrink-0"
                    />
                    <div>
                      <div className="font-display font-bold text-sm text-[#0A0A0A]">
                        {prod.name}
                      </div>
                      <div className="text-xs font-mono text-[#888888] mt-0.5">
                        {prod.sku} • {prod.variants.length} Variants
                      </div>
                    </div>
                  </div>
                </td>

                <td className="py-4 px-4 font-mono font-medium text-[#111111]">
                  <span className="px-2 py-0.5 bg-[#F1F1F3] border border-[#CFCFD2] text-[10px] uppercase font-bold">
                    {prod.collection}
                  </span>
                </td>

                <td className="py-4 px-4 font-mono text-[#666666]">
                  {prod.category}
                </td>

                <td className="py-4 px-4 font-mono text-[11px] text-[#111111]">
                  {prod.sizes.join(' ')}
                </td>

                <td className="py-4 px-4 text-right font-mono font-bold text-[#0A0A0A] text-sm">
                  {formatINR(prod.price)}
                </td>

                <td className="py-4 px-4 text-right font-mono">
                  {prod.totalStock < 20 ? (
                    <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 border border-rose-200">
                      {prod.totalStock} UNITS
                    </span>
                  ) : (
                    <span className="font-bold text-[#0A0A0A]">
                      {prod.totalStock} UNITS
                    </span>
                  )}
                </td>

                <td className="py-4 px-4">
                  <StatusBadge status={prod.totalStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'} />
                </td>

                <td className="py-4 px-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate('/billing/new')}
                    className="px-2.5 py-1 bg-[#0A0A0A] text-white text-xs font-mono font-semibold hover:bg-neutral-800"
                  >
                    + BILL
                  </button>
                  <button
                    onClick={() => navigate(`/products/${prod.id}`)}
                    className="px-2.5 py-1 border border-[#CFCFD2] hover:border-[#0A0A0A] text-xs font-mono"
                  >
                    DETAILS
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE PRODUCT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="CREATE STREETWEAR PRODUCT"
        subtitle="ESTABLISH NEW MASTER SKU WITH VARIANTS"
        maxWidth="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="PRODUCT NAME"
              required
              placeholder="e.g. ARCHIVE NYLON WINDBREAKER"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="MASTER SKU"
              required
              placeholder="e.g. DNY-JKT-008"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="COLLECTION"
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              options={collections.map((c) => ({ value: c.name, label: c.name }))}
            />
            <Select
              label="CATEGORY"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: 'T-Shirts', label: 'T-Shirts' },
                { value: 'Hoodies', label: 'Hoodies' },
                { value: 'Pants', label: 'Pants & Cargos' },
                { value: 'Jackets', label: 'Jackets & Outerwear' },
                { value: 'Headwear', label: 'Headwear' },
                { value: 'Jewelry', label: 'Jewelry' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="RETAIL PRICE (INR ₹)"
              type="number"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Input
              label="INITIAL BATCH TOTAL PIECES"
              type="number"
              required
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>

          <Input
            label="EDITORIAL PRODUCT DESCRIPTION"
            placeholder="Fabric specifications (e.g. 500 GSM French Terry), hardware details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="pt-3 flex justify-end gap-3 border-t border-[#CFCFD2]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              [ SAVE PRODUCT ]
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
