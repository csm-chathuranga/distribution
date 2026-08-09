import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, CheckCircle2, Clock, TrendingUp, Search, ChevronRight } from 'lucide-react';
import { useGetDailyCollectionsQuery } from '../../api/reportsApi';
import { useGetUsersQuery } from '../../api/settingsApi';
import { usePermission } from '../../hooks/usePermission';
import StatusBadge from '../../components/ui/StatusBadge';
import { fmtCurrency, fmtDate, today } from '../../utils/format';

const STATUS_ORDER = { OVERDUE: 0, POSTED: 1, PARTIAL: 2, PAID: 3 };

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
  const navigate      = useNavigate();
  const canViewAll    = usePermission('sales.view_all');
  const canUsers      = usePermission('settings.users');
  const [date,        setDate]        = useState(today());
  const [repFilter,   setRepFilter]   = useState('');
  const [search,      setSearch]      = useState('');
  const [hideCollected, setHideCollected] = useState(false);

  const { data, isLoading, isFetching } = useGetDailyCollectionsQuery(
    { date, sales_rep_id: repFilter || undefined },
    { refetchOnMountOrArgChange: true },
  );

  const { data: usersData } = useGetUsersQuery({ limit: 200, role: 'sales_rep' }, { skip: !canUsers });
  const salesReps = usersData?.data || [];

  const summary = data?.summary || {};
  const allRows = data?.rows || [];

  // Client-side search + hide-paid filter
  const rows = allRows
    .filter(r => !hideCollected || r.status !== 'PAID')
    .filter(r => !search || r.customer_name.toLowerCase().includes(search.toLowerCase())
                         || r.invoice_number.toLowerCase().includes(search.toLowerCase()));

  // Group by sales rep
  const groups = rows.reduce((acc, r) => {
    const key = r.sales_rep_name;
    if (!acc[key]) acc[key] = { rep: r.sales_rep_name, route: r.route_name, rows: [] };
    acc[key].rows.push(r);
    return acc;
  }, {});

  const collectionRate = summary.collection_rate || 0;

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Daily Collections</h1>
          <p className="text-sm text-gray-500">Track what's been collected and what's still pending</p>
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
        <StatCard icon={Wallet}       label="Total Invoiced"  value={fmtCurrency(summary.total_invoiced  || 0)} sub={`${summary.invoice_count || 0} invoices`}                    color="border-blue-400" />
        <StatCard icon={CheckCircle2} label="Collected"       value={fmtCurrency(summary.total_collected || 0)} sub={`${summary.paid_count || 0} fully paid`}                     color="border-emerald-400" />
        <StatCard icon={Clock}        label="Still Pending"   value={fmtCurrency(summary.total_pending   || 0)} sub={`${(summary.invoice_count||0)-(summary.paid_count||0)} invoices`} color="border-amber-400" />
        <StatCard icon={TrendingUp}   label="Collection Rate" value={`${collectionRate}%`}                      sub="of today's invoiced amount"                                  color="border-violet-400" />
      </div>

      {/* Collection rate bar */}
      <div className="card p-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>Collection progress</span>
          <span className="font-semibold text-gray-700">{collectionRate}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${collectionRate >= 80 ? 'bg-emerald-500' : collectionRate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
            style={{ width: `${Math.min(collectionRate, 100)}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customer or invoice…" className="input pl-8 w-full text-sm py-2" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={hideCollected} onChange={e => setHideCollected(e.target.checked)}
            className="w-4 h-4 rounded accent-primary-600" />
          Hide fully paid
        </label>
      </div>

      {/* Invoice groups */}
      {isLoading || isFetching ? (
        <div className="card p-10 text-center text-gray-400 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No invoices found for {fmtDate(date)}</p>
          <p className="text-sm text-gray-400 mt-1">
            {hideCollected ? 'All invoices are collected — uncheck "Hide fully paid" to see them.' : 'No invoices were raised on this date.'}
          </p>
        </div>
      ) : (
        Object.values(groups).map(group => (
          <div key={group.rep} className="card overflow-hidden">
            {/* Group header */}
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">{group.rep}</p>
                <p className="text-xs text-gray-400">{group.route}</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>
                  <span className="text-emerald-600 font-semibold">
                    {fmtCurrency(group.rows.reduce((s, r) => s + parseFloat(r.paid_amount), 0))}
                  </span>
                  {' / '}
                  {fmtCurrency(group.rows.reduce((s, r) => s + parseFloat(r.total_amount), 0))}
                </p>
                <p className="text-gray-400">{group.rows.filter(r => r.status === 'PAID').length}/{group.rows.length} fully paid</p>
              </div>
            </div>

            {/* Invoice rows */}
            <div className="divide-y divide-gray-50">
              {[...group.rows].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]).map(inv => (
                <div
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {/* Status indicator */}
                  <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${
                    inv.status === 'PAID'    ? 'bg-emerald-400' :
                    inv.status === 'PARTIAL' ? 'bg-amber-400'   :
                    inv.status === 'OVERDUE' ? 'bg-red-500'     : 'bg-blue-400'
                  }`} />

                  {/* Customer */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{inv.customer_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{inv.invoice_number}</p>
                  </div>

                  {/* Amounts */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmtCurrency(inv.total_amount)}</p>
                    {inv.status !== 'PAID' && (
                      <p className="text-xs text-red-500 font-semibold">
                        {fmtCurrency(inv.balance_due)} due
                      </p>
                    )}
                    {inv.status === 'PARTIAL' && (
                      <p className="text-xs text-emerald-600">
                        {fmtCurrency(inv.paid_amount)} paid
                      </p>
                    )}
                  </div>

                  {/* Status + arrow */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <StatusBadge status={inv.status} />
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
              ))}
            </div>

            {/* Group footer — pending total */}
            {group.rows.some(r => r.status !== 'PAID') && (
              <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex justify-between text-xs">
                <span className="text-amber-700 font-medium">Pending from {group.rep}</span>
                <span className="text-amber-800 font-bold">
                  {fmtCurrency(group.rows.reduce((s, r) => s + parseFloat(r.balance_due), 0))}
                </span>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
