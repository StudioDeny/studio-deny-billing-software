import React from 'react';
import { clsx } from 'clsx';

interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={clsx('border-b border-[rgba(0,0,0,0.18)] flex items-center overflow-x-auto gap-1 sm:gap-2', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-mono uppercase tracking-editorial transition-all relative whitespace-nowrap flex items-center gap-2 border-b-2 -mb-[1px]',
              isActive
                ? 'border-[#111111] text-[#111111] font-semibold'
                : 'border-transparent text-[#4A4844] hover:text-[#111111] hover:border-[rgba(0,0,0,0.18)]'
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'px-1.5 py-0.2 text-[10px] font-mono border',
                  isActive
                    ? 'bg-[#111111] text-[#E2E2E4] border-[#111111]'
                    : 'bg-[#D5D5D8] text-[#4A4844] border-[rgba(0,0,0,0.18)]'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
