import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ClipboardList, ChevronRight, CheckCircle, TrendingUp, BadgeCheck, Clock, Filter, X, CloudUpload, AlertCircle, RefreshCw, Trash2, FilePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { useGetSalesOrdersQuery, useConfirmSalesOrderMutation, useInvoiceSalesOrderMutation } from '../../api/salesApi';
import { useGetUsersForSelectQuery } from '../../api/settingsApi';
import { usePermission } from '../../hooks/usePermission';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { selectCurrentUser } from '../../store/authSlice';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtDate, fmtTime } from '../../utils/format';

const TODAY = new Date().toISOString().split('T')[0];

export default function SalesOrderList() {
  const navigate    = useNavigate();
  const canCreate   = usePermission('sales.create');
  const canApprove  = usePermission('sales.approve');
  const canViewAll  = usePermission('sales.view_all');
  const currentUser = useSelector(selectCurrentUser);
  const {
    queueItems,
    isSyncing,
    retryQueueItem,
    discardQueueItem,
    claimQueueItem,
  } = useOfflineSync();
  const [page,             setPage]             = useState(1);
  const [search,           setSearch]           = useState('');
  const [confirmingOrder,  setConfirmingOrder]  = useState(null);
  const [showFilters,      setShowFilters]      = useState(false);
  const [dateFrom,         setDateFrom]         = useState('');
  const [dateTo,           setDateTo]           = useState('');
  const [salesRepId,       setSalesRepId]       = useState('');
  const [discardingItem,   setDiscardingItem]   = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [confirmingBulkInvoice, setConfirmingBulkInvoice] = useState(false);
  const [bulkInvoicing, setBulkInvoicing] = useState(false);

  useEffect(() => {
    setSelectedOrderIds([]);
  }, [page, search, dateFrom, dateTo, salesRepId]);

  const { data: repsData } = useGetUsersForSelectQuery('sales_rep', { skip: !canViewAll });
  const salesReps = repsData || [];

  const queryParams = { search, page, limit: 20 };
  if (dateFrom)    queryParams.date_from    = dateFrom;
  if (dateTo)      queryParams.date_to      = dateTo;
  if (salesRepId)  queryParams.sales_rep_id = salesRepId;

  const { data, isLoading } = useGetSalesOrdersQuery(queryParams);
  const { data: todayData } = useGetSalesOrdersQuery({ date_from: TODAY, date_to: TODAY, limit: 200 });
  const [confirmOrder, { isLoading: confirming }] = useConfirmSalesOrderMutation();
  const [invoiceOrder] = useInvoiceSalesOrderMutation();
  const orders = data?.data || [];
  const invoiceableOrders = orders.filter(order => order.status === 'CONFIRMED');
  const allInvoiceableSelected = invoiceableOrders.length > 0
    && invoiceableOrders.every(order => selectedOrderIds.includes(order.id));
  const total  = data?.total || 0;
  const pendingOrders = page === 1 ? queueItems.filter(item => {
    if (item.url !== '/sales-orders' || item.method !== 'POST') return false;
    if (item.ownerId && String(item.ownerId) !== String(currentUser?.id)) return false;
    const details = item.display || {};
    if (search && !String(details.customerName || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom && details.orderDate && details.orderDate < dateFrom) return false;
    if (dateTo && details.orderDate && details.orderDate > dateTo) return false;
    if (salesRepId && String(details.salesRepId || '') !== String(salesRepId)) return false;
    return true;
  }) : [];

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

  const handleToggleAllInvoiceable = checked => {
    const invoiceableIds = invoiceableOrders.map(order => order.id);
    setSelectedOrderIds(current => checked
      ? [...new Set([...current, ...invoiceableIds])]
      : current.filter(id => !invoiceableIds.includes(id)));
  };

  const handleBulkInvoice = async () => {
    setBulkInvoicing(true);
    const selectedOrders = invoiceableOrders.filter(order => selectedOrderIds.includes(order.id));
    const failures = [];
    let createdCount = 0;

    for (const order of selectedOrders) {
      try {
        await invoiceOrder(order.id).unwrap();
        createdCount += 1;
      } catch (error) {
        failures.push({
          orderNumber: order.order_number,
          reason: error?.data?.message || 'Request failed',
        });
      }
    }

    setBulkInvoicing(false);
    setConfirmingBulkInvoice(false);
    setSelectedOrderIds([]);

    if (createdCount > 0) {
      toast.success(`${createdCount} invoice${createdCount === 1 ? '' : 's'} created`);
    }
    if (failures.length > 0) {
      const details = failures.slice(0, 2).map(failure => `${failure.orderNumber}: ${failure.reason}`).join('; ');
      const remaining = failures.length > 2 ? ` (+${failures.length - 2} more)` : '';
      toast.error(`${failures.length} order${failures.length === 1 ? '' : 's'} could not be invoiced: ${details}${remaining}`);
    }
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

      {/* Search and filters */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search orders…"
            className="input pl-9 w-full text-sm py-2"
          />
        </div>
        {canViewAll && salesReps.length > 0 && (
          <select
            value={salesRepId}
            onChange={e => { setSalesRepId(e.target.value); setPage(1); }}
            className="input w-28 flex-shrink-0 text-sm py-2"
            aria-label="Filter by sales rep"
          >
            <option value="">All reps</option>
            {salesReps.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`relative flex flex-shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters || dateFrom || dateTo ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <Filter size={14} />
          Filter
          {(dateFrom || dateTo) && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {[dateFrom, dateTo].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Optional date filters */}
      {showFilters && (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="input w-full text-sm py-1.5"
            />
          </div>
          <div className="min-w-0 flex-1">
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="input w-full text-sm py-1.5"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
              className="flex flex-shrink-0 items-center gap-1 px-2 py-2 text-xs text-red-500 hover:text-red-700 font-medium"
            >
              <X size={11} /> Clear
            </button>
          )}
        </div>
      )}

      {/* Cards */}
      {canApprove && invoiceableOrders.length > 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={allInvoiceableSelected}
              onChange={e => handleToggleAllInvoiceable(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              aria-label="Select all confirmed orders on this page"
            />
            Select confirmed orders on this page
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{selectedOrderIds.length} selected</span>
            <button
              type="button"
              onClick={() => setConfirmingBulkInvoice(true)}
              disabled={selectedOrderIds.length === 0 || bulkInvoicing}
              className="btn btn-primary flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FilePlus size={15} />
              Create invoices
            </button>
          </div>
        </div>
      )}

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
      ) : orders.length === 0 && pendingOrders.length === 0 ? (
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
          {pendingOrders.map(item => {
            const failed = item.status === 'failed';
            const details = item.display || {};
            return (
              <div key={item.id} className={`card overflow-hidden border-l-4 ${failed ? 'border-l-red-500' : 'border-l-amber-400'}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 leading-snug">
                        {details.customerName || 'Offline order'}
                      </p>
                      <p className={`inline-flex items-center gap-1 mt-1 rounded-full px-2 py-0.5 text-xs font-semibold ${failed ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                        {failed ? <AlertCircle size={12} /> : <CloudUpload size={12} className={item.status === 'syncing' ? 'animate-pulse' : ''} />}
                          {failed ? 'Sync failed' : item.status === 'syncing' ? 'Syncing' : 'Waiting to sync'}
                      </p>
                    </div>
                    <span className="font-bold text-gray-900 font-mono flex-shrink-0">
                      {fmtCurrency(details.totalAmount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>
                      {details.orderDate ? fmtDate(details.orderDate) : 'Date unavailable'}
                      {details.warehouseName && <span className="ml-2 text-gray-400">· {details.warehouseName}</span>}
                    </span>
                    <span>{details.itemCount || 0} item{details.itemCount === 1 ? '' : 's'}</span>
                  </div>
                  {item.lastError && (
                    <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${failed ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{item.lastError}</p>
                  )}
                  {!item.ownerId && (
                    <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      This saved order has no account recorded. Assign it only if you created it.
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {!item.ownerId && (
                      <button
                        onClick={() => claimQueueItem(item.id).catch(error => toast.error(error.message || 'Could not assign saved order'))}
                        disabled={isSyncing || !currentUser?.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Assign to this account
                      </button>
                    )}
                    {failed && (
                      <button
                        onClick={() => retryQueueItem(item.id).catch(error => toast.error(error.message || 'Could not retry order'))}
                        disabled={isSyncing}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} /> Retry sync
                      </button>
                    )}
                    <button
                      onClick={() => setDiscardingItem(item)}
                      disabled={isSyncing}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
                    {canApprove && so.status === 'CONFIRMED' && (
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.includes(so.id)}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setSelectedOrderIds(current => e.target.checked
                          ? [...new Set([...current, so.id])]
                          : current.filter(id => id !== so.id))}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        aria-label={`Select order ${so.order_number} for invoicing`}
                      />
                    )}
                    <StatusBadge status={so.status} />
                    <ChevronRight size={15} className="text-gray-400" />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-gray-500">
                    {fmtDate(so.order_date)}
                    <span className="ml-1.5 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                      {fmtTime(so.createdAt)}
                    </span>
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
      <ConfirmDialog
        open={confirmingBulkInvoice}
        title="Create invoices for selected orders"
        message={`Create and post a separate invoice for each of the ${selectedOrderIds.length} selected confirmed orders? This updates stock and customer balances.`}
        confirmLabel="Create invoices"
        loadingLabel="Creating invoices..."
        onConfirm={handleBulkInvoice}
        onCancel={() => {
          if (!bulkInvoicing) setConfirmingBulkInvoice(false);
        }}
        loading={bulkInvoicing}
        variant="warning"
      />
      <ConfirmDialog
        open={!!discardingItem}
        title="Remove saved order"
        message="This permanently removes the unsynced order from this device. This cannot be undone."
        confirmLabel="Remove order"
        onConfirm={async () => {
          try {
            await discardQueueItem(discardingItem.id);
            setDiscardingItem(null);
            toast.success('Saved order removed');
          } catch (error) {
            toast.error(error.message || 'Could not remove saved order');
          }
        }}
        onCancel={() => setDiscardingItem(null)}
      />
    </div>
  );
}
