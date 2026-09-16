import React from 'react';
import { useStore, store } from '../../services/store';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export const ToastContainer: React.FC = () => {
  const { toasts } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full no-print">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle size={16} className="text-emerald-700 flex-shrink-0" />,
          warning: <AlertTriangle size={16} className="text-amber-700 flex-shrink-0" />,
          error: <AlertCircle size={16} className="text-rose-700 flex-shrink-0" />,
          info: <Info size={16} className="text-[#111111] flex-shrink-0" />,
        };

        const bgStyles = {
          success: 'bg-[#D5D5D8] border-emerald-300',
          warning: 'bg-[#D5D5D8] border-amber-300',
          error: 'bg-[#D5D5D8] border-rose-300',
          info: 'bg-[#D5D5D8] border-[#111111]',
        };

        return (
          <div
            key={toast.id}
            className={clsx(
              'p-3.5 border shadow-modal flex items-start gap-3 transition-all animate-in slide-in-from-bottom-2 duration-150',
              bgStyles[toast.type || 'info']
            )}
          >
            <div className="mt-0.5">{icons[toast.type || 'info']}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
                {toast.title}
              </div>
              {toast.message && (
                <div className="text-xs text-[#4A4844] mt-0.5 font-sans leading-relaxed">
                  {toast.message}
                </div>
              )}
            </div>
            <button
              onClick={() => store.removeToast(toast.id)}
              className="text-[#4A4844] hover:text-[#111111] p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
