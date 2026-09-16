import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { Tabs } from '../../components/ui/Tabs';
import {
  History,
  ArrowLeft,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  ShieldCheck,
} from 'lucide-react';

export const InventoryHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { inventoryLogs } = useStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  const filterTabs = [
    { id: 'ALL', label: 'ALL TRANSACTIONS', count: inventoryLogs.length },
    {
      id: 'SALE',
      label: 'SALES & ORDERS',
      count: inventoryLogs.filter((l) => l.reason === 'SALE').length,
    },
    {
      id: 'RESTOCK',
      label: 'RESTOCKS',
      count: inventoryLogs.filter((l) => l.reason === 'RESTOCK').length,
    },
    {
      id: 'ADJUSTMENT',
      label: 'MANUAL AUDITS',
      count: inventoryLogs.filter((l) => l.reason === 'ADJUSTMENT').length,
    },
    {
      id: 'DAMAGED',
      label: 'DAMAGED / DEFECT',
      count: inventoryLogs.filter((l) => l.reason === 'DAMAGED').length,
    },
  ];

  const filteredLogs = inventoryLogs.filter((log) => {
    const matchesSearch =
      log.variantSku.toLowerCase().includes(search.toLowerCase()) ||
      log.productName.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.reason.toLowerCase().includes(search.toLowerCase());

    const matchesTab = activeTab === 'ALL' || log.reason === activeTab;

    return matchesSearch && matchesTab;
  });

  const totalInbound = inventoryLogs
    .filter((l) => l.changeQty > 0)
    .reduce((sum, l) => sum + l.changeQty, 0);

  const totalOutbound = Math.abs(
    inventoryLogs
      .filter((l) => l.changeQty < 0)
      .reduce((sum, l) => sum + l.changeQty, 0)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[rgba(0,0,0,0.18)] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest-editorial text-[#4A4844]">
            <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')} className="p-0 h-auto">
              <ArrowLeft size={12} className="mr-1" /> INVENTORY
            </Button>
            <span>/</span>
            <span>IMMUTABLE AUDIT TRAIL</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] mt-1">
            STOCK AUDIT LOGS
          </h1>
          <div className="text-xs font-mono text-[#4A4844] mt-2">
            Historical ledger recording every stock decrement, restock batch, and physical warehouse audit
          </div>
        </div>

        <Button variant="secondary" onClick={() => navigate('/inventory')}>
          <Boxes size={14} className="mr-2" /> LIVE INVENTORY LEDGER
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricBlock
          label="AUDIT EVENTS"
          value={inventoryLogs.length}
          subtext="Total logged stock events"
        />
        <MetricBlock
          label="RESTOCKED UNITS"
          value={`+${totalInbound} pcs`}
          subtext="Inbound warehouse receipts"
        />
        <MetricBlock
          label="DISPATCHED UNITS"
          value={`-${totalOutbound} pcs`}
          subtext="Sales & POS deducts"
        />
        <MetricBlock
          label="SYSTEM INTEGRITY"
          value="VERIFIED"
          subtext="No untracked variances"
        />
      </div>

      {/* Filter Tabs */}
      <Tabs tabs={filterTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-[#D5D5D8] p-3 border border-[rgba(0,0,0,0.18)]">
        <Search size={15} className="text-[#4A4844]" />
        <input
          type="text"
          placeholder="Filter audit entries by SKU, product name, or staff operator..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent font-mono text-xs focus:outline-none placeholder:text-[#4A4844]"
        />
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] text-[10px] uppercase text-[#4A4844]">
                <th className="py-3 px-4 font-medium">TIMESTAMP</th>
                <th className="py-3 px-4 font-medium">GARMENT SILHOUETTE</th>
                <th className="py-3 px-4 font-medium">VARIANT SKU</th>
                <th className="py-3 px-4 font-medium">CHANGE QUANTITY</th>
                <th className="py-3 px-4 font-medium">RESULTING STOCK</th>
                <th className="py-3 px-4 font-medium">REASON CODE</th>
                <th className="py-3 px-4 font-medium">AUTHORIZED OPERATOR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#E2E2E4] transition-colors">
                  <td className="py-3 px-4 text-[#4A4844]">{log.date}</td>
                  <td className="py-3 px-4 font-semibold text-[#111111]">{log.productName}</td>
                  <td className="py-3 px-4 font-bold text-[#111111]">{log.variantSku}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 ${
                        log.changeQty > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {log.changeQty > 0 ? (
                        <ArrowUpRight size={13} />
                      ) : (
                        <ArrowDownRight size={13} />
                      )}
                      {log.changeQty > 0 ? `+${log.changeQty}` : log.changeQty} pcs
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#111111]">{log.newStock} units</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-[#D5D5D8] text-[10px] text-[#111111] border border-[rgba(0,0,0,0.18)] font-semibold">
                      {log.reason}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#4A4844] flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-[#4A4844]" />
                    {log.user}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
