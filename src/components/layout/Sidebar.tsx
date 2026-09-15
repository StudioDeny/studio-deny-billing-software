import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  Shirt,
  Users,
  Settings,
  X,
  Search,
  RotateCcw,
  Tag,
  FileCheck,
} from 'lucide-react';
import { store } from '../../services/store';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  onOpenNew: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onOpenSearch,
}) => {
  const location = useLocation();

  // Core navigation items including Price Tag Generator & Channel Audit
  const navItems = [
    { label: 'DASHBOARD', path: '/dashboard', icon: <LayoutDashboard size={16} /> },
    { label: 'NEW BILL', path: '/billing/new', icon: <PlusCircle size={16} />, highlight: true },
    { label: 'BILLS', path: '/bills', icon: <Receipt size={16} /> },
    { label: 'PRICE TAGS', path: '/tags', icon: <Tag size={16} /> },
    { label: 'SALES AUDIT', path: '/audit', icon: <FileCheck size={16} /> },
    { label: 'PRODUCTS', path: '/products', icon: <Shirt size={16} /> },
    { label: 'CUSTOMERS', path: '/customers', icon: <Users size={16} /> },
    { label: 'SETTINGS', path: '/settings', icon: <Settings size={16} /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#0A0A0A]/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 md:w-68 bg-white border-r border-[#CFCFD2] flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print select-none`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#CFCFD2] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-xl tracking-tight text-[#0A0A0A]">
                STUDIO DENY
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 bg-[#0A0A0A] text-white">
                POS TERMINAL
              </span>
              <span className="text-[10px] font-mono text-[#888888]">INTERNAL BILLING</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#666666] hover:text-[#0A0A0A] lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Global Primary Quick Bill Action */}
        <div className="p-4 border-b border-[#CFCFD2] space-y-2">
          <NavLink
            to="/billing/new"
            onClick={onClose}
            className="w-full bg-[#0A0A0A] text-white py-3 px-3.5 flex items-center justify-between text-xs font-mono font-bold uppercase tracking-editorial hover:bg-neutral-800 transition-colors shadow-subtle"
          >
            <span className="flex items-center gap-2">
              <PlusCircle size={15} />
              <span>START NEW BILL</span>
            </span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-xs">POS</span>
          </NavLink>

          <button
            onClick={() => {
              onClose();
              onOpenSearch();
            }}
            className="w-full bg-[#F1F1F3] border border-[#CFCFD2] text-[#666666] py-2 px-3 flex items-center justify-between text-xs font-mono hover:text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Search size={13} />
              <span>SEARCH BILLS & SKUS...</span>
            </span>
            <span className="text-[10px] bg-white px-1.5 py-0.5 border border-[#CFCFD2]">⌘K</span>
          </button>
        </div>

        {/* Navigation List - Strictly 6 Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-[#888888]">
            TERMINAL MENU
          </div>
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === '/bills' && (location.pathname.startsWith('/bills') || location.pathname.startsWith('/invoices') || location.pathname.startsWith('/orders'))) ||
              (item.path === '/tags' && location.pathname.startsWith('/tags')) ||
              (item.path === '/audit' && location.pathname.startsWith('/audit')) ||
              (item.path === '/products' && location.pathname.startsWith('/products')) ||
              (item.path === '/customers' && location.pathname.startsWith('/customers')) ||
              (item.path === '/settings' && location.pathname.startsWith('/settings'));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-3 text-xs font-mono tracking-editorial transition-all ${
                  isActive
                    ? 'bg-[#0A0A0A] text-white font-bold shadow-subtle'
                    : 'text-[#444444] hover:bg-[#F1F1F3] hover:text-[#111111]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-[#666666]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {isActive && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Status */}
        <div className="p-3.5 border-t border-[#CFCFD2] bg-[#F1F1F3] flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="text-[#444444] font-medium">TERMINAL #01 · ACTIVE</span>
          </div>

          <button
            onClick={() => store.resetToDefaults()}
            title="Reset to default Studio Deny catalog"
            className="p-1 text-[#888888] hover:text-[#0A0A0A] flex items-center gap-1"
          >
            <RotateCcw size={12} />
            <span className="text-[10px]">RESET</span>
          </button>
        </div>
      </aside>
    </>
  );
};
