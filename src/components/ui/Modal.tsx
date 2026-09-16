import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
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

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:m-0 print:static print:block">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#111111]/60 backdrop-blur-xs transition-opacity no-print"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div
        className={twMerge(
          clsx(
            'relative w-full bg-[#D5D5D8] border border-[#111111] shadow-modal z-10 my-8 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:m-0 print:p-0 print:max-h-none print:bg-transparent',
            maxWidthStyles[maxWidth]
          )
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 md:p-6 border-b border-[rgba(0,0,0,0.18)] bg-[#E2E2E4] no-print">
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
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 md:p-6 overflow-y-auto flex-1 print:p-0 print:overflow-visible">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="p-4 md:p-5 border-t border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] flex items-center justify-end gap-3 no-print">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
