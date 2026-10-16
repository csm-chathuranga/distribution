import { useState } from 'react';
import { CreditCard, ChevronDown, ChevronUp, Banknote, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetOutstandingCustomersQuery } from '../../api/customersApi';
import { useCreateReceiptMutation } from '../../api/salesApi';
import { fmtCurrency } from '../../utils/format';

const METHODS = [
  { value: 'CASH',     label: 'Cash' },
  { value: 'CHEQUE',   label: 'Cheque' },
  { value: 'TRANSFER', label: 'Transfer' },
];

function CollectModal({ customer, onClose }) {
  const [method, setMethod]   = useState('CASH');
  const [amount, setAmount]   = useState(String(parseFloat(customer.outstanding_balance).toFixed(2)));
  const [note,   setNote]     = useState('');
  const [createReceipt, { isLoading }] = useCreateReceiptMutation();

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    try {
      await createReceipt({
        customer_id:    customer.id,
        amount:         amt,
        payment_method: method,
        receipt_date:   new Date().toISOString().slice(0, 10),
        notes:          note || undefined,
      }).unwrap();
      toast.success(`Payment of ${fmtCurrency(amt)} collected`);
      onClose();
    } catch (e) {
      toast.error(e.data?.message || 'Failed to save receipt');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Collect Payment</p>
            <p className="text-base font-bold text-gray-900">{customer.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="p-3 bg-amber-50 rounded-xl text-center">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Outstanding</p>
          <p className="text-xl font-bold text-amber-700">{fmtCurrency(customer.outstanding_balance)}</p>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Amount (LKR)</label>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="input w-full text-center text-lg font-bold"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Method</label>
          <div className="flex gap-2">
            {METHODS.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  method === m.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. partial payment"
            className="input w-full text-sm"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-50 active:opacity-80 transition-opacity"
        >
          {isLoading ? 'Saving…' : 'Confirm Collection'}
        </button>
      </div>
    </div>
  );
}

export default function DriverPayments() {
  const { data: customers = [], isLoading } = useGetOutstandingCustomersQuery(50);
  const [expanded, setExpanded]   = useState(null);
  const [collectTarget, setCollectTarget] = useState(null);

  const toggle = (id) => setExpanded(p => p === id ? null : id);

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-24">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-lg font-bold text-gray-900">Due Collections</h1>
        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
          {customers.length} customers
        </span>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="skeleton h-4 w-36 mb-2" />
              <div className="skeleton h-3 w-24" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && customers.length === 0 && (
        <div className="card p-10 text-center">
          <CreditCard size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-400 text-sm">No outstanding balances</p>
        </div>
      )}

      <div className="space-y-3">
        {customers.map(c => {
          const isOpen = expanded === c.id;
          return (
            <div key={c.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(c.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{c.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.Route?.name && (
                      <span className="text-xs text-gray-400">{c.Route.name}</span>
                    )}
                    {c.Route?.SalesRep?.name && (
                      <>
                        <span className="text-gray-300 text-xs">·</span>
                        <span className="text-xs text-blue-500">{c.Route.SalesRep.name}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-amber-600">{fmtCurrency(c.outstanding_balance)}</span>
                  {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-3">
                  {c.phone && (
                    <p className="text-xs text-gray-500 mb-3">
                      <span className="font-medium">Phone:</span> {c.phone}
                    </p>
                  )}
                  <button
                    onClick={() => setCollectTarget(c)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold active:opacity-80 transition-opacity"
                  >
                    <Banknote size={15} /> Collect Payment
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {collectTarget && (
        <CollectModal
          customer={collectTarget}
          onClose={() => setCollectTarget(null)}
        />
      )}
    </div>
  );
}
