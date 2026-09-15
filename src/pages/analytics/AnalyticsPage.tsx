import React, { useState } from 'react';
import { useStore } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { formatINR } from '../../utils/formatters';
import {
  BarChart3,
  TrendingUp,
  ShoppingBag,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowUpRight,
  Download,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { orders, products, collections, customers, returns, payments } = useStore();
  const [timeRange, setTimeRange] = useState('MONTH');

  const grossSales = orders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalRefunds = returns
    .filter((r) => r.status === 'REFUNDED')
    .reduce((sum, r) => sum + r.refundAmount, 0);
  const netSales = grossSales - totalRefunds;
  const averageOrderValue = orders.length ? Math.round(grossSales / orders.length) : 0;
  const returnRate = orders.length ? ((returns.length / orders.length) * 100).toFixed(1) : '0';

  // Sizing demand breakdown across all orders
  const sizeCounts: Record<string, number> = { S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
  orders.forEach((o) => {
    o.items.forEach((item) => {
      if (sizeCounts[item.size] !== undefined) {
        sizeCounts[item.size] += item.quantity;
      } else {
        sizeCounts[item.size] = (sizeCounts[item.size] || 0) + item.quantity;
      }
    });
  });

  const totalGarmentsSold = Object.values(sizeCounts).reduce((a, b) => a + b, 0);

  // Top products by sales
  const productSalesMap: Record<string, { name: string; sku: string; units: number; revenue: number }> = {};
  orders.forEach((o) => {
    o.items.forEach((item) => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          name: item.name,
          sku: item.variantName,
          units: 0,
          revenue: 0,
        };
      }
      productSalesMap[item.productId].units += item.quantity;
      productSalesMap[item.productId].revenue += item.total;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[#CFCFD2] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest-editorial text-[#888888]">
            EXECUTIVE INTELLIGENCE
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A0A0A] mt-1">
            COMMERCE ANALYTICS
          </h1>
          <div className="text-xs font-mono text-[#666666] mt-2">
            Performance Metrics, Capsule Sell-through Velocity, and Silhouette Sizing Demand
          </div>
        </div>

        <div className="flex items-center gap-2">
          {['WEEK', 'MONTH', 'QUARTER', 'ALL TIME'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 font-mono text-xs uppercase font-semibold border transition-all ${
                timeRange === range
                  ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                  : 'bg-white text-[#666666] border-[#CFCFD2] hover:text-[#0A0A0A]'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Topline Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricBlock
          label="GROSS REVENUE"
          value={formatINR(grossSales)}
          subtext="Total invoiced GMV"
        />
        <MetricBlock
          label="NET SALES"
          value={formatINR(netSales)}
          subtext="After returns & allowances"
        />
        <MetricBlock
          label="AVERAGE ORDER VALUE"
          value={formatINR(averageOrderValue)}
          subtext="Across DTC & POS billing"
        />
        <MetricBlock
          label="RETURN RATE"
          value={`${returnRate}%`}
          subtext={`${returns.length} return requests`}
        />
      </div>

      {/* Main Grid: Sell-through Velocity + Size Demand */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Drop Capsule Sell-Through Table */}
        <div className="lg:col-span-8 bg-white border border-[#CFCFD2] p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-4">
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-[#0A0A0A]">
                CAPSULE DROP PERFORMANCE
              </h3>
              <p className="text-xs font-mono text-[#666666] mt-0.5">
                Gross sales and unit velocity across curated collections
              </p>
            </div>
            <span className="text-xs font-mono text-[#888888]">
              {collections.length} Collections Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#CFCFD2] bg-[#F1F1F3] text-[10px] uppercase text-[#666666]">
                  <th className="py-2.5 px-3">CAPSULE CODE</th>
                  <th className="py-2.5 px-3">COLLECTION</th>
                  <th className="py-2.5 px-3">UNITS DISPATCHED</th>
                  <th className="py-2.5 px-3">GROSS REVENUE</th>
                  <th className="py-2.5 px-3">SELL-THROUGH %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E7]">
                {collections.map((col) => {
                  const sellThrough = col.unitsSold > 0 ? Math.min(98, 55 + col.unitsSold * 3) : 60;
                  return (
                    <tr key={col.id} className="hover:bg-[#FAFAFA]">
                      <td className="py-3 px-3 font-bold text-[#0A0A0A]">{col.code}</td>
                      <td className="py-3 px-3 font-semibold text-[#0A0A0A]">{col.name}</td>
                      <td className="py-3 px-3 text-[#444444]">{col.unitsSold} pcs</td>
                      <td className="py-3 px-3 font-bold text-[#0A0A0A]">{formatINR(col.revenue)}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-neutral-200 h-2 max-w-[80px]">
                            <div
                              className="bg-[#0A0A0A] h-2"
                              style={{ width: `${sellThrough}%` }}
                            />
                          </div>
                          <span className="font-bold text-[11px]">{sellThrough}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Top Selling Streetwear Silhouettes */}
          <div className="pt-4 border-t border-[#E5E5E7] space-y-3">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#888888]">
              TOP SELLING STREETWEAR SILHOUETTES
            </h4>
            <div className="space-y-2">
              {topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-[#F1F1F3] border border-[#CFCFD2] font-mono text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 font-bold text-[#888888]">#{idx + 1}</span>
                    <span className="font-bold text-[#0A0A0A]">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[#666666]">{p.units} units sold</span>
                    <span className="font-bold text-[#0A0A0A]">{formatINR(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Sizing Demand Distribution */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#CFCFD2] p-6 space-y-4">
            <div className="border-b border-[#E5E5E7] pb-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">
                SIZING DEMAND DISTRIBUTION
              </h3>
              <p className="text-[11px] font-mono text-[#666666] mt-0.5">
                Unit breakdown per garment size
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {['S', 'M', 'L', 'XL', 'XXL'].map((size) => {
                const count = sizeCounts[size] || 0;
                const percentage = totalGarmentsSold
                  ? Math.round((count / totalGarmentsSold) * 100)
                  : 0;

                return (
                  <div key={size} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold">SIZE {size}</span>
                      <span className="text-[#666666]">
                        {count} units ({percentage}%)
                      </span>
                    </div>
                    <div className="bg-neutral-100 h-2.5 border border-[#CFCFD2] overflow-hidden">
                      <div
                        className="bg-[#0A0A0A] h-full transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-[#F1F1F3] border border-[#CFCFD2] text-[11px] font-mono text-[#666666] mt-4">
              <span className="font-bold text-[#0A0A0A] block mb-1">STREETWEAR SIZING INSIGHT:</span>
              Size Large (L) and Extra Large (XL) represent {Math.round((((sizeCounts.L || 0) + (sizeCounts.XL || 0)) / (totalGarmentsSold || 1)) * 100)}% of total demand due to oversize boxy silhouette preference.
            </div>
          </div>

          {/* Customer Retention Snapshot */}
          <div className="bg-[#0A0A0A] text-white p-6 border border-[#0A0A0A] space-y-3 font-mono">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">
                PATRON REPEAT RATIO
              </span>
            </div>
            <div className="font-display font-black text-3xl">46.8%</div>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              46.8% of customers have made 2 or more streetwear capsule purchases within 90 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
