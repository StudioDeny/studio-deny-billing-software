import React, { useEffect, useState } from 'react';
import { store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { formatINR } from '../../utils/formatters';
import { formatRate } from '../../utils/tax';
import { fetchMonthlyData, fetchInvoiceIdentity, totalsFor, MonthlyData } from '../../api/monthlyReport';
import { buildMonthlyReportPdf } from '../../utils/monthlyReportPdf';
import { Download, CalendarRange, RefreshCw } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Current month/year in the store's timezone (IST), not the device's.
function nowIst(): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' })
    .format(new Date())
    .split('-');
  return { year: Number(parts[0]), month: Number(parts[1]) };
}

export const MonthlyBillsPage: React.FC = () => {
  const current = nowIst();
  const [year, setYear] = useState(current.year);
  const [month, setMonth] = useState(current.month);
  const [data, setData] = useState<MonthlyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => current.year - i);
  const isFuture = year > current.year || (year === current.year && month > current.month);
  const monthLabel = `${MONTHS[month - 1]} ${year}`;

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setData(await fetchMonthlyData(year, month));
    } catch (err) {
      setData(null);
      setLoadError(err instanceof Error ? err.message : 'Could not load this month.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isFuture) {
      setData(null);
      return;
    }
    load();
  }, [year, month]);

  const handleDownload = async () => {
    if (!data) return;
    setIsGenerating(true);
    try {
      // Re-fetch so the PDF reflects the database at the moment of download.
      const [fresh, identity] = await Promise.all([fetchMonthlyData(year, month), fetchInvoiceIdentity()]);
      setData(fresh);
      const doc = buildMonthlyReportPdf(fresh, identity, monthLabel);
      doc.save(`StudioDeny_Invoices_${year}-${String(month).padStart(2, '0')}.pdf`);
      store.addToast(
        'Monthly PDF Downloaded',
        `${fresh.offline.length} offline + ${fresh.online.length} online invoices for ${monthLabel}.`,
        'success'
      );
    } catch (err) {
      store.addToast('Download Failed', err instanceof Error ? err.message : 'Could not build the PDF.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const offline = data ? totalsFor(data.offline) : null;
  const online = data ? totalsFor(data.online) : null;
  const register = data ? [...data.offline, ...data.online] : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-[rgba(0,0,0,0.18)] pb-5">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#4A4844]">
          GST RECORDS & ACCOUNTING
        </div>
        <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#111111] mt-1">
          MONTHLY BILLS
        </h1>
        <div className="text-xs font-mono text-[#4A4844] mt-1">
          Download every invoice for a month (offline POS + delivered website orders) with the month's sales & GST report
          in one PDF
        </div>
      </div>

      <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-5 flex flex-col sm:flex-row sm:items-end gap-4 font-mono">
        <div className="flex items-center gap-2 text-[#111111] sm:pb-3">
          <CalendarRange size={16} />
        </div>
        <div className="sm:w-48">
          <Select
            label="MONTH"
            value={String(month)}
            onChange={(e) => setMonth(Number(e.target.value))}
            options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
          />
        </div>
        <div className="sm:w-32">
          <Select
            label="YEAR"
            value={String(year)}
            onChange={(e) => setYear(Number(e.target.value))}
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
          />
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="secondary" onClick={load} disabled={isLoading || isFuture}>
            <RefreshCw size={14} className="mr-2" /> REFRESH
          </Button>
          <Button
            variant="primary"
            onClick={handleDownload}
            disabled={!data || isLoading || isGenerating || register.length === 0}
          >
            <Download size={14} className="mr-2" /> {isGenerating ? 'BUILDING PDF...' : 'DOWNLOAD PDF'}
          </Button>
        </div>
      </div>

      {isFuture && (
        <div className="p-4 border border-[rgba(0,0,0,0.18)] font-mono text-xs text-[#4A4844]">
          {monthLabel} hasn't started yet.
        </div>
      )}

      {loadError && (
        <div className="p-4 border border-red-300 bg-red-50 font-mono text-xs text-red-800">{loadError}</div>
      )}

      {isLoading && <div className="font-mono text-xs text-[#4A4844]">Loading {monthLabel}...</div>}

      {data && offline && online && !isLoading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricBlock
              label="OFFLINE INVOICES"
              value={offline.count}
              subtext={`${formatINR(offline.total)}${data.voided.length > 0 ? ` · ${data.voided.length} voided` : ''}`}
            />
            <MetricBlock label="ONLINE INVOICES" value={online.count} subtext={`${formatINR(online.total)} · delivered`} />
            <MetricBlock label="TOTAL SALES" value={formatINR(offline.total + online.total)} subtext={monthLabel} />
            <MetricBlock
              label="GST COLLECTED"
              value={formatINR(offline.tax + online.tax)}
              subtext={`on ${formatINR(offline.taxable + online.taxable)} taxable`}
            />
          </div>

          <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-[rgba(0,0,0,0.18)] text-[10px] uppercase text-[#4A4844]">
                  <th className="py-3 px-4 font-medium">INVOICE</th>
                  <th className="py-3 px-4 font-medium">DATE</th>
                  <th className="py-3 px-4 font-medium">CHANNEL</th>
                  <th className="py-3 px-4 font-medium">CUSTOMER</th>
                  <th className="py-3 px-4 font-medium text-right">GST</th>
                  <th className="py-3 px-4 font-medium text-right">TAX</th>
                  <th className="py-3 px-4 font-medium text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
                {register.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-[#4A4844]">
                      No invoices in {monthLabel}.
                    </td>
                  </tr>
                ) : (
                  register.map((inv) => (
                    <tr key={`${inv.channel}-${inv.id}`}>
                      <td className="py-2.5 px-4 font-bold text-[#111111]">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-4 text-[#4A4844]">
                        {new Date(inv.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="py-2.5 px-4">{inv.channel}</td>
                      <td className="py-2.5 px-4">{inv.customerName}</td>
                      <td className="py-2.5 px-4 text-right">
                        {formatRate(inv.taxRate)}%{inv.taxIsCustom ? ' CUSTOM' : ''}
                      </td>
                      <td className="py-2.5 px-4 text-right">{formatINR(inv.taxAmount)}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#111111]">{formatINR(inv.grandTotal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
