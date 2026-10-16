import { useState } from 'react';
import { Wallet, Banknote, CreditCard, ArrowRightLeft, Search, Receipt } from 'lucide-react';
import { useGetDailyCollectionsQuery } from '../../api/reportsApi';
import { useGetUsersQuery } from '../../api/settingsApi';
import { usePermission } from '../../hooks/usePermission';
import { fmtCurrency, fmtDate, today } from '../../utils/format';

const METHOD_BADGE = {
  CASH:          'bg-green-100 text-green-800',
  CHEQUE:        'bg-amber-100 text-amber-800',
  BANK_TRANSFER: 'bg-blue-100 text-blue-800',
  CARD:          'bg-purple-100 text-purple-800',
};

const METHOD_ICON = {
  CASH:          Banknote,
  CHEQUE:        CreditCard,
  BANK_TRANSFER: ArrowRightLeft,
  CARD:          CreditCard,
};

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className={`card p-4 border-l-4 ${color}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <Icon size={22} className="text-gray-300 flex-shrink-0 mt-0.5" />
      </div>
    </div>
  );
}

export default function DailyCollections() {
  const canViewAll = usePermission('sales.view_all');
  const canUsers   = usePermission('settings.users');
  const [date,      setDate]      = useState(today());
  const [repFilter, setRepFilter] = useState('');
  const [search,    setSearch]    = useState('');

  const { data, isLoading, isFetching } = useGetDailyCollectionsQuery(
    { date, sales_rep_id: repFilter || undefined },
    { refetchOnMountOrArgChange: true },
  );

  const { data: usersData } = useGetUsersQuery({ limit: 200, role: 'sales_rep' }, { skip: !canUsers });
  const salesReps = usersData?.data || [];

  const summary = data?.summary || {};
  const allRows  = data?.rows   || [];

  // Deduplicate rows by receipt_id — one receipt may have multiple allocation rows
  const receiptMap = {};
  for (const row of allRows) {
    const key = row.receipt_id;
    if (!receiptMap[key]) {
      receiptMap[key] = { ...row, invoices: [] };
    }
    if (row.invoice_id && row.invoice_number && row.invoice_number !== '—') {
      receiptMap[key].invoices.push({
        id: row.invoice_id,
        number: row.invoice_number,
        amount: row.allocated_amount,
      });
    }
  }
  const receipts = Object.values(receiptMap);

  // Client-side search
  const filtered = receipts.filter(r =>
    !search ||
    r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.receipt_number?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by sales rep
  const groups = filtered.reduce((acc, r) => {
    const key = r.sales_rep_name || '—';
    if (!acc[key]) acc[key] = { rep: r.sales_rep_name || '—', route: r.route_name || '', rows: [] };
    acc[key].rows.push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Daily Collections</h1>
          <p className="text-sm text-gray-500">Payments collected on {fmtDate(date)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canViewAll && salesReps.length > 0 && (
            <select value={repFilter} onChange={e => setRepFilter(e.target.value)} className="input-sm">
              <option value="">All Sales Reps</option>
              {salesReps.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-sm" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Wallet}        label="Total Collected" value={fmtCurrency(summary.total_collected || 0)} sub={`${summary.receipt_count || 0} receipts`}           color="border-emerald-400" />
        <StatCard icon={Banknote}      label="Cash"            value={fmtCurrency(summary.cash_total      || 0)} sub="Cash payments"                                      color="border-green-400" />
        <StatCard icon={CreditCard}    label="Cheque"          value={fmtCurrency(summary.cheque_total    || 0)} sub="Cheque payments"                                    color="border-amber-400" />
        <StatCard icon={ArrowRightLeft} label="Transfer"       value={fmtCurrency(summary.transfer_total  || 0)} sub="Bank transfers"                                     color="border-blue-400" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customer or receipt number…"
          className="input pl-8 w-full text-sm py-2"
        />
      </div>

      {/* Receipt groups */}
      {isLoading || isFetching ? (
        <div className="card p-10 text-center text-gray-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Receipt size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No collections found for {fmtDate(date)}</p>
          <p className="text-sm text-gray-400 mt-1">No payments were recorded on this date.</p>
        </div>
      ) : (
        Object.values(groups).map(group => (
          <div key={group.rep} className="card overflow-hidden">
            {/* Group header */}
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">{group.rep}</p>
                {group.route && group.route !== '—' && (
                  <p className="text-xs text-gray-400">{group.route}</p>
                )}
              </div>
              <div className="text-right text-xs text-gray-500">
                <p className="text-emerald-600 font-semibold text-sm">
                  {fmtCurrency(group.rows.reduce((s, r) => s + parseFloat(r.collected_amount || 0), 0))}
                </p>
                <p className="text-gray-400">{group.rows.length} receipt{group.rows.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Receipt rows */}
            <div className="divide-y divide-gray-50">
              {group.rows.map(rcpt => {
                const MethodIcon = METHOD_ICON[rcpt.payment_method] || CreditCard;
                return (
                  <div key={rcpt.receipt_id} className="flex items-start gap-3 px-4 py-3">
                    {/* Method icon */}
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MethodIcon size={14} className="text-gray-500" />
                    </div>

                    {/* Customer + receipt info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{rcpt.customer_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{rcpt.receipt_number}</p>
                      {rcpt.invoices.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Applied to: {rcpt.invoices.map(i => i.number).join(', ')}
                        </p>
                      )}
                      {rcpt.collected_by_name && rcpt.collected_by_name !== '—' && (
                        <p className="text-xs text-blue-500 mt-0.5">Collected by {rcpt.collected_by_name}</p>
                      )}
                    </div>

                    {/* Amount + method badge */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-emerald-700">{fmtCurrency(rcpt.collected_amount)}</p>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-0.5 ${METHOD_BADGE[rcpt.payment_method] || 'bg-gray-100 text-gray-700'}`}>
                        {rcpt.payment_method?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Group footer */}
            <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 flex justify-between text-xs">
              <span className="text-emerald-700 font-medium">Total from {group.rep}</span>
              <span className="text-emerald-800 font-bold">
                {fmtCurrency(group.rows.reduce((s, r) => s + parseFloat(r.collected_amount || 0), 0))}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
