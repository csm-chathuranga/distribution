import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, CreditCard, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetOpenGRNsQuery, useCreateSupplierPaymentMutation } from '../../api/purchasingApi';
import { useGetSuppliersQuery } from '../../api/suppliersApi';
import { useGetAccountsQuery } from '../../api/financeApi';
import { fmtCurrency, fmtDate, today } from '../../utils/format';

const METHODS = ['CASH', 'CHEQUE', 'BANK_TRANSFER'];

export default function SupplierPaymentCreate() {
  const navigate = useNavigate();

  const [supplierId, setSupplierId]   = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [method, setMethod]           = useState('BANK_TRANSFER');
  const [reference, setReference]     = useState('');
  const [notes, setNotes]             = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [allocations, setAllocations] = useState({}); // { grn_id: amount_string }

  const { data: suppliersData } = useGetSuppliersQuery({});
  const { data: openGRNs = [], isFetching: loadingGRNs } = useGetOpenGRNsQuery(supplierId, { skip: !supplierId });
  const { data: accountsData } = useGetAccountsQuery({ type: 'ASSET' });
  const [createPayment, { isLoading: saving }] = useCreateSupplierPaymentMutation();

  const suppliers = suppliersData?.data || [];
  const accounts  = accountsData?.data || accountsData || [];

  // Reset allocations when supplier changes
  useEffect(() => { setAllocations({}); }, [supplierId]);

  const totalAllocated = Object.values(allocations).reduce((s, v) => s + parseFloat(v || 0), 0);

  const setAlloc = (grnId, value) =>
    setAllocations(prev => ({ ...prev, [grnId]: value }));

  const payFull = (grn) =>
    setAlloc(grn.id, String(parseFloat(grn.balance_due).toFixed(2)));

  const payAll = () => {
    const next = {};
    openGRNs.forEach(g => { next[g.id] = String(parseFloat(g.balance_due).toFixed(2)); });
    setAllocations(next);
  };

  const clearAlloc = (grnId) =>
    setAllocations(prev => { const n = { ...prev }; delete n[grnId]; return n; });

  const activeAllocations = openGRNs.filter(g => parseFloat(allocations[g.id] || 0) > 0);

  const handleSubmit = async () => {
    if (!supplierId) { toast.error('Select a supplier'); return; }
    if (!paymentDate) { toast.error('Enter payment date'); return; }
    if (activeAllocations.length === 0) { toast.error('Allocate at least one GRN'); return; }

    // Validate each allocation ≤ balance
    for (const g of openGRNs) {
      const amt = parseFloat(allocations[g.id] || 0);
      if (amt > 0 && amt > parseFloat(g.balance_due) + 0.01) {
        toast.error(`Allocation for ${g.grn_number} exceeds balance`);
        return;
      }
    }

    try {
      await createPayment({
        supplier_id: supplierId,
        payment_date: paymentDate,
        payment_method: method,
        reference: reference || undefined,
        notes: notes || undefined,
        bank_account_id: bankAccountId || undefined,
        allocations: activeAllocations.map(g => ({
          grn_id: g.id,
          amount_allocated: parseFloat(allocations[g.id]),
        })),
      }).unwrap();
      toast.success('Payment recorded successfully');
      navigate('/supplier-payments');
    } catch (e) {
      toast.error(e.data?.message || 'Failed to create payment');
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/supplier-payments')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Back
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Supplier Payment</h1>
          <p className="text-sm text-gray-500">Record a payment against outstanding GRNs</p>
        </div>
      </div>

      {/* Payment details */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Payment Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Supplier <span className="text-red-500">*</span></label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="input">
              <option value="">Select supplier…</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Payment Date <span className="text-red-500">*</span></label>
            <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Payment Method <span className="text-red-500">*</span></label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="input">
              {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Reference (Cheque / Transfer No.)</label>
            <input type="text" value={reference} onChange={e => setReference(e.target.value)}
              placeholder="e.g. CHQ-001234" className="input" />
          </div>
          <div>
            <label className="label">Bank / Cash Account (for journal entry)</label>
            <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)} className="input">
              <option value="">Select account (optional)…</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes" className="input" />
          </div>
        </div>
      </div>

      {/* GRN Allocation */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Allocate to GRNs</h2>
            <p className="text-xs text-gray-400 mt-0.5">Select a supplier above to see outstanding GRNs</p>
          </div>
          {openGRNs.length > 0 && (
            <button onClick={payAll} className="btn-secondary text-xs px-3 py-1.5 rounded-lg">
              Pay All Outstanding
            </button>
          )}
        </div>

        {!supplierId ? (
          <div className="py-10 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
            <AlertCircle size={24} className="text-gray-300" />
            Select a supplier to load outstanding GRNs
          </div>
        ) : loadingGRNs ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loading GRNs…</div>
        ) : openGRNs.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            No outstanding GRNs for this supplier.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs">
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">GRN #</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Date</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Supplier Invoice</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">GRN Total</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Paid</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Balance</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Allocate</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Pay Full</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {openGRNs.map(grn => {
                  const allocated = parseFloat(allocations[grn.id] || 0);
                  const balance   = parseFloat(grn.balance_due);
                  const overAlloc = allocated > balance + 0.01;
                  return (
                    <tr key={grn.id} className={`hover:bg-gray-50 ${allocated > 0 ? 'bg-green-50' : ''}`}>
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-gray-800">{grn.grn_number}</td>
                      <td className="px-3 py-2.5 text-gray-600">{fmtDate(grn.grn_date)}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{grn.supplier_invoice_number || '—'}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-700">{fmtCurrency(grn.total_amount)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-green-600">{fmtCurrency(grn.amount_paid)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-red-600">{fmtCurrency(balance)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            max={balance}
                            step="0.01"
                            value={allocations[grn.id] ?? ''}
                            onChange={e => setAlloc(grn.id, e.target.value)}
                            className={`input input-sm w-32 text-right font-mono ${overAlloc ? 'border-red-400 bg-red-50' : ''}`}
                            placeholder="0.00"
                          />
                          {allocated > 0 && (
                            <button onClick={() => clearAlloc(grn.id)} className="text-gray-400 hover:text-red-500">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        {overAlloc && <p className="text-xs text-red-500 mt-0.5 text-right">Exceeds balance</p>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => payFull(grn)} className="text-xs text-primary-600 hover:underline font-medium">
                          Full
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer summary + submit */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1 text-sm">
            <div className="flex gap-6">
              <span className="text-gray-500">GRNs allocated:</span>
              <span className="font-semibold text-gray-800">{activeAllocations.length}</span>
            </div>
            <div className="flex gap-6">
              <span className="text-gray-500">Total payment:</span>
              <span className="text-xl font-bold text-primary-600 font-mono">{fmtCurrency(totalAllocated)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/supplier-payments')} className="btn-secondary px-5 py-2 rounded-lg text-sm font-medium">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || totalAllocated <= 0}
              className="btn-primary px-6 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              <CreditCard size={16} />
              {saving ? 'Recording…' : `Record Payment ${totalAllocated > 0 ? '— ' + fmtCurrency(totalAllocated) : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
