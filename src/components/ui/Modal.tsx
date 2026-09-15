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
        className="fixed inset-0 bg-[#0A0A0A]/60 backdrop-blur-xs transition-opacity no-print"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div
        className={twMerge(
          clsx(
            'relative w-full bg-white border border-[#0A0A0A] shadow-modal z-10 my-8 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:m-0 print:p-0 print:max-h-none print:bg-transparent',
            maxWidthStyles[maxWidth]
          )
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 md:p-6 border-b border-[#CFCFD2] bg-[#FFFFFF] no-print">
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
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 md:p-6 overflow-y-auto flex-1 print:p-0 print:overflow-visible">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="p-4 md:p-5 border-t border-[#CFCFD2] bg-[#F1F1F3] flex items-center justify-end gap-3 no-print">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
