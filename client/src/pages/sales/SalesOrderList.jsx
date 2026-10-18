import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ClipboardList, ChevronRight, CheckCircle, TrendingUp, BadgeCheck, Clock, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetSalesOrdersQuery, useConfirmSalesOrderMutation } from '../../api/salesApi';
import { useGetUsersForSelectQuery } from '../../api/settingsApi';
import { usePermission } from '../../hooks/usePermission';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtDate } from '../../utils/format';

const TODAY = new Date().toISOString().split('T')[0];

export default function SalesOrderList() {
  const navigate    = useNavigate();
  const canCreate   = usePermission('sales.create');
  const canApprove  = usePermission('sales.approve');
  const canViewAll  = usePermission('sales.view_all');
  const [page,             setPage]             = useState(1);
  const [search,           setSearch]           = useState('');
  const [confirmingOrder,  setConfirmingOrder]  = useState(null);
  const [showFilters,      setShowFilters]      = useState(false);
  const [dateFrom,         setDateFrom]         = useState('');
  const [dateTo,           setDateTo]           = useState('');
  const [salesRepId,       setSalesRepId]       = useState('');

  const { data: repsData } = useGetUsersForSelectQuery('sales_rep', { skip: !canViewAll });
  const salesReps = repsData || [];

  const activeFilterCount = [dateFrom, dateTo, salesRepId].filter(Boolean).length;

  const queryParams = { search, page, limit: 20 };
  if (dateFrom)    queryParams.date_from    = dateFrom;
  if (dateTo)      queryParams.date_to      = dateTo;
  if (salesRepId)  queryParams.sales_rep_id = salesRepId;

  const { data, isLoading } = useGetSalesOrdersQuery(queryParams);
  const { data: todayData } = useGetSalesOrdersQuery({ date_from: TODAY, date_to: TODAY, limit: 200 });
  const [confirmOrder, { isLoading: confirming }] = useConfirmSalesOrderMutation();
  const orders = data?.data || [];
  const total  = data?.total || 0;

  const todaySummary = useMemo(() => {
    const list = todayData?.data || [];
    return {
      count:     list.length,
      total:     list.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0),
      confirmed: list.filter(o => o.status === 'CONFIRMED').length,
      draft:     list.filter(o => o.status === 'DRAFT').length,
    };
  }, [todayData]);

  const handleConfirm = async () => {
    try {
      await confirmOrder(confirmingOrder.id).unwrap();
      toast.success('Sales order confirmed');
      setConfirmingOrder(null);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Sales Orders</h1>
        {canCreate && (
          <button onClick={() => navigate('/sales-orders/new')} className="btn btn-primary flex items-center gap-1.5">
            <Plus size={16} /> New
          </button>
        )}
      </div>

      {/* Today's summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-primary-600 rounded-2xl p-3.5 text-white">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={13} className="opacity-80" />
            <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Today's Sales</span>
          </div>
          <p className="text-lg font-bold leading-tight">{fmtCurrency(todaySummary.total)}</p>
          <p className="text-[11px] opacity-70 mt-0.5">{todaySummary.count} order{todaySummary.count !== 1 ? 's' : ''}</p>
        </div>

        <div className="grid grid-rows-2 gap-2">
          <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 flex items-center gap-2">
            <BadgeCheck size={16} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide">Confirmed</p>
              <p className="text-base font-bold text-green-700 leading-tight">{todaySummary.confirmed}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center gap-2">
            <Clock size={15} className="text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide">Draft</p>
              <p className="text-base font-bold text-amber-700 leading-tight">{todaySummary.draft}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search orders…"
            className="input pl-9 w-full text-sm py-2"
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <Filter size={14} />
          Filter
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Filters</span>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setSalesRepId(''); setPage(1); }}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
              >
                <X size={11} /> Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                className="input w-full text-sm py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1); }}
                className="input w-full text-sm py-1.5"
              />
            </div>
          </div>

          {canViewAll && salesReps.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sales Rep</label>
              <select
                value={salesRepId}
                onChange={e => { setSalesRepId(e.target.value); setPage(1); }}
                className="input w-full text-sm py-1.5"
              >
                <option value="">All reps</option>
                {salesReps.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="card animate-pulse p-4 space-y-2">
              <div className="flex justify-between">
                <div className="skeleton h-5 w-36" />
                <div className="skeleton h-5 w-20" />
              </div>
              <div className="skeleton h-4 w-48" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-10 text-center">
          <ClipboardList size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No sales orders yet</p>
          {canCreate && (
            <button onClick={() => navigate('/sales-orders/new')} className="mt-4 btn-primary text-sm">
              Create first order
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(so => (
            <div key={so.id} className="card overflow-hidden">
              <div className="p-4 cursor-pointer" onClick={() => navigate(`/sales-orders/${so.id}`)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 leading-snug">
                      {so.Customer?.name || '—'}
                    </p>
                    <p className="text-xs font-mono text-primary-600 mt-0.5">{so.order_number}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={so.status} />
                    <ChevronRight size={15} className="text-gray-400" />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-gray-500">
                    {fmtDate(so.order_date)}
                    {so.Warehouse?.name && <span className="ml-2 text-gray-400">· {so.Warehouse.name}</span>}
                  </div>
                  <span className="font-bold text-gray-900 font-mono">{fmtCurrency(so.total_amount)}</span>
                </div>
              </div>

              {so.status === 'DRAFT' && canApprove && (
                <div className="px-4 pb-4">
                  <button
                    onClick={() => setConfirmingOrder(so)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-semibold transition-colors"
                  >
                    <CheckCircle size={15} /> Confirm Order
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{(page-1)*20+1}–{Math.min(page*20,total)} of {total}</span>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn-secondary px-3 py-1.5 disabled:opacity-40">Prev</button>
            <button disabled={page*20>=total} onClick={() => setPage(p=>p+1)} className="btn-secondary px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmingOrder}
        title="Confirm Sales Order"
        message={`Confirm order ${confirmingOrder?.order_number}?`}
        confirmLabel="Confirm Order"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmingOrder(null)}
        loading={confirming}
      />
    </div>
  );
}
