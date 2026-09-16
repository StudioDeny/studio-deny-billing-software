import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'md' | 'lg' | 'xl' | '2xl';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthStyles = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#111111]/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className={twMerge(
            clsx(
              'w-screen bg-[#D5D5D8] border-l border-[#111111] shadow-modal flex flex-col animate-in slide-in-from-right duration-200',
              widthStyles[width]
            )
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 md:p-6 border-b border-[rgba(0,0,0,0.18)] bg-[#D5D5D8]">
            <div>
              <h3 className="font-display text-lg md:text-xl font-bold uppercase tracking-tight text-[#111111]">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-[#4A4844] font-mono tracking-wide mt-1">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 text-[#4A4844] hover:text-[#111111] hover:bg-[#D5D5D8] transition-colors focus:outline-none"
              aria-label="Close drawer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-5 md:p-6 overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="p-4 md:p-5 border-t border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
