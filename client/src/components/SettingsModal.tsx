import React from 'react';
import { Settings, X, Save, CheckCircle2, Folder, Server, RefreshCw, AlertCircle, Globe } from 'lucide-react';
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
  const [testingConnection, setTestingConnection] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<'idle' | 'success' | 'failed'>('idle');
  const [connectionError, setConnectionError] = React.useState('');

  React.useEffect(() => {
    setForm(settings);
    setConnectionStatus('idle');
    setConnectionError('');
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionError('');
    const url = (form.backendUrl || '').trim().replace(/\/+$/, '');
    try {
      const res = await fetch(`${url}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('failed');
        setConnectionError(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      setConnectionStatus('failed');
      setConnectionError(err.message || 'Cannot reach server');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = () => {
    onSaveSettings(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">System & App Preferences</h3>
              <p className="text-xs text-slate-400">Configure engine presets, concurrency, and appearance.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close settings"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="mt-5 flex flex-col gap-4 text-xs sm:text-sm">
          {/* Backend Server URL Configuration */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-white">Backend Engine URL</span>
              </div>
              {connectionStatus === 'success' && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              )}
              {connectionStatus === 'failed' && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  <AlertCircle className="w-3 h-3" /> Failed
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mb-2.5">
              To download 4K videos with FFmpeg & yt-dlp from your phone or Vercel, connect to your active backend (e.g. Cloudflare tunnel, Ngrok, or your server address).
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="http://localhost:4000 or https://xxx.trycloudflare.com"
                value={form.backendUrl || ''}
                onChange={(e) => {
                  setForm({ ...form, backendUrl: e.target.value });
                  setConnectionStatus('idle');
                }}
                className="flex-1 min-h-[40px] px-3 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-3 min-h-[40px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                <span>Test</span>
              </button>
            </div>

            {connectionError && (
              <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{connectionError}</span>
              </p>
            )}

            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Presets:</span>
              <button
                type="button"
                onClick={() => {
                  setForm({ ...form, backendUrl: '' });
                  setConnectionStatus('idle');
                }}
                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Vercel Gateway
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => {
                  setForm({ ...form, backendUrl: 'http://localhost:4000' });
                  setConnectionStatus('idle');
                }}
                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Local Engine (Port 4000)
              </button>
            </div>
          </div>

          {/* Default Format */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Default Download Quality Preset
            </label>
            <select
              value={form.defaultFormat}
              onChange={(e) => setForm({ ...form, defaultFormat: e.target.value as any })}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="best">Highest Available (4K / 1080p 60fps)</option>
              <option value="1080p">1080p Full HD</option>
              <option value="720p">720p HD (Balanced Speed)</option>
              <option value="audio_only">Lossless Audio Extraction (MP3 320k)</option>
            </select>
          </div>

          {/* Max Concurrent Downloads */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Maximum Concurrent Workers
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 5, 8].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm({ ...form, maxConcurrentDownloads: val })}
                  className={`flex-1 min-h-[44px] rounded-xl font-semibold cursor-pointer transition-colors ${
                    form.maxConcurrentDownloads === val
                      ? 'bg-indigo-600 text-white shadow-glow-sm'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Auto Download Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="font-semibold text-white block">Auto-Download on Analysis</span>
              <span className="text-xs text-slate-400">
                Immediately trigger download using default preset upon pasting link
              </span>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, autoDownload: !form.autoDownload })}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                form.autoDownload ? 'bg-indigo-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                  form.autoDownload ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Engine Health Info Panel */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block mb-2">
              Engine Diagnostics
            </span>
            <div className="grid grid-cols-2 gap-2 text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>FFmpeg Muxer: {systemHealth?.hasFfmpeg !== false ? 'Enabled' : 'Available'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Yt-dlp: {systemHealth?.hasYtDlp !== false ? 'Active' : 'Standby'}</span>
              </div>
              <div className="col-span-2 flex items-center gap-1.5 text-slate-500 font-mono text-[11px] truncate">
                <Folder className="w-3 h-3 shrink-0" />
                <span className="truncate">Save path: ~/Downloads/UltimateDownloader</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-cyan hover:from-brand-500 hover:to-cyan-400 text-white font-semibold text-xs sm:text-sm shadow-glow flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};
