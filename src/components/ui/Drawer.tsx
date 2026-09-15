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
        className="fixed inset-0 bg-[#0A0A0A]/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className={twMerge(
            clsx(
              'w-screen bg-white border-l border-[#0A0A0A] shadow-modal flex flex-col animate-in slide-in-from-right duration-200',
              widthStyles[width]
            )
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 md:p-6 border-b border-[#CFCFD2] bg-white">
            <div>
              <h3 className="font-display text-lg md:text-xl font-bold uppercase tracking-tight text-[#0A0A0A]">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-[#666666] font-mono tracking-wide mt-1">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 text-[#666666] hover:text-[#0A0A0A] hover:bg-[#F1F1F3] transition-colors focus:outline-none"
              aria-label="Close drawer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-5 md:p-6 overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="p-4 md:p-5 border-t border-[#CFCFD2] bg-[#F1F1F3] flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
