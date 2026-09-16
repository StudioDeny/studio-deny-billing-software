import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { Tabs } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { formatINR } from '../../utils/formatters';
import {
  RotateCcw,
  Search,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Boxes,
  CreditCard,
  Eye,
} from 'lucide-react';
import { ReturnStatus } from '../../types';

export const ReturnsPage: React.FC = () => {
  const navigate = useNavigate();
  const { returns, orders } = useStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  // Inspection / Resolution Modal
  const [activeReturn, setActiveReturn] = useState<any | null>(null);

  const pendingReturns = returns.filter((r) => ['REQUESTED', 'APPROVED', 'IN_TRANSIT'].includes(r.status));
  const inspectedReturns = returns.filter((r) => r.status === 'INSPECTED');
  const refundedReturns = returns.filter((r) => r.status === 'REFUNDED');
  const totalRefunded = refundedReturns.reduce((sum, r) => sum + r.refundAmount, 0);

  const filterTabs = [
    { id: 'ALL', label: 'ALL RETURNS', count: returns.length },
    { id: 'PENDING', label: 'ACTION REQUIRED', count: pendingReturns.length },
    { id: 'INSPECTED', label: 'INSPECTED', count: inspectedReturns.length },
    { id: 'REFUNDED', label: 'REFUNDED', count: refundedReturns.length },
  ];

  const filteredReturns = returns.filter((r) => {
    const matchesSearch =
      r.returnNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.productTitle.toLowerCase().includes(search.toLowerCase());

    let matchesTab = true;
    if (activeTab === 'PENDING') {
      matchesTab = ['REQUESTED', 'APPROVED', 'IN_TRANSIT'].includes(r.status);
    } else if (activeTab !== 'ALL') {
      matchesTab = r.status === activeTab;
    }

    return matchesSearch && matchesTab;
  });

  const handleUpdateStatus = async (returnId: string, status: ReturnStatus) => {
    await store.updateReturnStatus(returnId, status);
    if (activeReturn && activeReturn.id === returnId) {
      setActiveReturn({ ...activeReturn, status });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[rgba(0,0,0,0.18)] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest-editorial text-[#4A4844]">
            REVERSE LOGISTICS & QUALITY CONTROL
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] mt-1">
            RETURNS & EXCHANGES
          </h1>
          <div className="text-xs font-mono text-[#4A4844] mt-2">
            Managing Streetwear Garment Exchanges, Size Adjustments, and Inspection Restocking
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricBlock
          label="PENDING INSPECTION"
          value={pendingReturns.length}
          subtext="Awaiting QA inspection"
        />
        <MetricBlock
          label="TOTAL REFUNDS ISSUED"
          value={formatINR(totalRefunded)}
          subtext="Processed back to patrons"
        />
        <MetricBlock
          label="EXCHANGE RATE"
          value="42%"
          subtext="Size exchanges vs refunds"
        />
        <MetricBlock
          label="INSPECTION PASS RATE"
          value="94%"
          subtext="Unworn with tags intact"
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={filterTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-[#D5D5D8] p-3 border border-[rgba(0,0,0,0.18)]">
        <Search size={15} className="text-[#4A4844]" />
        <input
          type="text"
          placeholder="Filter by return RMA, order number, patron name, or silhouette..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent font-mono text-xs focus:outline-none placeholder:text-[#4A4844]"
        />
      </div>

      {/* Returns Table */}
      <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] text-[10px] uppercase text-[#4A4844]">
                <th className="py-3 px-4 font-medium">RETURN RMA</th>
                <th className="py-3 px-4 font-medium">ORIGINAL ORDER</th>
                <th className="py-3 px-4 font-medium">PATRON</th>
                <th className="py-3 px-4 font-medium">GARMENT SILHOUETTE</th>
                <th className="py-3 px-4 font-medium">RETURN REASON</th>
                <th className="py-3 px-4 font-medium">REFUND VALUE</th>
                <th className="py-3 px-4 font-medium">STATUS</th>
                <th className="py-3 px-4 font-medium text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
              {filteredReturns.map((ret) => (
                <tr key={ret.id} className="hover:bg-[#E2E2E4] transition-colors">
                  <td className="py-3 px-4 font-bold text-[#111111]">{ret.returnNumber}</td>
                  <td className="py-3 px-4 font-semibold text-[#4A4844]">{ret.orderNumber}</td>
                  <td className="py-3 px-4 text-[#111111]">{ret.customerName}</td>
                  <td className="py-3 px-4 text-[#111111]">
                    <div>{ret.productTitle}</div>
                    <span className="text-[10px] text-[#4A4844]">{ret.variantName}</span>
                  </td>
                  <td className="py-3 px-4 text-[#4A4844]">{ret.reason}</td>
                  <td className="py-3 px-4 font-bold text-[#111111]">
                    {formatINR(ret.refundAmount)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={ret.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveReturn(ret)}
                    >
                      <Eye size={12} className="mr-1.5" /> INSPECT
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Inspection Modal */}
      {activeReturn && (
        <Modal
          isOpen={!!activeReturn}
          onClose={() => setActiveReturn(null)}
          title={`INSPECTION & RESOLUTION — ${activeReturn.returnNumber}`}
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#4A4844]">PATRON:</span>
                <span className="font-bold text-[#111111]">{activeReturn.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A4844]">ORIGINAL ORDER:</span>
                <span className="font-bold text-[#111111]">{activeReturn.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A4844]">GARMENT:</span>
                <span className="font-bold text-[#111111]">
                  {activeReturn.productTitle} ({activeReturn.variantName})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A4844]">REPORTED REASON:</span>
                <span className="text-[#111111]">{activeReturn.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A4844]">INSPECTION CONDITION:</span>
                <span className="font-bold text-emerald-800">{activeReturn.condition}</span>
              </div>
              <div className="flex justify-between border-t border-[rgba(0,0,0,0.18)] pt-2">
                <span className="text-[#4A4844]">REFUNDABLE TOTAL:</span>
                <span className="font-black text-sm text-[#111111]">
                  {formatINR(activeReturn.refundAmount)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-[#4A4844] block">
                EXECUTE RESOLUTION ACTIONS
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeReturn.id, 'INSPECTED')}
                  className="p-2.5 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] hover:border-[#111111] text-left text-xs font-mono transition-colors"
                >
                  <div className="font-bold text-[#111111]">1. MARK INSPECTED</div>
                  <div className="text-[10px] text-[#4A4844] mt-0.5">QC passed & tagged</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleUpdateStatus(activeReturn.id, 'EXCHANGED');
                    store.addToast('Exchange Approved', `Size exchange approved for ${activeReturn.customerName}.`, 'success');
                  }}
                  className="p-2.5 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] hover:border-[#111111] text-left text-xs font-mono transition-colors"
                >
                  <div className="font-bold text-[#111111]">2. APPROVE EXCHANGE</div>
                  <div className="text-[10px] text-[#4A4844] mt-0.5">Size replacement order</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleUpdateStatus(activeReturn.id, 'REFUNDED');
                  }}
                  className="p-2.5 bg-[#111111] text-[#E2E2E4] text-left text-xs font-mono hover:bg-neutral-800 transition-colors"
                >
                  <div className="font-bold text-[#E2E2E4]">3. ISSUE REFUND</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Instant UPI / Card settle</div>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-[rgba(0,0,0,0.18)] flex justify-end">
              <Button variant="secondary" onClick={() => setActiveReturn(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
