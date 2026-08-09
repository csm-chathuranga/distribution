import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Printer, Truck, MapPin, Banknote, CreditCard } from 'lucide-react';
import MapModal from '../../components/MapModal';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { useGetInvoiceQuery, usePostInvoiceMutation, useCreateReceiptMutation, useGetCustomerAdvanceQuery, useAllocateReceiptMutation } from '../../api/salesApi';
import { useGetCompanyQuery } from '../../api/reportsApi';
import { usePermission } from '../../hooks/usePermission';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import InvoicePrint from '../../components/print/InvoicePrint';
import { printComponent } from '../../utils/print';
import { fmtCurrency, fmtDate, today } from '../../utils/format';

function CollectPaymentModal({ invoice, onClose }) {
  const balance = parseFloat(invoice.balance_due || 0);
  const [amount,  setAmount]  = useState(String(balance > 0 ? balance : ''));
  const [method,  setMethod]  = useState('CASH');
  const [cheque,  setCheque]  = useState({ cheque_number: '', bank: '', due_date: '' });
  const [notes,   setNotes]   = useState('');
  const [createReceipt, { isLoading }] = useCreateReceiptMutation();

  const amountNum = parseFloat(amount) || 0;

  const handleSubmit = async () => {
    if (amountNum <= 0) return toast.error('Enter a valid amount');
    if (method === 'CHEQUE' && !cheque.cheque_number) return toast.error('Cheque number required');
    try {
      const payload = {
        customer_id:    invoice.customer_id,
        company_id:     invoice.company_id,
        branch_id:      invoice.branch_id,
        amount:         amountNum,
        payment_method: method,
        receipt_date:   today(),
        notes,
        allocations: [{ invoice_id: invoice.id, amount: amountNum }],
      };
      if (method === 'CHEQUE') payload.cheque = cheque;
      await createReceipt(payload).unwrap();
      toast.success('Payment recorded');
      onClose();
    } catch (e) {
      toast.error(e.data?.message || 'Failed to record payment');
    }
  };

  return (
    <Modal open title="Collect Payment" onClose={onClose}>
      <div className="space-y-4">
        {/* Amount */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Amount (LKR)</label>
          <input
            type="number" step="0.01" value={amount}
            onChange={e => setAmount(e.target.value)}
            onFocus={e => e.target.select()}
            className="input w-full text-right text-lg font-bold"
            placeholder="0.00"
          />
          {balance > 0 && amountNum < balance && (
            <p className="text-xs text-amber-500 mt-1">Partial payment — {fmtCurrency(balance - amountNum)} will remain outstanding</p>
          )}
          {balance > 0 && amountNum >= balance && (
            <p className="text-xs text-green-600 mt-1">Full payment — invoice will be marked PAID</p>
          )}
        </div>

        {/* Method selector */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'CASH',   label: 'Cash',   icon: <Banknote size={16} /> },
              { key: 'CHEQUE', label: 'Cheque', icon: <CreditCard size={16} /> },
            ].map(m => (
              <button key={m.key} type="button" onClick={() => setMethod(m.key)}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                  method === m.key
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cheque details */}
        {method === 'CHEQUE' && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Cheque Number *</label>
              <input type="text" value={cheque.cheque_number}
                onChange={e => setCheque(p => ({ ...p, cheque_number: e.target.value }))}
                className="input w-full" placeholder="e.g. 001234" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Bank</label>
                <input type="text" value={cheque.bank}
                  onChange={e => setCheque(p => ({ ...p, bank: e.target.value }))}
                  className="input w-full" placeholder="e.g. BOC" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Cheque Date</label>
                <input type="date" value={cheque.due_date}
                  onChange={e => setCheque(p => ({ ...p, due_date: e.target.value }))}
                  className="input w-full" />
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Notes (optional)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            className="input w-full" placeholder="e.g. received from owner" />
        </div>

        <div className="flex gap-3 pt-2 border-t">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={isLoading}
            className="btn bg-green-600 text-white hover:bg-green-700 flex-1 disabled:opacity-50 font-semibold">
            {isLoading ? 'Recording…' : `Record · ${fmtCurrency(amountNum)}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function InvoiceDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const canCreate = usePermission('sales.create');
  const canPost   = usePermission('sales.approve');
  const [confirmPost,   setConfirmPost]   = useState(false);
  const [showPayment,   setShowPayment]   = useState(false);
  const [mapOpen,       setMapOpen]       = useState(false);
  const [showAdvance,   setShowAdvance]   = useState(false);
  const [applyReceiptId, setApplyReceiptId] = useState('');
  const [applyAmount,    setApplyAmount]    = useState('');

  const { data: invoice, isLoading, error } = useGetInvoiceQuery(id);
  const { data: company } = useGetCompanyQuery();
  const { data: advance } = useGetCustomerAdvanceQuery(invoice?.customer_id, { skip: !invoice?.customer_id });
  const [postInvoice,    { isLoading: posting }]    = usePostInvoiceMutation();
  const [allocateReceipt, { isLoading: allocating }] = useAllocateReceiptMutation();
  const handlePrint = () => printComponent(<InvoicePrint invoice={invoice} company={company} />);

  const handlePost = async () => {
    try {
      await postInvoice(id).unwrap();
      toast.success('Invoice posted');
      setConfirmPost(false);
    } catch (e) { toast.error(e.data?.message || 'Failed to post'); }
  };

  const handleApplyAdvance = async () => {
    if (!applyReceiptId || !applyAmount || parseFloat(applyAmount) <= 0) return;
    try {
      await allocateReceipt({ id: applyReceiptId, invoice_id: parseInt(id), amount: parseFloat(applyAmount) }).unwrap();
      toast.success('Advance applied to invoice');
      setShowAdvance(false); setApplyReceiptId(''); setApplyAmount('');
    } catch (e) { toast.error(e.data?.message || 'Failed to apply'); }
  };

  if (isLoading) return (
    <div className="card p-8 flex items-center justify-center text-gray-400">
      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-3" /> Loading…
    </div>
  );

  if (error || !invoice) return (
    <div className="card p-8 text-center text-gray-500">
      Invoice not found. <Link to="/invoices" className="text-primary-600 hover:underline">Back to list</Link>
    </div>
  );

  const lines   = invoice.Lines || [];
  const paid    = parseFloat(invoice.paid_amount || 0);
  const balance = parseFloat(invoice.balance_due || 0);
  const overdue = balance > 0 && invoice.due_date && new Date(invoice.due_date) < new Date();

  const isPosted    = ['POSTED', 'PARTIAL', 'OVERDUE'].includes(invoice.status);
  const hasBalance  = balance > 0;
  const showPostBtn    = invoice.status === 'DRAFT' && canPost; // fallback — normally never shown
  const showPayBtn     = isPosted && hasBalance && canCreate;
  const showDeliverBtn = isPosted && canCreate && !invoice.loading_sheet_id;
  const showStickyBar  = showPostBtn || showPayBtn || showDeliverBtn;

  return (
    <div className={`space-y-4 max-w-2xl mx-auto md:max-w-4xl ${showStickyBar ? 'pb-28 md:pb-6' : 'pb-6'}`}>

      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 active:opacity-70">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5">
            <Printer size={15} /> Print
          </button>
          {showPostBtn && (
            <button onClick={() => setConfirmPost(true)}
              className="hidden md:flex items-center gap-1.5 btn btn-primary text-sm py-1.5">
              <CheckCircle size={15} /> Post Invoice
            </button>
          )}
          {showPayBtn && (
            <button onClick={() => setShowPayment(true)}
              className="hidden md:flex items-center gap-1.5 text-sm py-1.5 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors">
              <Banknote size={15} /> Collect Payment
            </button>
          )}
          {showDeliverBtn && (
            <button onClick={() => navigate(`/deliveries/new?invoice_id=${invoice.id}`)}
              className="hidden md:flex items-center gap-1.5 text-sm py-1.5 px-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors">
              <Truck size={15} /> Assign to Driver
            </button>
          )}
        </div>
      </div>

      {/* Status hero */}
      <div className={`card p-5 border-l-4 ${
        invoice.status === 'PAID'    ? 'border-green-500 bg-green-50'  :
        invoice.status === 'POSTED'  ? 'border-blue-500 bg-blue-50'   :
        invoice.status === 'PARTIAL' ? 'border-amber-500 bg-amber-50' :
        invoice.status === 'OVERDUE' ? 'border-red-500 bg-red-50'     :
        'border-gray-300 bg-white'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <StatusBadge status={invoice.status} />
              <span className="text-xs font-mono text-gray-500">{invoice.invoice_number}</span>
              {invoice.VanSheet && (
                <Link to={`/loading-sheets/${invoice.VanSheet.id}`}
                  className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full hover:bg-blue-100">
                  Van · {invoice.VanSheet.sheet_number}
                </Link>
              )}
            </div>
            <h1 className="text-lg font-bold text-gray-900 leading-snug">{invoice.Customer?.name || '—'}</h1>
            {invoice.Customer?.customer_type && (
              <p className="text-xs text-gray-500 mt-0.5">{invoice.Customer.customer_type}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-gray-900 font-mono">{fmtCurrency(invoice.total_amount)}</p>
            {balance > 0 && (
              <p className={`text-sm font-semibold mt-0.5 ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
                Due: {fmtCurrency(balance)}
              </p>
            )}
            {balance === 0 && paid > 0 && (
              <p className="text-sm text-green-600 font-semibold mt-0.5">Fully paid</p>
            )}
          </div>
        </div>
      </div>

      {/* Advance credit banner */}
      {advance?.total > 0 && balance > 0 && (
        <div className="card p-4 border-l-4 border-violet-400 bg-violet-50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-violet-800">
                Advance Credit Available: {fmtCurrency(advance.total)}
              </p>
              <p className="text-xs text-violet-600 mt-0.5">This customer has unallocated payments that can be applied to this invoice.</p>
            </div>
            <button onClick={() => setShowAdvance(v => !v)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
              Apply
            </button>
          </div>

          {showAdvance && (
            <div className="mt-3 pt-3 border-t border-violet-200 space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-violet-700">Select receipt to apply from:</p>
                {advance.receipts.map(r => (
                  <label key={r.id} className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${applyReceiptId === String(r.id) ? 'border-violet-400 bg-violet-100' : 'border-violet-200 bg-white hover:bg-violet-50'}`}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="advReceipt" value={r.id}
                        checked={applyReceiptId === String(r.id)}
                        onChange={() => { setApplyReceiptId(String(r.id)); setApplyAmount(Math.min(r.unallocated, balance).toFixed(2)); }}
                        className="accent-violet-600" />
                      <span className="text-xs font-mono text-gray-700">{r.receipt_number}</span>
                      <span className="text-xs text-gray-500">{fmtDate(r.receipt_date)}</span>
                    </div>
                    <span className="text-xs font-semibold text-violet-700">{fmtCurrency(r.unallocated)} avail.</span>
                  </label>
                ))}
              </div>
              {applyReceiptId && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-violet-700 mb-1">Amount to apply (max {fmtCurrency(Math.min(advance.receipts.find(r => String(r.id) === applyReceiptId)?.unallocated || 0, balance))})</p>
                    <input type="number" step="0.01" min="0.01"
                      max={Math.min(advance.receipts.find(r => String(r.id) === applyReceiptId)?.unallocated || 0, balance)}
                      value={applyAmount} onChange={e => setApplyAmount(e.target.value)}
                      className="input text-sm py-1.5 w-full" />
                  </div>
                  <button onClick={handleApplyAdvance} disabled={allocating || !applyAmount}
                    className="mt-5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                    {allocating ? 'Applying…' : 'Confirm'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dates & meta */}
      <div className="card p-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Invoice Date</p>
          <p className="font-semibold text-gray-800 text-sm">{fmtDate(invoice.invoice_date)}</p>
        </div>
        {invoice.due_date && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Due Date</p>
            <p className={`font-semibold text-sm ${overdue ? 'text-red-600' : 'text-gray-800'}`}>{fmtDate(invoice.due_date)}</p>
          </div>
        )}
        {invoice.payment_terms && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Payment Terms</p>
            <p className="font-semibold text-gray-800 text-sm">{invoice.payment_terms}</p>
          </div>
        )}
        {invoice.Customer?.code && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Customer Code</p>
            <p className="font-semibold text-gray-800 text-sm font-mono">{invoice.Customer.code}</p>
          </div>
        )}
      </div>

      {/* Financial summary */}
      <div className="card p-4 space-y-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Summary</p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-mono">{fmtCurrency(invoice.subtotal)}</span>
        </div>
        {parseFloat(invoice.vat_amount) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">VAT</span>
            <span className="font-mono">{fmtCurrency(invoice.vat_amount)}</span>
          </div>
        )}
        {parseFloat(invoice.discount_amount || 0) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Discount</span>
            <span className="text-red-600 font-mono">−{fmtCurrency(invoice.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold border-t border-gray-100 pt-2">
          <span>Total</span>
          <span className="font-mono">{fmtCurrency(invoice.total_amount)}</span>
        </div>
        {paid > 0 && (
          <div className="flex justify-between text-green-600 text-sm">
            <span>Paid</span>
            <span className="font-mono">{fmtCurrency(paid)}</span>
          </div>
        )}
        {balance > 0 && (
          <div className={`flex justify-between items-center px-3 py-2.5 rounded-xl border mt-1 ${
            overdue ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <span className={`font-semibold text-sm ${overdue ? 'text-red-700' : 'text-amber-700'}`}>
              {overdue ? 'Overdue Balance' : 'Balance Due'}
            </span>
            <span className={`font-bold font-mono text-base ${overdue ? 'text-red-700' : 'text-amber-700'}`}>
              {fmtCurrency(balance)}
            </span>
          </div>
        )}
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="card p-4 bg-gray-50">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-gray-700">{invoice.notes}</p>
        </div>
      )}

      {/* GPS navigation */}
      {invoice.latitude && invoice.longitude && (
        <button onClick={() => setMapOpen(true)}
          className="card p-4 w-full text-left flex items-center gap-4 hover:bg-blue-50 active:bg-blue-100 transition-colors border border-blue-100">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <MapPin size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-blue-900">Navigate to Customer</p>
            <p className="text-xs font-mono text-blue-500 mt-0.5 truncate">
              {parseFloat(invoice.latitude).toFixed(6)}, {parseFloat(invoice.longitude).toFixed(6)}
            </p>
          </div>
          <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0">Go</div>
        </button>
      )}

      {/* Line items */}
      {lines.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Items ({lines.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {lines.map((line, i) => (
              <div key={line.id || i} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm leading-snug">
                    {line.Product?.name || `Product #${line.product_id}`}
                  </p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {[line.Product?.sku, parseFloat(line.vat_rate || 0) > 0 ? `VAT ${parseFloat(line.vat_rate)}%` : null].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-gray-900 font-mono">{fmtCurrency(line.line_total)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {parseFloat(line.quantity)} × {fmtCurrency(line.unit_price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-600">Total</span>
            <span className="font-bold text-gray-900 font-mono">{fmtCurrency(invoice.total_amount)}</span>
          </div>
        </div>
      )}

      {mapOpen && invoice.latitude && invoice.longitude && (
        <MapModal lat={invoice.latitude} lng={invoice.longitude}
          label={invoice.Customer?.name || 'Customer Location'} onClose={() => setMapOpen(false)} />
      )}

      {/* Mobile sticky bar */}
      {showStickyBar && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3 pb-safe space-y-2">
          {showPostBtn && (
            <button onClick={() => setConfirmPost(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-base transition-colors">
              <CheckCircle size={20} /> Post Invoice
            </button>
          )}
          {showPayBtn && (
            <button onClick={() => setShowPayment(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-base transition-colors">
              <Banknote size={20} /> Collect Payment · {fmtCurrency(balance)}
            </button>
          )}
          {showDeliverBtn && (
            <button onClick={() => navigate(`/deliveries/new?invoice_id=${invoice.id}`)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-300 text-gray-700 font-semibold text-sm transition-colors">
              <Truck size={17} /> Assign to Driver
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmPost}
        title="Post Invoice"
        message={`Post ${invoice.invoice_number}? This creates journal entries, deducts stock, and makes it payable.`}
        confirmLabel="Post Invoice"
        onConfirm={handlePost}
        onCancel={() => setConfirmPost(false)}
        loading={posting}
      />

      {showPayment && (
        <CollectPaymentModal invoice={invoice} onClose={() => setShowPayment(false)} />
      )}
    </div>
  );
}
