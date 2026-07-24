import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { BookOpen, AlertTriangle } from 'lucide-react';
import { useGetAccountsQuery } from '../../api/financeApi';
import { useSetOpeningBalanceMutation } from '../../api/financeApi';
import { fmtCurrency } from '../../utils/format';

const TYPE_ORDER = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
const TYPE_LABELS = { ASSET: 'Assets', LIABILITY: 'Liabilities', EQUITY: 'Equity', REVENUE: 'Revenue', EXPENSE: 'Expenses' };

export default function OpeningBalance() {
  const { data, isLoading } = useGetAccountsQuery({ is_active: 'true' });
  const [setOpeningBalance, { isLoading: saving }] = useSetOpeningBalanceMutation();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { date: new Date().toISOString().slice(0, 10), notes: 'Opening balances' },
  });

  const [amounts, setAmounts] = useState({});

  const leafAccounts = useMemo(() => {
    const all = Array.isArray(data) ? data : (data?.data || []);
    const hasChildren = new Set(all.map(a => a.parent_id).filter(Boolean));
    return all.filter(a => !hasChildren.has(a.id));
  }, [data]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const type of TYPE_ORDER) groups[type] = [];
    for (const acc of leafAccounts) {
      if (groups[acc.type]) groups[acc.type].push(acc);
    }
    return groups;
  }, [leafAccounts]);

  const totalDebit = Object.values(amounts).reduce((s, v) => s + parseFloat(v?.debit || 0), 0);
  const totalCredit = Object.values(amounts).reduce((s, v) => s + parseFloat(v?.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const setAmount = (id, field, value) => {
    setAmounts(prev => ({
      ...prev,
      [id]: {
        debit: field === 'debit' ? value : (prev[id]?.debit || ''),
        credit: field === 'credit' ? value : (prev[id]?.credit || ''),
      },
    }));
  };

  const onSubmit = async (formData) => {
    const entries = leafAccounts
      .map(acc => ({
        account_id: acc.id,
        debit: parseFloat(amounts[acc.id]?.debit || 0),
        credit: parseFloat(amounts[acc.id]?.credit || 0),
      }))
      .filter(e => e.debit > 0 || e.credit > 0);

    if (entries.length === 0) return toast.error('Enter at least one amount');
    if (!isBalanced) return toast.error('Debits must equal credits');

    try {
      await setOpeningBalance({ ...formData, entries }).unwrap();
      toast.success('Opening balances posted successfully');
      setAmounts({});
    } catch (e) { toast.error(e.data?.message || 'Failed to post'); }
  };

  if (isLoading) return <div className="card p-8 text-center text-gray-500">Loading accounts...</div>;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
            <BookOpen size={18} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Opening Balance</h1>
            <p className="text-sm text-gray-500">Set initial account balances when starting the system</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" {...register('date', { required: true })} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input type="text" className="input" {...register('notes')} />
            </div>
          </div>

          {TYPE_ORDER.map(type => {
            const accs = grouped[type];
            if (!accs || accs.length === 0) return null;
            return (
              <div key={type} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 pb-1 border-b border-gray-200">
                  {TYPE_LABELS[type]}
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="text-left py-1.5 w-24">Code</th>
                      <th className="text-left py-1.5">Account Name</th>
                      <th className="text-right py-1.5 w-40">Debit (LKR)</th>
                      <th className="text-right py-1.5 w-40">Credit (LKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accs.map(acc => (
                      <tr key={acc.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-1.5 font-mono text-xs text-gray-500">{acc.code}</td>
                        <td className="py-1.5 text-gray-800">{acc.name}</td>
                        <td className="py-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={amounts[acc.id]?.debit || ''}
                            onChange={e => setAmount(acc.id, 'debit', e.target.value)}
                            className="input text-right w-full py-1 text-sm"
                          />
                        </td>
                        <td className="py-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={amounts[acc.id]?.credit || ''}
                            onChange={e => setAmount(acc.id, 'credit', e.target.value)}
                            className="input text-right w-full py-1 text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-3 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8 text-sm font-semibold">
                <span>Total Debit: <span className="text-blue-700">{fmtCurrency(totalDebit)}</span></span>
                <span>Total Credit: <span className="text-blue-700">{fmtCurrency(totalCredit)}</span></span>
                {!isBalanced && totalDebit + totalCredit > 0 && (
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <AlertTriangle size={14} /> Difference: {fmtCurrency(Math.abs(totalDebit - totalCredit))}
                  </span>
                )}
                {isBalanced && totalDebit > 0 && (
                  <span className="text-green-600 font-medium">Balanced</span>
                )}
              </div>
              <button
                type="submit"
                disabled={saving || !isBalanced || totalDebit === 0}
                className="btn-primary"
              >
                {saving ? 'Posting...' : 'Post Opening Balance'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
