import { useState } from 'react';
import { CheckCircle, XCircle, Package, User, MapPin, ChevronDown, ChevronUp, Banknote } from 'lucide-react';
import { useGetActiveSheetQuery, useGetLoadingSheetQuery, useCreateReceiptMutation } from '../../api/salesApi';
import { useDeliverInvoiceMutation, useCancelInvoiceMutation } from '../../api/salesApi';

const STATUS_BADGE = {
  POSTED:    'bg-blue-100 text-blue-700',
  PARTIAL:   'bg-yellow-100 text-yellow-700',
  OVERDUE:   'bg-red-100 text-red-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

function CollectModal({ invoice, onConfirm, onClose }) {
  const [amount, setAmount] = useState(String(parseFloat(invoice.total_amount) || ''));
  const [method, setMethod] = useState('CASH');
  const [chequeNo, setChequeNo] = useState('');

  const valid = parseFloat(amount) > 0 && (method !== 'CHEQUE' || chequeNo.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/50"
      onClick={onClose}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-800 mb-1">Collect Payment</h3>
        <p className="text-sm text-gray-500 mb-4">{invoice.invoice_number} — {invoice.Customer?.name}</p>

        <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
        <div className="flex gap-2 mb-4">
          {['CASH', 'CHEQUE', 'BANK_TRANSFER'].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${method === m ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {m === 'BANK_TRANSFER' ? 'Transfer' : m.charAt(0) + m.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR) *</label>
        <input
          type="number"
          inputMode="decimal"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 mb-3"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          autoFocus
        />

        {method === 'CHEQUE' && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cheque Number *</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 mb-3"
              value={chequeNo}
              onChange={e => setChequeNo(e.target.value)}
              placeholder="e.g. 001234"
            />
          </>
        )}

        <div className="flex gap-3 mt-2">
          <button className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600" onClick={onClose}>
            Back
          </button>
          <button
            disabled={!valid}
            className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-bold disabled:opacity-40"
            onClick={() => onConfirm({ amount: parseFloat(amount), method, chequeNo: chequeNo.trim() || null })}
          >
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
    if (delivering || cancelling) return;
    setBusyId(inv.id);
    try {
      await deliverInvoice(inv.id).unwrap();
      setLocalStatus(s => ({ ...s, [inv.id]: 'DELIVERED' }));
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

  async function handleCollect({ amount, method, chequeNo }) {
    if (!collectTarget) return;
    const inv = collectTarget;
    setBusyId(inv.id);
    try {
      await createReceipt({
        customer_id:    inv.customer_id,
        receipt_date:   new Date().toISOString().slice(0, 10),
        payment_method: method,
        amount,
        notes:          `Collected on delivery — ${inv.invoice_number}`,
        allocations:    [{ invoice_id: inv.id, amount }],
        ...(method === 'CHEQUE' && chequeNo ? { cheque: { cheque_number: chequeNo, bank_name: '', cheque_date: new Date().toISOString().slice(0, 10), amount } } : {}),
      }).unwrap();
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
                <div className="mx-4 mb-3 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto] text-[10px] font-semibold text-gray-400 uppercase px-3 py-2 border-b border-gray-100">
                    <span>Product</span>
                    <span className="text-right pr-4">Qty</span>
                    <span className="text-right">Total</span>
                  </div>
                  {inv.Lines.map((line, i) => {
                    const lineTotal = parseFloat(line.line_total ?? 0) || parseFloat(line.unit_price ?? 0) * parseFloat(line.quantity ?? 0);
                    return (
                      <div
                        key={line.id}
                        className={`grid grid-cols-[1fr_auto_auto] px-3 py-2 text-sm ${i < inv.Lines.length - 1 ? 'border-b border-gray-100' : ''}`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{line.Product?.name ?? `Product #${line.product_id ?? '?'}`}</p>
                          {line.Product?.sku && <p className="text-xs text-gray-400">{line.Product.sku}</p>}
                        </div>
                        <span className="text-right pr-4 text-gray-600 self-center">{parseFloat(line.quantity ?? 0)}</span>
                        <span className="text-right text-gray-700 font-medium self-center">
                          {lineTotal.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action buttons */}
              {actionable && (
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
                <div className="px-4 pb-4 pt-1">
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium mb-2">
                    <CheckCircle size={15} />
                    Delivered
                    {inv.delivered_at && (
                      <span className="text-xs text-gray-400 ml-1">
                        {new Date(inv.delivered_at).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setCollectTarget(inv)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold"
                  >
                    <Banknote size={15} /> Collect Payment
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
