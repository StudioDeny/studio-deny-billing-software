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
import { WEBSITE_ADMIN_NEW_PRODUCT_URL } from '../../constants/website';
import { Plus, Search, ArrowRight, Shirt, Layers, Tag } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { products, collections } = useStore();
  const [search, setSearch] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('ALL');
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[rgba(0,0,0,0.18)] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest-editorial text-[#4A4844]">
            STREETWEAR CATALOG
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] mt-1">
            PRODUCTS & VARIANTS
          </h1>
          <div className="text-xs font-mono text-[#4A4844] mt-2">
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
            onClick={() => window.open(WEBSITE_ADMIN_NEW_PRODUCT_URL, '_blank', 'noopener')}
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
      <div className="flex items-center justify-between gap-4 p-3 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)]">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4844]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, SKU (DNY-TEE-001), or category..."
            className="w-full bg-[#D5D5D8] text-xs font-mono pl-9 pr-3 py-2 border border-[rgba(0,0,0,0.18)] focus:border-[#111111] focus:outline-none"
          />
        </div>

        <div className="text-xs font-mono text-[#4A4844]">
          SHOWING {filteredProducts.length} OF {products.length}
        </div>
      </div>

      {/* Streetwear Products Grid & Table */}
      <div className="border border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-[#111111] bg-[#D5D5D8] text-[10px] font-mono uppercase tracking-widest-editorial text-[#111111]">
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
          <tbody className="divide-y divide-[#D5D5D8] text-xs">
            {filteredProducts.map((prod) => (
              <tr
                key={prod.id}
                onClick={() => navigate(`/products/${prod.id}`)}
                className="hover:bg-[#D5D5D8] transition-colors cursor-pointer group"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-11 h-11 object-cover border border-[rgba(0,0,0,0.18)] shrink-0"
                    />
                    <div>
                      <div className="font-display font-bold text-sm text-[#111111]">
                        {prod.name}
                      </div>
                      <div className="text-xs font-mono text-[#4A4844] mt-0.5">
                        {prod.sku} • {prod.variants.length} Variants
                      </div>
                    </div>
                  </div>
                </td>

                <td className="py-4 px-4 font-mono font-medium text-[#111111]">
                  <span className="px-2 py-0.5 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] text-[10px] uppercase font-bold">
                    {prod.collection}
                  </span>
                </td>

                <td className="py-4 px-4 font-mono text-[#4A4844]">
                  {prod.category}
                </td>

                <td className="py-4 px-4 font-mono text-[11px] text-[#111111]">
                  {prod.sizes.join(' ')}
                </td>

                <td className="py-4 px-4 text-right font-mono font-bold text-[#111111] text-sm">
                  {formatINR(prod.price)}
                </td>

                <td className="py-4 px-4 text-right font-mono">
                  {prod.totalStock < 20 ? (
                    <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 border border-rose-200">
                      {prod.totalStock} UNITS
                    </span>
                  ) : (
                    <span className="font-bold text-[#111111]">
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
                    className="px-2.5 py-1 bg-[#111111] text-[#E2E2E4] text-xs font-mono font-semibold hover:bg-neutral-800"
                  >
                    + BILL
                  </button>
                  <button
                    onClick={() => navigate(`/products/${prod.id}`)}
                    className="px-2.5 py-1 border border-[rgba(0,0,0,0.18)] hover:border-[#111111] text-xs font-mono"
                  >
                    DETAILS
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};
