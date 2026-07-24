import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useGetSupplierPaymentsQuery,
  useCancelSupplierPaymentMutation,
} from '../../api/purchasingApi';
import { useGetSuppliersQuery } from '../../api/suppliersApi';
import Table from '../../components/ui/Table';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtDate } from '../../utils/format';
import { usePermission } from '../../hooks/usePermission';

const METHOD_COLORS = {
  CASH: 'bg-green-100 text-green-700',
  CHEQUE: 'bg-blue-100 text-blue-700',
  BANK_TRANSFER: 'bg-purple-100 text-purple-700',
};

export default function SupplierPaymentList() {
  const navigate   = useNavigate();
  const canCreate  = usePermission('finance.payments');
  const [filters, setFilters] = useState({ supplier_id: '', from: '', to: '' });
  const [cancelTarget, setCancelTarget] = useState(null);

  const { data, isLoading } = useGetSupplierPaymentsQuery(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
  );
  const { data: suppliersData } = useGetSuppliersQuery({});
  const [cancelPayment, { isLoading: cancelling }] = useCancelSupplierPaymentMutation();

  const rows      = data?.data || [];
  const suppliers = suppliersData?.data || [];

  const handleCancel = async () => {
    try {
      await cancelPayment(cancelTarget.id).unwrap();
      toast.success('Payment cancelled');
    } catch (e) {
      toast.error(e.data?.message || 'Failed to cancel');
    }
    setCancelTarget(null);
  };

  const columns = [
    {
      header: 'Payment #', key: 'payment_number',
      cell: r => <span className="font-mono text-xs font-semibold text-gray-800">{r.payment_number}</span>,
    },
    { header: 'Date',     key: 'payment_date', cell: r => fmtDate(r.payment_date) },
    {
      header: 'Supplier', key: 'supplier',
      cell: r => (
        <div>
          <p className="font-semibold text-gray-800 text-sm">{r.Supplier?.name || '—'}</p>
          <p className="text-xs text-gray-400">{r.Supplier?.code}</p>
        </div>
      ),
    },
    {
      header: 'Method', key: 'payment_method',
      cell: r => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${METHOD_COLORS[r.payment_method] || 'bg-gray-100 text-gray-600'}`}>
          {r.payment_method?.replace('_', ' ')}
        </span>
      ),
    },
    { header: 'Reference', key: 'reference', cell: r => <span className="text-xs text-gray-500 font-mono">{r.reference || '—'}</span> },
    {
      header: 'Amount', key: 'amount',
      cell: r => <span className="font-semibold font-mono text-gray-900">{fmtCurrency(r.amount)}</span>,
    },
    { header: 'Status', key: 'status', cell: r => <StatusBadge status={r.status} /> },
    {
      header: 'Actions', key: 'actions',
      cell: r => (
        <div className="flex gap-1">
          <button onClick={() => navigate(`/supplier-payments/${r.id}`)} className="btn btn-sm btn-secondary">View</button>
          {r.status === 'POSTED' && canCreate && (
            <button
              onClick={() => setCancelTarget(r)}
              className="btn btn-sm bg-red-100 text-red-700 hover:bg-red-200 border-0"
            >
              Cancel
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Supplier Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">AP payments against goods received notes</p>
        </div>
        {canCreate && (
          <button onClick={() => navigate('/supplier-payments/new')} className="btn btn-primary">
            <Plus size={16} /> New Payment
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select
          value={filters.supplier_id}
          onChange={e => setFilters(f => ({ ...f, supplier_id: e.target.value }))}
          className="input input-sm w-48"
        >
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input
          type="date" value={filters.from}
          onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
          className="input input-sm w-36"
          placeholder="From"
        />
        <input
          type="date" value={filters.to}
          onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
          className="input input-sm w-36"
          placeholder="To"
        />
        <button onClick={() => setFilters({ supplier_id: '', from: '', to: '' })}
          className="btn-secondary text-xs px-3 py-1.5 rounded-lg">
          Clear
        </button>
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Payments</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{rows.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Amount</p>
            <p className="text-xl font-bold text-primary-600 mt-1">
              {fmtCurrency(rows.filter(r => r.status === 'POSTED').reduce((s, r) => s + parseFloat(r.amount || 0), 0))}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Cancelled</p>
            <p className="text-xl font-bold text-gray-400 mt-1">
              {rows.filter(r => r.status === 'CANCELLED').length}
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <Table
          columns={columns}
          data={rows}
          loading={isLoading}
          emptyComponent={
            <EmptyState
              icon={CreditCard}
              title="No supplier payments"
              description="Record a payment against a goods received note"
              action={canCreate ? { label: 'New Payment', onClick: () => navigate('/supplier-payments/new') } : null}
            />
          }
        />
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        onCancel={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={cancelling}
        variant="warning"
        title="Cancel Payment"
        confirmLabel="Cancel Payment"
        message={`Cancel payment ${cancelTarget?.payment_number} of ${fmtCurrency(cancelTarget?.amount)}? This will reverse all GRN allocations.`}
      />
    </div>
  );
}
