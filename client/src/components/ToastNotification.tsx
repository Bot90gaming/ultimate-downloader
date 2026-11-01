import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { ToastNotification as ToastType } from '../types';

interface ToastProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        let borderColor = 'border-slate-700';
        let icon = <Info className="w-5 h-5 text-indigo-400 shrink-0" />;
        let bgGlow = 'rgba(99, 102, 241, 0.15)';

        if (toast.type === 'success') {
          borderColor = 'border-emerald-500/40';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
          bgGlow = 'rgba(52, 211, 153, 0.15)';
        } else if (toast.type === 'error') {
          borderColor = 'border-red-500/40';
          icon = <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />;
          bgGlow = 'rgba(239, 68, 68, 0.15)';
        } else if (toast.type === 'warning') {
          borderColor = 'border-amber-500/40';
          icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
          bgGlow = 'rgba(245, 158, 11, 0.15)';
        }

        return (
          <div
            key={toast.id}
            style={{ boxShadow: `0 8px 24px -4px ${bgGlow}` }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-xl border ${borderColor} text-slate-100 shadow-xl transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-2`}
          >
            {icon}
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-sm font-semibold text-slate-100">{toast.title}</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 -mt-2 text-slate-400 hover:text-slate-100 cursor-pointer rounded-lg hover:bg-slate-800/60 transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
