import { useState } from 'react';
import { CheckCircle, XCircle, Package, User, MapPin, ChevronDown, ChevronUp, Banknote, Navigation } from 'lucide-react';
import { useGetActiveSheetQuery, useGetLoadingSheetQuery, useCreateReceiptMutation } from '../../api/salesApi';
import { useDeliverInvoiceMutation, useCancelInvoiceMutation } from '../../api/salesApi';

const STATUS_BADGE = {
  POSTED:    'bg-blue-100 text-blue-700',
  PARTIAL:   'bg-yellow-100 text-yellow-700',
  OVERDUE:   'bg-red-100 text-red-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const METHODS = ['CASH', 'CHEQUE', 'BANK_TRANSFER'];
const methodLabel = m => m === 'BANK_TRANSFER' ? 'Transfer' : m.charAt(0) + m.slice(1).toLowerCase();

function PaymentRow({ row, onChange, onRemove, canRemove, total }) {
  return (
    <div className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50">
      <div className="flex gap-1.5">
        {METHODS.map(m => (
          <button key={m} type="button" onClick={() => onChange({ ...row, method: m, chequeNo: '' })}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${row.method === m ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            {methodLabel(m)}
          </button>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="number" inputMode="decimal"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          placeholder="Amount (LKR)"
          value={row.amount}
          onChange={e => onChange({ ...row, amount: e.target.value })}
        />
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="p-2 rounded-lg text-red-400 hover:bg-red-50">
            <XCircle size={16} />
          </button>
        )}
      </div>
      {row.method === 'CHEQUE' && (
        <input
          type="text"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          placeholder="Cheque number"
          value={row.chequeNo}
          onChange={e => onChange({ ...row, chequeNo: e.target.value })}
        />
      )}
    </div>
  );
}

function CollectModal({ invoice, onConfirm, onClose }) {
  const invoiceTotal = parseFloat(invoice.total_amount) || 0;
  const [rows, setRows] = useState([{ method: 'CASH', amount: String(invoiceTotal), chequeNo: '' }]);

  const totalEntered = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const remaining = invoiceTotal - totalEntered;
  const valid = rows.every(r => parseFloat(r.amount) > 0 && (r.method !== 'CHEQUE' || r.chequeNo.trim())) && totalEntered > 0;

  const updateRow = (i, val) => setRows(rs => rs.map((r, idx) => idx === i ? val : r));
  const addRow = () => setRows(rs => [...rs, { method: 'CASH', amount: remaining > 0 ? String(remaining.toFixed(2)) : '', chequeNo: '' }]);
  const removeRow = i => setRows(rs => rs.filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-800 mb-0.5">Collect Payment</h3>
        <p className="text-sm text-gray-500 mb-3">{invoice.invoice_number} — {invoice.Customer?.name}</p>

        <div className="space-y-2 mb-3">
          {rows.map((row, i) => (
            <PaymentRow key={i} row={row} onChange={val => updateRow(i, val)} onRemove={() => removeRow(i)} canRemove={rows.length > 1} />
          ))}
        </div>

        <div className="flex items-center justify-between mb-3 text-xs">
          <button type="button" onClick={addRow}
            className="text-primary-600 font-semibold hover:underline">
            + Add split
          </button>
          <span className={`font-semibold ${Math.abs(remaining) < 0.01 ? 'text-green-600' : remaining > 0 ? 'text-amber-600' : 'text-red-500'}`}>
            {Math.abs(remaining) < 0.01 ? 'Fully allocated' : remaining > 0 ? `LKR ${remaining.toFixed(2)} remaining` : `LKR ${Math.abs(remaining).toFixed(2)} over`}
          </span>
        </div>

        <div className="flex gap-3">
          <button className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600" onClick={onClose}>Back</button>
          <button disabled={!valid} className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-bold disabled:opacity-40"
            onClick={() => onConfirm(rows.map(r => ({ amount: parseFloat(r.amount), method: r.method, chequeNo: r.chequeNo.trim() || null })))}>
            Record
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({ invoice, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-gray-800 mb-1">Cancel Invoice</h3>
        <p className="text-sm text-gray-500 mb-4">
          {invoice.invoice_number} — {invoice.Customer?.name}
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
        <textarea
          className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
          rows={3}
          placeholder="e.g. Customer not available, refused delivery…"
          value={reason}
          onChange={e => setReason(e.target.value)}
          autoFocus
        />
        <div className="flex gap-3 mt-4">
          <button
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600"
            onClick={onClose}
          >
            Back
          </button>
          <button
            disabled={!reason.trim()}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-40"
            onClick={() => onConfirm(reason.trim())}
          >
            Cancel Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DriverDeliveries() {
  const { data: activeSheet } = useGetActiveSheetQuery();
  const sheetId = activeSheet?.id;
  const { data: sheet, isLoading } = useGetLoadingSheetQuery(sheetId, { skip: !sheetId });

  const [deliverInvoice] = useDeliverInvoiceMutation();
  const [cancelInvoice]  = useCancelInvoiceMutation();
  const [createReceipt]  = useCreateReceiptMutation();

  const [cancelTarget,  setCancelTarget]  = useState(null);
  const [collectTarget, setCollectTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  // optimistic local overrides so buttons disable instantly before refetch
  const [localStatus, setLocalStatus] = useState({});

  const invoices = sheet?.Invoices ?? [];

  async function handleDeliver(inv) {
    if (busyId) return;
    setBusyId(inv.id);
    try {
      await deliverInvoice(inv.id).unwrap();
      setLocalStatus(s => ({ ...s, [inv.id]: 'DELIVERED' }));
      setExpandedId(null);
    } catch (e) {
      alert(e?.data?.message ?? 'Failed to mark as delivered');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(reason) {
    if (!cancelTarget) return;
    const targetId = cancelTarget.id;
    setBusyId(targetId);
    try {
      await cancelInvoice({ id: targetId, reason }).unwrap();
      setLocalStatus(s => ({ ...s, [targetId]: 'CANCELLED' }));
      setCancelTarget(null);
    } catch (e) {
      alert(e?.data?.message ?? 'Failed to cancel invoice');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCollect(payments) {
    if (!collectTarget) return;
    const inv = collectTarget;
    setBusyId(inv.id);
    const today = new Date().toISOString().slice(0, 10);
    try {
      for (const { amount, method, chequeNo } of payments) {
        await createReceipt({
          customer_id:    inv.customer_id,
          receipt_date:   today,
          payment_method: method,
          amount,
          notes:          `Collected on delivery — ${inv.invoice_number}`,
          allocations:    [{ invoice_id: inv.id, amount }],
          ...(method === 'CHEQUE' && chequeNo ? { cheque: { cheque_number: chequeNo, bank_name: '', cheque_date: today, amount } } : {}),
        }).unwrap();
      }
      setCollectTarget(null);
    } catch (e) {
      alert(e?.data?.message ?? 'Failed to record payment');
    } finally {
      setBusyId(null);
    }
  }

  if (!sheetId && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 p-6">
        <Package size={48} className="text-gray-300" />
        <p className="text-gray-500 font-medium">No active loading sheet</p>
        <p className="text-sm text-gray-400 text-center">Ask your manager to assign and load a sheet for you.</p>
      </div>
    );
  }

  const total     = invoices.length;
  const delivered = invoices.filter(i => i.status === 'DELIVERED').length;
  const pending   = invoices.filter(i => ['POSTED', 'PARTIAL', 'OVERDUE'].includes(i.status)).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-gray-900">My Deliveries</h1>
        {sheet && (
          <p className="text-xs text-gray-500 mt-0.5">{sheet.sheet_number} · {sheet.Vehicle?.plate ?? 'No vehicle'}</p>
        )}
      </div>

      {/* Summary strip */}
      {total > 0 && (
        <div className="mx-4 mt-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex gap-4">
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-gray-800">{total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-amber-500">{pending}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-green-600">{delivered}</p>
            <p className="text-xs text-gray-500">Delivered</p>
          </div>
        </div>
      )}

      {/* Invoice list */}
      <div className="px-4 mt-4 flex flex-col gap-3">
        {isLoading && (
          <div className="py-16 flex justify-center">
            <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && invoices.length === 0 && (
          <div className="py-16 text-center text-gray-400">No invoices on this sheet.</div>
        )}

        {invoices.map(inv => {
          const status   = localStatus[inv.id] ?? inv.status;
          const done      = status === 'DELIVERED';
          const cancelled = status === 'CANCELLED';
          const actionable = ['POSTED', 'PARTIAL', 'OVERDUE'].includes(status);
          const busy = busyId === inv.id;
          const expanded = expandedId === inv.id;

          return (
            <div
              key={inv.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Top row — tap to expand */}
              <div
                className="flex items-start justify-between px-4 pt-4 pb-2 cursor-pointer active:bg-gray-50"
                onClick={() => setExpandedId(expanded ? null : inv.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-sm">{inv.invoice_number}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                    <User size={12} className="shrink-0" />
                    <span className="truncate">{inv.Customer?.name}</span>
                  </div>
                  {inv.Customer?.address && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                      <MapPin size={11} className="shrink-0" />
                      <span className="truncate">{inv.Customer.address}</span>
                    </div>
                  )}
                  {inv.Order?.latitude && inv.Order?.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${inv.Order.latitude},${inv.Order.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 mt-1 text-sm font-semibold text-white px-3 py-1.5 rounded-xl active:opacity-70"
                      style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}
                    >
                      <Navigation size={13} /> Directions
                    </a>
                  )}
                </div>
                <div className="text-right ml-3 shrink-0 flex flex-col items-end">
                  <p className="text-sm font-bold text-gray-800">
                    {Number(inv.total_amount).toLocaleString('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 })}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <span>{inv.Lines?.length ?? 0} items</span>
                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </div>
                </div>
              </div>

              {/* Expanded line items */}
              {expanded && inv.Lines?.length > 0 && (
                <div className="mx-4 mb-3 space-y-2">
                  {/* Free items reminder banner */}
                  {inv.Lines.some(l => parseFloat(l.free_quantity ?? 0) > 0) && (
                    <div className="rounded-xl bg-amber-50 border border-amber-300 px-3 py-2.5">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1.5">⚠️ Hand Over Free Items</p>
                      {inv.Lines.filter(l => parseFloat(l.free_quantity ?? 0) > 0).map(l => (
                        <div key={l.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-amber-900 truncate">{l.Product?.name}</span>
                          <span className="font-bold text-amber-700 ml-2 flex-shrink-0">× {parseFloat(l.free_quantity)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Regular line items table */}
                  <div className="rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto_auto] text-[10px] font-semibold text-gray-400 uppercase px-3 py-2 border-b border-gray-100">
                      <span>Product</span>
                      <span className="text-right pr-4">Qty</span>
                      <span className="text-right">Total</span>
                    </div>
                    {inv.Lines.map((line, i) => {
                      const lineTotal = parseFloat(line.line_total ?? 0) || parseFloat(line.unit_price ?? 0) * parseFloat(line.quantity ?? 0);
                      const freeQty   = parseFloat(line.free_quantity ?? 0);
                      return (
                        <div
                          key={line.id}
                          className={`px-3 py-2 text-sm ${i < inv.Lines.length - 1 ? 'border-b border-gray-100' : ''}`}
                        >
                          <div className="grid grid-cols-[1fr_auto_auto] items-center">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 truncate">{line.Product?.name ?? `Product #${line.product_id ?? '?'}`}</p>
                              {line.Product?.sku && <p className="text-xs text-gray-400">{line.Product.sku}</p>}
                            </div>
                            <span className="text-right pr-4 text-gray-600">{parseFloat(line.quantity ?? 0)}</span>
                            <span className="text-right text-gray-700 font-medium">
                              {lineTotal.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          {freeQty > 0 && (
                            <p className="text-xs text-green-600 font-semibold mt-0.5">+{freeQty} free</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {actionable && !done && !cancelled && (
                <div className="px-4 pb-4 pt-1 space-y-2">
                  <div className="flex gap-2">
                    <button
                      disabled={busy}
                      onClick={() => handleDeliver(inv)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      <CheckCircle size={15} />
                      {busy ? 'Saving…' : 'Delivered'}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => setCancelTarget(inv)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-semibold border border-red-100 disabled:opacity-50"
                    >
                      <XCircle size={15} />
                      Cancel
                    </button>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() => setCollectTarget(inv)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold disabled:opacity-50"
                  >
                    <Banknote size={15} /> Collect Payment
                  </button>
                </div>
              )}

              {done && (
                <div className="px-4 pb-3 pt-1 flex flex-col gap-2">
                  <span className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1.5 rounded-full w-full">
                    <CheckCircle size={11} />
                    Delivered
                    {inv.delivered_at && (
                      <span className="font-normal text-amber-600">
                        · {new Date(inv.delivered_at).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setCollectTarget(inv)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold"
                  >
                    <Banknote size={14} /> Collect Payment
                  </button>
                </div>
              )}

              {cancelled && (
                <div className="px-4 pb-4 pt-1">
                  <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                    <XCircle size={15} />
                    Cancelled
                  </div>
                  {inv.notes && (
                    <p className="text-xs text-gray-400 mt-0.5 ml-5">{inv.notes}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cancel modal */}
      {cancelTarget && (
        <CancelModal
          invoice={cancelTarget}
          onConfirm={handleCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {/* Collect payment modal */}
      {collectTarget && (
        <CollectModal
          invoice={collectTarget}
          onConfirm={handleCollect}
          onClose={() => setCollectTarget(null)}
        />
      )}
    </div>
  );
}
