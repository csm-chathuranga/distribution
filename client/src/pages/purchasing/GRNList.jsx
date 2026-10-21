import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle, Trash2, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetGRNsQuery, usePostGRNMutation, useDeleteGRNMutation } from '../../api/purchasingApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';
import { useGetUsersForSelectQuery } from '../../api/settingsApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtDate } from '../../utils/format';

const STATUS_OPTIONS = ['DRAFT', 'POSTED', 'CANCELLED'];

export default function GRNList() {
  const navigate = useNavigate();
  const canCreate  = usePermission('purchase.create');
  const canApprove = usePermission('purchase.approve');

  const [page, setPage] = useState(1);
  const [postingGRN, setPostingGRN] = useState(null);
  const [deletingGRN, setDeletingGRN] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    warehouse_id: '',
    free_sales_rep_id: '',
    status: '',
    date_from: '',
    date_to: '',
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const queryParams = { page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
  const { data, isLoading } = useGetGRNsQuery(queryParams);
  const { data: warehousesData } = useGetWarehousesQuery({ limit: 100 });
  const { data: usersData } = useGetUsersForSelectQuery();

  const [postGRN,   { isLoading: posting  }] = usePostGRNMutation();
  const [deleteGRN, { isLoading: deleting }] = useDeleteGRNMutation();

  const setFilter = (key, val) => {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  };
  const clearFilters = () => {
    setFilters({ warehouse_id: '', free_sales_rep_id: '', status: '', date_from: '', date_to: '' });
    setPage(1);
  };

  const handlePost = async () => {
    try {
      await postGRN(postingGRN.id).unwrap();
      toast.success('GRN posted — stock updated');
      setPostingGRN(null);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const handleDelete = async () => {
    try {
      await deleteGRN(deletingGRN.id).unwrap();
      toast.success('GRN deleted');
      setDeletingGRN(null);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const columns = [
    {
      key: 'grn_number', header: 'GRN Number',
      cell: r => (
        <span
          className="font-mono font-medium text-primary-700 cursor-pointer hover:underline"
          onClick={() => navigate(`/grn/${r.id}`)}
        >
          {r.grn_number}
        </span>
      ),
    },
    { key: 'supplier',  header: 'Supplier',       cell: r => r.Supplier?.name },
    { key: 'warehouse', header: 'Warehouse',       cell: r => r.Warehouse?.name || <span className="text-gray-300">—</span> },
    { key: 'grn_date',  header: 'Date',            cell: r => fmtDate(r.grn_date) },
    {
      key: 'free_rep', header: 'Free Issue Rep',
      cell: r => r.FreeRep
        ? <span className="text-amber-700 font-medium">{r.FreeRep.name}</span>
        : <span className="text-gray-300">—</span>,
    },
    { key: 'total_amount', header: 'Total', cell: r => fmtCurrency(r.total_amount), className: 'text-right font-medium' },
    { key: 'status', header: 'Status', cell: r => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      cell: r => r.status === 'DRAFT' && (
        <div className="flex items-center justify-end gap-1">
          {canApprove && (
            <button
              onClick={e => { e.stopPropagation(); setPostingGRN(r); }}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
              title="Post GRN"
            >
              <CheckCircle size={14} />
            </button>
          )}
          {canCreate && (
            <button
              onClick={e => { e.stopPropagation(); setDeletingGRN(r); }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Delete GRN"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Goods Received Notes</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-primary-50 text-primary-700 border-primary-200'
                : 'text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-primary-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          {canCreate && (
            <button onClick={() => navigate('/grn/new')} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> New GRN
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="p-4 border-b bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Warehouse */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Warehouse</label>
              <select
                value={filters.warehouse_id}
                onChange={e => setFilter('warehouse_id', e.target.value)}
                className="input text-sm w-full"
              >
                <option value="">All Warehouses</option>
                {warehousesData?.data?.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Sales Rep */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Free Issue Rep</label>
              <select
                value={filters.free_sales_rep_id}
                onChange={e => setFilter('free_sales_rep_id', e.target.value)}
                className="input text-sm w-full"
              >
                <option value="">All Reps</option>
                {(usersData || []).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={e => setFilter('status', e.target.value)}
                className="input text-sm w-full"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={e => setFilter('date_from', e.target.value)}
                className="input text-sm w-full"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={e => setFilter('date_to', e.target.value)}
                className="input text-sm w-full"
              />
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
            >
              <X size={12} /> Clear all filters
            </button>
          )}
        </div>
      )}

      <Table
        columns={columns}
        data={data?.data}
        loading={isLoading}
        onRowClick={r => navigate(`/grn/${r.id}`)}
      />
      <Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} />

      <ConfirmDialog
        open={!!postingGRN}
        title="Post GRN"
        message={`Post GRN ${postingGRN?.grn_number}? This will update stock quantities and create journal entries.`}
        confirmLabel="Post"
        onConfirm={handlePost}
        onCancel={() => setPostingGRN(null)}
        loading={posting}
      />
      <ConfirmDialog
        open={!!deletingGRN}
        title="Delete GRN"
        message={`Delete ${deletingGRN?.grn_number}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeletingGRN(null)}
        loading={deleting}
        danger
      />
    </div>
  );
}
