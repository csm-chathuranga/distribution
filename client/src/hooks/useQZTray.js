import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { connect, disconnect, isConnected, printRaw, getPrinters } from '../utils/qzTray';
import { buildInvoiceReceipt } from '../utils/escpos';

export const DEFAULT_PRINTER = 'POS-76';

export function useQZTray() {
  const [status, setStatus]   = useState('idle'); // idle | connecting | ready | error
  const [error,  setError]    = useState(null);

  const ensureConnected = useCallback(async () => {
    if (isConnected()) return true;
    setStatus('connecting');
    setError(null);
    try {
      await connect();
      setStatus('ready');
      return true;
    } catch (e) {
      const msg = e?.message || 'QZ Tray not running';
      setStatus('error');
      setError(msg);
      console.warn('[QZ Tray]', msg, e);
      return false;
    }
  }, []);

  const printInvoice = useCallback(async (invoice, company, printerName = DEFAULT_PRINTER) => {
    console.log('[QZ] printInvoice called, invoice:', invoice?.id, 'company:', company?.name);
    const ok = await ensureConnected();
    console.log('[QZ] ensureConnected result:', ok);
    if (!ok) {
      toast('QZ Tray not available — opening browser print', { icon: '🖨️' });
      return false;
    }
    try {
      console.log('[QZ] building receipt...');
      const cmds = buildInvoiceReceipt(invoice, company);
      console.log('[QZ] receipt built, commands:', cmds.length);
      await printRaw(printerName, cmds);
      setStatus('ready');
      toast.success('Sent to ' + printerName);
      return true;
    } catch (e) {
      const msg = e?.message || 'Print failed';
      setStatus('error');
      setError(msg);
      console.error('[QZ Tray print]', msg, e);
      toast('Print error: ' + msg + ' — opening browser print', { icon: '⚠️' });
      return false;
    }
  }, [ensureConnected]);

  const listPrinters = useCallback(async () => {
    const ok = await ensureConnected();
    if (!ok) return [];
    try {
      return await getPrinters();
    } catch {
      return [];
    }
  }, [ensureConnected]);

  const close = useCallback(async () => {
    await disconnect();
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, printInvoice, listPrinters, close };
}
