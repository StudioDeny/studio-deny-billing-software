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
      <div className="border-b border-[#CFCFD2] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest-editorial text-[#888888]">
            REVERSE LOGISTICS & QUALITY CONTROL
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A0A0A] mt-1">
            RETURNS & EXCHANGES
          </h1>
          <div className="text-xs font-mono text-[#666666] mt-2">
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
      <div className="flex items-center gap-3 bg-white p-3 border border-[#CFCFD2]">
        <Search size={15} className="text-[#888888]" />
        <input
          type="text"
          placeholder="Filter by return RMA, order number, patron name, or silhouette..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent font-mono text-xs focus:outline-none placeholder:text-[#888888]"
        />
      </div>

      {/* Returns Table */}
      <div className="bg-white border border-[#CFCFD2] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[#CFCFD2] bg-[#F1F1F3] text-[10px] uppercase text-[#666666]">
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
            <tbody className="divide-y divide-[#E5E5E7]">
              {filteredReturns.map((ret) => (
                <tr key={ret.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="py-3 px-4 font-bold text-[#0A0A0A]">{ret.returnNumber}</td>
                  <td className="py-3 px-4 font-semibold text-[#666666]">{ret.orderNumber}</td>
                  <td className="py-3 px-4 text-[#0A0A0A]">{ret.customerName}</td>
                  <td className="py-3 px-4 text-[#444444]">
                    <div>{ret.productTitle}</div>
                    <span className="text-[10px] text-[#888888]">{ret.variantName}</span>
                  </td>
                  <td className="py-3 px-4 text-[#666666]">{ret.reason}</td>
                  <td className="py-3 px-4 font-bold text-[#0A0A0A]">
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
            <div className="p-4 bg-[#F1F1F3] border border-[#CFCFD2] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#666666]">PATRON:</span>
                <span className="font-bold text-[#0A0A0A]">{activeReturn.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666666]">ORIGINAL ORDER:</span>
                <span className="font-bold text-[#0A0A0A]">{activeReturn.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666666]">GARMENT:</span>
                <span className="font-bold text-[#0A0A0A]">
                  {activeReturn.productTitle} ({activeReturn.variantName})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666666]">REPORTED REASON:</span>
                <span className="text-[#0A0A0A]">{activeReturn.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666666]">INSPECTION CONDITION:</span>
                <span className="font-bold text-emerald-800">{activeReturn.condition}</span>
              </div>
              <div className="flex justify-between border-t border-[#CFCFD2] pt-2">
                <span className="text-[#666666]">REFUNDABLE TOTAL:</span>
                <span className="font-black text-sm text-[#0A0A0A]">
                  {formatINR(activeReturn.refundAmount)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-[#888888] block">
                EXECUTE RESOLUTION ACTIONS
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeReturn.id, 'INSPECTED')}
                  className="p-2.5 bg-white border border-[#CFCFD2] hover:border-[#0A0A0A] text-left text-xs font-mono transition-colors"
                >
                  <div className="font-bold text-[#0A0A0A]">1. MARK INSPECTED</div>
                  <div className="text-[10px] text-[#888888] mt-0.5">QC passed & tagged</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleUpdateStatus(activeReturn.id, 'EXCHANGED');
                    store.addToast('Exchange Approved', `Size exchange approved for ${activeReturn.customerName}.`, 'success');
                  }}
                  className="p-2.5 bg-white border border-[#CFCFD2] hover:border-[#0A0A0A] text-left text-xs font-mono transition-colors"
                >
                  <div className="font-bold text-[#0A0A0A]">2. APPROVE EXCHANGE</div>
                  <div className="text-[10px] text-[#888888] mt-0.5">Size replacement order</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleUpdateStatus(activeReturn.id, 'REFUNDED');
                  }}
                  className="p-2.5 bg-[#0A0A0A] text-white text-left text-xs font-mono hover:bg-neutral-800 transition-colors"
                >
                  <div className="font-bold text-white">3. ISSUE REFUND</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Instant UPI / Card settle</div>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-[#CFCFD2] flex justify-end">
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
