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
    <div className={clsx('border-b border-[#CFCFD2] flex items-center overflow-x-auto gap-1 sm:gap-2', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-mono uppercase tracking-editorial transition-all relative whitespace-nowrap flex items-center gap-2 border-b-2 -mb-[1px]',
              isActive
                ? 'border-[#0A0A0A] text-[#0A0A0A] font-semibold'
                : 'border-transparent text-[#666666] hover:text-[#111111] hover:border-[#CFCFD2]'
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'px-1.5 py-0.2 text-[10px] font-mono border',
                  isActive
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                    : 'bg-[#F1F1F3] text-[#666666] border-[#CFCFD2]'
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
