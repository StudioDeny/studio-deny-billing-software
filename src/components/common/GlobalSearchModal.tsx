import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../services/store';
import { Search, X, ArrowRight, Shirt, Users, Receipt } from 'lucide-react';
import { formatINR } from '../../utils/formatters';

interface SearchResult {
  id: string;
  type: 'BILL' | 'PRODUCT' | 'CUSTOMER';
  title: string;
  subtitle: string;
  badge?: string;
  url: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { products, orders, customers } = useStore();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [
        ...orders.slice(0, 3).map((o) => ({
          id: o.id,
          type: 'BILL' as const,
          title: `Bill ${o.orderNumber}`,
          subtitle: `${o.customerName} • ${formatINR(o.grandTotal)}`,
          badge: o.paymentMethod,
          url: `/bills/${o.id}`,
        })),
        ...products.slice(0, 3).map((p) => ({
          id: p.id,
          type: 'PRODUCT' as const,
          title: p.name,
          subtitle: `SKU: ${p.sku} • ${p.totalStock} in stock`,
          badge: p.collection,
          url: `/products/${p.id}`,
        })),
        ...customers.slice(0, 2).map((c) => ({
          id: c.id,
          type: 'CUSTOMER' as const,
          title: c.name,
          subtitle: `${c.phone} • ${c.ordersCount} bills`,
          badge: c.segment,
          url: `/customers/${c.id}`,
        })),
      ];
    }

    const matched: SearchResult[] = [];

    // Search Bills
    orders.forEach((o) => {
      if (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q)
      ) {
        matched.push({
          id: o.id,
          type: 'BILL',
          title: `Bill ${o.orderNumber}`,
          subtitle: `${o.customerName} • ${o.items.length} items • ${formatINR(o.grandTotal)}`,
          badge: o.paymentMethod,
          url: `/bills/${o.id}`,
        });
      }
    });

    // Search Products & SKUs
    products.forEach((p) => {
      const variantMatch = p.variants.some((v) => v.sku.toLowerCase().includes(q));
      if (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        variantMatch
      ) {
        matched.push({
          id: p.id,
          type: 'PRODUCT',
          title: p.name,
          subtitle: `SKU: ${p.sku} • ${formatINR(p.price)} • ${p.totalStock} in stock`,
          badge: p.collection,
          url: `/products/${p.id}`,
        });
      }
    });

    // Search Customers
    customers.forEach((c) => {
      if (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
      ) {
        matched.push({
          id: c.id,
          type: 'CUSTOMER',
          title: c.name,
          subtitle: `${c.phone} • Total Bills: ${c.ordersCount}`,
          badge: c.segment,
          url: `/customers/${c.id}`,
        });
      }
    });

    return matched.slice(0, 10);
  }, [query, products, orders, customers]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0A0A0A]/60 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 md:p-12 animate-in fade-in duration-150 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-[#0A0A0A] shadow-2xl flex flex-col overflow-hidden max-h-[80vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#CFCFD2] flex items-center gap-3 bg-[#FAFAFA]">
          <Search size={18} className="text-[#666666] shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search bills, garments, SKUs, or patron phone numbers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent font-mono text-xs sm:text-sm focus:outline-none placeholder:text-[#888888]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[#888888] hover:text-[#0A0A0A] p-1 shrink-0"
              title="Clear input"
            >
              <X size={14} />
            </button>
          )}
          <span className="hidden sm:inline-block text-[10px] font-mono text-[#888888] border border-[#CFCFD2] px-1.5 py-0.5 bg-white shrink-0">
            ESC
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#666666] hover:text-[#0A0A0A] hover:bg-[#E5E5E7] transition-colors border border-[#CFCFD2] bg-white flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Close search"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {results.length === 0 ? (
            <div className="py-12 text-center font-mono text-xs text-[#888888]">
              No records found matching "{query}"
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 flex items-center justify-between cursor-pointer font-mono transition-colors ${
                    isSelected ? 'bg-[#0A0A0A] text-white' : 'hover:bg-[#F1F1F3] text-[#111111]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 shrink-0 ${
                        isSelected ? 'bg-white/10 text-white' : 'bg-[#F1F1F3] text-[#444444]'
                      }`}
                    >
                      {item.type === 'BILL' && <Receipt size={15} />}
                      {item.type === 'PRODUCT' && <Shirt size={15} />}
                      {item.type === 'CUSTOMER' && <Users size={15} />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 uppercase ${
                              isSelected
                                ? 'bg-white text-[#0A0A0A]'
                                : 'bg-[#E5E5E7] text-[#555555]'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[11px] truncate mt-0.5 ${
                          isSelected ? 'text-neutral-300' : 'text-[#666666]'
                        }`}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <ArrowRight
                    size={14}
                    className={`shrink-0 ml-2 ${
                      isSelected ? 'text-white' : 'text-[#888888]'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#CFCFD2] bg-[#F1F1F3] flex items-center justify-between text-[10px] font-mono text-[#666666]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="font-semibold text-[#0A0A0A]">DENY TERMINAL DISPATCH</span>
        </div>
      </div>
    </div>
  );
};
