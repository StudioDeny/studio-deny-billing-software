import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Printer, PlusCircle } from 'lucide-react';
import { useStore } from '../../services/store';

interface TopBarProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onOpenNew: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleSidebar,
  onOpenSearch,
}) => {
  const { settings } = useStore();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-[#D5D5D8]/95 backdrop-blur-md border-b border-[rgba(0,0,0,0.18)] h-16 flex items-center justify-between px-4 sm:px-6 md:px-8 no-print select-none">
      {/* Left: Mobile Toggle & Terminal Identifier */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-[#111111] hover:bg-[#D5D5D8] lg:hidden focus:outline-none"
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#4A4844]">
          <span className="text-[#111111] font-extrabold tracking-tight">STUDIO DENY</span>
          <span className="text-[rgba(0,0,0,0.18)]">/</span>
          <span className="tracking-widest uppercase text-[11px]">POS TERMINAL</span>
        </div>
      </div>

      {/* Center/Right: Quick Search & Global Billing Action */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-2 bg-[#D5D5D8] hover:bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] text-xs font-mono text-[#4A4844] hover:text-[#111111] transition-colors"
        >
          <Search size={14} />
          <span className="hidden md:inline">SEARCH BILLS, SKUS...</span>
          <kbd className="hidden lg:inline-block bg-[#D5D5D8] px-1.5 py-0.2 border border-[rgba(0,0,0,0.18)] text-[10px]">
            ⌘K
          </kbd>
        </button>

        {/* Thermal Printer Status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono border border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] text-[#111111]">
          <Printer size={13} className="text-[#111111]" />
          <span className="text-[10px] uppercase font-semibold">POS-80 THERMAL</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        </div>

        {/* Dominant NEW BILL button */}
        <button
          onClick={() => navigate('/billing/new')}
          className="bg-[#111111] text-[#E2E2E4] px-4 py-2 flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-editorial hover:bg-neutral-800 transition-colors shadow-subtle active:scale-[0.98]"
        >
          <PlusCircle size={15} />
          <span>NEW BILL</span>
        </button>

        {/* Staff badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-[rgba(0,0,0,0.18)]">
          <div className="w-8 h-8 bg-[#111111] text-[#E2E2E4] flex items-center justify-center font-mono text-xs font-bold uppercase">
            SD
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-bold leading-tight uppercase font-mono text-[#111111]">
              BILLING DESK
            </div>
            <div className="text-[10px] text-[#4A4844] font-mono leading-tight">
              {settings.storeName || 'FLAGSHIP'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
