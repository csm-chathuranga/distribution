import { useState, useEffect } from 'react';
import { X, Printer, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const WIDTH_OPTIONS = [
  { label: '76 mm', value: 76 },
  { label: '80 mm', value: 80 },
];

export default function PrintSettingsModal({ open, onClose }) {
  const [printers,  setPrinters]  = useState([]);
  const [settings,  setSettings]  = useState({ printerName: '', paperWidthMm: 80, copies: 1 });
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [status,    setStatus]    = useState(null); // 'ok' | 'err' | null

  useEffect(() => {
    if (!open || !window.electronAPI) return;
    setLoading(true);
    Promise.all([
      window.electronAPI.getPrinters(),
      window.electronAPI.getPrintSettings(),
    ]).then(([p, s]) => {
      setPrinters(p || []);
      setSettings(s || { printerName: '', paperWidthMm: 80, copies: 1 });
    }).finally(() => setLoading(false));
  }, [open]);

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      await window.electronAPI.savePrintSettings(settings);
      setStatus('ok');
      setTimeout(() => { setStatus(null); onClose(); }, 1200);
    } catch {
      setStatus('err');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestPrint() {
    const testHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: monospace; font-size: 18px; width: ${settings.paperWidthMm}mm; padding: 4mm 2mm; }
  .center { text-align: center; }
  .bold   { font-weight: bold; }
  hr      { border-top: 1px dashed #000; margin: 6px 0; }
</style></head>
<body>
  <div class="center bold" style="font-size:20px">TEST PRINT</div>
  <hr>
  <div class="center">Lanka Distribution System</div>
  <div class="center" style="font-size:14px">Paper: ${settings.paperWidthMm}mm &nbsp;|&nbsp; Copies: ${settings.copies}</div>
  <div class="center" style="font-size:14px">Printer: ${settings.printerName || '(default)'}</div>
  <hr>
  <div class="center" style="font-size:14px">${new Date().toLocaleString('en-LK')}</div>
</body></html>`;
    await window.electronAPI.posPrint(testHtml);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Printer size={20} className="text-indigo-600" />
            <h2 className="font-bold text-slate-900 text-lg">Printer Settings</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={28} className="animate-spin text-indigo-400" />
            </div>
          ) : (
            <>
              {/* Printer select */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  POS Printer
                </label>
                <select
                  value={settings.printerName}
                  onChange={e => setSettings(s => ({ ...s, printerName: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">— System default printer —</option>
                  {printers.map(p => (
                    <option key={p.name} value={p.name}>
                      {p.name}{p.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
                {printers.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No printers detected. Install a printer driver first.</p>
                )}
              </div>

              {/* Paper width */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Paper Width
                </label>
                <div className="flex gap-2">
                  {WIDTH_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSettings(s => ({ ...s, paperWidthMm: opt.value }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                        settings.paperWidthMm === opt.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Copies */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Copies per print
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(n => (
                    <button
                      key={n}
                      onClick={() => setSettings(s => ({ ...s, copies: n }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                        settings.copies === n
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Test print */}
              <button
                onClick={handleTestPrint}
                className="w-full border-2 border-dashed border-slate-300 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                Test Print
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : status === 'ok' ? (
              <><CheckCircle size={16} /> Saved</>
            ) : status === 'err' ? (
              <><AlertCircle size={16} /> Failed</>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
