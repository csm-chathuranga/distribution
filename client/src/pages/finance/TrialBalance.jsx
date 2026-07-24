import { useState, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Download, RefreshCw, Scale } from 'lucide-react';
import { useGetTrialBalanceQuery } from '../../api/financeApi';
import PageHeader from '../../components/ui/PageHeader';
import SkeletonTable from '../../components/ui/SkeletonTable';
import { fmtCurrency } from '../../utils/format';

const TYPE_ORDER = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE'];
const TYPE_LABELS = {
  ASSET:     { label: 'Assets',              color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  LIABILITY: { label: 'Liabilities',         color: 'text-rose-700',   bg: 'bg-rose-50',   border: 'border-rose-200'   },
  EQUITY:    { label: 'Equity',              color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  REVENUE:   { label: 'Revenue',             color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200'  },
  COGS:      { label: 'Cost of Goods Sold',  color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200'  },
  EXPENSE:   { label: 'Expenses',            color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
};

function fmt(n) {
  const v = Number(n || 0);
  return v === 0 ? '—' : fmtCurrency(v);
}

function AmtCell({ value, className = '' }) {
  const n = Number(value || 0);
  return (
    <td className={`px-4 py-2.5 text-right font-mono text-sm tabular-nums ${n === 0 ? 'text-gray-300' : 'text-gray-800'} ${className}`}>
      {fmt(n)}
    </td>
  );
}

export default function TrialBalance() {
  const [periodId, setPeriodId] = useState('');
  const { data = [], isLoading, refetch } = useGetTrialBalanceQuery(periodId ? { period_id: periodId } : {});

  // Group and compute
  const { grouped, grandDebit, grandCredit } = useMemo(() => {
    const groups = {};
    let grandDebit = 0, grandCredit = 0;

    data.forEach(row => {
      const net = Number(row.net || 0);
      // Debit balance accounts: ASSET, EXPENSE, COGS → positive net = debit balance
      // Credit balance accounts: LIABILITY, EQUITY, REVENUE → negative net = credit balance
      const debit = net > 0 ? net : 0;
      const credit = net < 0 ? Math.abs(net) : 0;

      grandDebit += debit;
      grandCredit += credit;

      if (!groups[row.type]) groups[row.type] = { rows: [], subtotalDebit: 0, subtotalCredit: 0 };
      groups[row.type].rows.push({ ...row, balanceDebit: debit, balanceCredit: credit });
      groups[row.type].subtotalDebit += debit;
      groups[row.type].subtotalCredit += credit;
    });

    return { grouped: groups, grandDebit, grandCredit };
  }, [data]);

  const isBalanced = Math.abs(grandDebit - grandCredit) < 0.01;
  const diff = Math.abs(grandDebit - grandCredit);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trial Balance"
        subtitle="GL account balances — debit must equal credit"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="btn-secondary flex items-center gap-1.5 text-sm">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={handlePrint} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Download size={14} /> Print
            </button>
          </div>
        }
      />

      {/* Balance indicator */}
      <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border ${isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        {isBalanced
          ? <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
          : <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
        }
        <div className="flex-1">
          <p className={`font-semibold text-sm ${isBalanced ? 'text-green-800' : 'text-red-800'}`}>
            {isBalanced ? 'Ledger is Balanced' : 'Ledger is Out of Balance'}
          </p>
          <p className={`text-xs mt-0.5 ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
            {isBalanced
              ? `Total Debits = Total Credits = ${fmtCurrency(grandDebit)}`
              : `Difference: ${fmtCurrency(diff)} — check for missing or incorrect journal entries`
            }
          </p>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <Scale size={16} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Debits',   value: grandDebit,   color: 'text-blue-700',  bg: 'bg-blue-50',  border: 'border-blue-200'  },
          { label: 'Total Credits',  value: grandCredit,  color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
          { label: 'Net Assets',     value: (grouped['ASSET']?.subtotalDebit || 0) - (grouped['LIABILITY']?.subtotalCredit || 0) - (grouped['EQUITY']?.subtotalCredit || 0), color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
          { label: 'Net Income',     value: (grouped['REVENUE']?.subtotalCredit || 0) - (grouped['COGS']?.subtotalDebit || 0) - (grouped['EXPENSE']?.subtotalDebit || 0), color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border ${c.border} ${c.bg} px-4 py-3`}>
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-base font-bold font-mono ${c.color}`}>{fmtCurrency(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6"><SkeletonTable rows={10} cols={4} /></div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No journal entries found. Post some invoices or GRNs first.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 w-24">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Account Name</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 w-40">Debit (Dr)</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 w-40">Credit (Cr)</th>
                </tr>
              </thead>
              <tbody>
                {TYPE_ORDER.map(type => {
                  const group = grouped[type];
                  if (!group) return null;
                  const meta = TYPE_LABELS[type];
                  return (
                    <>
                      {/* Section header */}
                      <tr key={`hdr-${type}`} className={`${meta.bg} border-y ${meta.border}`}>
                        <td colSpan={4} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${meta.color}`}>
                          {meta.label}
                        </td>
                      </tr>

                      {/* Account rows */}
                      {group.rows.map(row => (
                        <tr key={row.code} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 text-xs font-mono text-gray-400">{row.code}</td>
                          <td className="px-4 py-2.5 text-gray-700">{row.name}</td>
                          <AmtCell value={row.balanceDebit} />
                          <AmtCell value={row.balanceCredit} />
                        </tr>
                      ))}

                      {/* Section subtotal */}
                      <tr key={`sub-${type}`} className={`${meta.bg} border-b ${meta.border}`}>
                        <td colSpan={2} className={`px-4 py-2 text-xs font-bold ${meta.color} text-right`}>
                          {meta.label} Total
                        </td>
                        <td className={`px-4 py-2 text-right font-mono text-sm font-bold ${meta.color}`}>
                          {group.subtotalDebit > 0 ? fmtCurrency(group.subtotalDebit) : '—'}
                        </td>
                        <td className={`px-4 py-2 text-right font-mono text-sm font-bold ${meta.color}`}>
                          {group.subtotalCredit > 0 ? fmtCurrency(group.subtotalCredit) : '—'}
                        </td>
                      </tr>
                    </>
                  );
                })}

                {/* Grand total */}
                <tr className="bg-gray-900 border-t-2 border-gray-800">
                  <td colSpan={2} className="px-4 py-3.5 text-sm font-bold text-white text-right">
                    GRAND TOTAL
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-white">
                    {fmtCurrency(grandDebit)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-white">
                    {fmtCurrency(grandCredit)}
                  </td>
                </tr>

                {/* Balance check row */}
                {!isBalanced && (
                  <tr className="bg-red-100 border-t border-red-300">
                    <td colSpan={2} className="px-4 py-2.5 text-xs font-bold text-red-700 text-right">
                      DIFFERENCE (out of balance)
                    </td>
                    <td colSpan={2} className="px-4 py-2.5 text-center font-mono text-sm font-bold text-red-700">
                      {fmtCurrency(diff)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center pb-2">
        Figures derived from posted journal entries. Draft invoices and unposted GRNs are excluded.
      </p>
    </div>
  );
}
