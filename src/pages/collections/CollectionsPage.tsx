import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { formatINR } from '../../utils/formatters';
import { Layers, Plus, ArrowRight, Sparkles, Shirt, TrendingUp } from 'lucide-react';

export const CollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { collections, products } = useStore();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  const totalRevenue = collections.reduce((sum, c) => sum + c.revenue, 0);
  const totalUnitsSold = collections.reduce((sum, c) => sum + c.unitsSold, 0);

  const filteredCollections = collections.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[#CFCFD2] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest-editorial text-[#888888]">
            CATALOG ARCHITECTURE
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A0A0A] mt-1">
            DROP COLLECTIONS
          </h1>
          <div className="text-xs font-mono text-[#666666] mt-2">
            Managing {collections.length} Curated Streetwear Drops & Capsule Lines
          </div>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={14} className="mr-2" /> NEW CAPSULE DROP
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricBlock
          label="ACTIVE DROPS"
          value={collections.filter((c) => c.status === 'ACTIVE').length}
          subtext="Capsules currently live"
        />
        <MetricBlock
          label="TOTAL DROP REVENUE"
          value={formatINR(totalRevenue)}
          subtext="Gross sales across drops"
        />
        <MetricBlock
          label="UNITS SOLD"
          value={`${totalUnitsSold} pcs`}
          subtext="Streetwear garments delivered"
        />
        <MetricBlock
          label="CATALOG COVERAGE"
          value={`${products.length} SKUs`}
          subtext="Assigned to collections"
        />
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 border border-[#CFCFD2]">
        <Layers size={16} className="text-[#888888]" />
        <input
          type="text"
          placeholder="Filter collections by drop name, code, or theme..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent font-mono text-xs focus:outline-none placeholder:text-[#888888]"
        />
      </div>

      {/* Collection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCollections.map((col) => {
          const colProducts = products.filter((p) => p.collection === col.name);
          const totalStockInCol = colProducts.reduce((sum, p) => sum + p.totalStock, 0);

          return (
            <div
              key={col.id}
              className="bg-white border border-[#CFCFD2] hover:border-[#0A0A0A] transition-all p-6 flex flex-col justify-between group shadow-subtle"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#0A0A0A] text-white tracking-widest">
                    {col.code}
                  </span>
                  <StatusBadge status={col.status} />
                </div>

                <div>
                  <h3 className="font-display text-2xl font-extrabold tracking-tight text-[#0A0A0A] group-hover:underline">
                    {col.name}
                  </h3>
                  <p className="text-xs text-[#666666] font-sans mt-2 line-clamp-2">
                    {col.description}
                  </p>
                </div>

                {/* Drop Performance Indicators */}
                <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#E5E5E7] font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-[#888888] block">DROP REVENUE</span>
                    <span className="font-bold text-[#0A0A0A]">{formatINR(col.revenue)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#888888] block">UNITS DISPATCHED</span>
                    <span className="font-bold text-[#0A0A0A]">{col.unitsSold} pcs</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#888888] block">STYLES / SKUS</span>
                    <span className="font-semibold text-[#0A0A0A]">{colProducts.length} Styles</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#888888] block">STOCK ON HAND</span>
                    <span className="font-semibold text-[#0A0A0A]">{totalStockInCol} units</span>
                  </div>
                </div>

                {/* Garments Preview Tags */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-[#888888] uppercase tracking-wider block">
                    FEATURED SILHOUETTES
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {colProducts.slice(0, 3).map((p) => (
                      <span
                        key={p.id}
                        className="text-[10px] font-mono px-2 py-0.5 bg-[#F1F1F3] text-[#333333] border border-[#E5E5E7]"
                      >
                        {p.name}
                      </span>
                    ))}
                    {colProducts.length > 3 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 text-[#888888]">
                        +{colProducts.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5 mt-4 border-t border-[#E5E5E7]">
                <Button
                  variant="secondary"
                  className="w-full justify-between font-mono text-xs"
                  onClick={() => navigate(`/products?collection=${encodeURIComponent(col.name)}`)}
                >
                  <span>VIEW {col.name} PRODUCTS</span>
                  <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Capsule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="CREATE NEW CAPSULE DROP"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name || !code) return;
            // In pure frontend, notify and close
            setIsModalOpen(false);
          }}
          className="space-y-4 font-mono text-xs"
        >
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-[#666666] mb-1">
              Collection / Drop Title
            </label>
            <Input
              placeholder="e.g. MONOCHROME II, ARCHIVE VOL. 4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-[#666666] mb-1">
              Drop Code (Short ID)
            </label>
            <Input
              placeholder="e.g. DNY-MN2, ARC-04"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-[#666666] mb-1">
              Capsule Editorial Description
            </label>
            <textarea
              rows={3}
              placeholder="Theme, silhouette inspiration, release season..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#FAFAFA] border border-[#CFCFD2] p-2.5 text-xs font-mono focus:bg-white focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-[#CFCFD2] flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Launch Capsule Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
