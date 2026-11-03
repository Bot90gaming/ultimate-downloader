import React from 'react';
import { Settings, X, Save, CheckCircle2, Server, Lock, AlertCircle, Sparkles } from 'lucide-react';
import { UserSettings, SystemHealth } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  systemHealth?: SystemHealth | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  systemHealth,
}) => {
  const [form, setForm] = React.useState<UserSettings>(settings);

  React.useEffect(() => {
    setForm(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative max-w-xl w-full bg-white dark:bg-surface-800 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl animate-bounce-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 border border-brand-200/80 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                System & Preferences
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure concurrency, theme, and view system status.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-700 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="mt-4 sm:mt-5 flex flex-col gap-4 text-xs sm:text-sm">
          {/* Backend Engine Routing (Locked System Infrastructure) */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-brand-500" />
                <span className="font-bold text-slate-900 dark:text-white">Backend Engine Routing</span>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-surface-700/80 px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-white/10">
                <Lock className="w-3 h-3 text-slate-500 dark:text-slate-400" /> Managed / Locked
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              Backend routing is managed at the system infrastructure level. Direct client modification of the engine URL is restricted to prevent unauthorized endpoints and ensure secure proxy delivery.
            </p>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-surface-800 border border-slate-200/80 dark:border-white/5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                <span className="font-mono text-slate-700 dark:text-slate-300">Gateway Route:</span>
                <span className="font-mono text-slate-900 dark:text-white font-semibold">/api (Automated Proxy)</span>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded">
                Protected
              </span>
            </div>
          </div>

          {/* Theme selector */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-white/10">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Color Theme</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lighter modern UI (default) or dark contrast mode
              </p>
            </div>
            <div className="flex items-center p-1 bg-white dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-white/10 shadow-soft-xs">
              <button
                type="button"
                onClick={() => setForm({ ...form, theme: 'light' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  form.theme === 'light'
                    ? 'bg-brand-500 text-white shadow-soft-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, theme: 'dark' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  form.theme === 'dark'
                    ? 'bg-brand-500 text-white shadow-soft-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Dark
              </button>
            </div>
          </div>

          {/* Ephemeral Storage Info */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/30">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-accent-green" />
              <span className="font-bold text-emerald-900 dark:text-emerald-300">
                Ephemeral Storage Active
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-400 leading-relaxed">
              Files are automatically deleted from server disk storage 10 seconds after your client finishes downloading. Uncollected files are purged every 15 minutes.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200/80 dark:border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-700 cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="min-h-[42px] px-6 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm shadow-soft-md hover:shadow-glow-brand flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};
