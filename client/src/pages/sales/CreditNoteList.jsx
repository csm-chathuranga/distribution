import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, CheckCircle } from 'lucide-react';
import { useGetInvoicesQuery, usePostInvoiceMutation } from '../../api/salesApi';
import Table from '../../components/ui/Table';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtDate } from '../../utils/format';
import { usePermission } from '../../hooks/usePermission';

export default function CreditNoteList() {
  const navigate = useNavigate();
  const canCreate = usePermission('sales.create');
  const [postTarget, setPostTarget] = useState(null);

  const { data, isLoading } = useGetInvoicesQuery({ invoice_type: 'CREDIT_NOTE', limit: 100 });
  const [postInvoice, { isLoading: posting }] = usePostInvoiceMutation();

  const rows = data?.data || [];

  const handlePost = async () => {
    await postInvoice(postTarget.id).unwrap();
    setPostTarget(null);
  };

  const columns = [
    { key: 'invoice_number', header: 'CN #', cell: r => <span className="font-mono text-xs font-semibold text-gray-800">{r.invoice_number}</span> },
    { key: 'invoice_date', header: 'Date', cell: r => fmtDate(r.invoice_date) },
    { key: 'customer', header: 'Customer', cell: r => r.Customer?.name || '—' },
    { key: 'total_amount', header: 'Amount', cell: r => <span className="font-medium text-red-600">{fmtCurrency(r.total_amount)}</span> },
    { key: 'status', header: 'Status', cell: r => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Actions',
      cell: r => r.status === 'DRAFT' && canCreate ? (
        <button onClick={() => setPostTarget(r)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Post Credit Note"><CheckCircle size={14} /></button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Credit Notes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Customer returns and credit adjustments</p>
        </div>
        {canCreate && (
          <button onClick={() => navigate('/credit-notes/new')} className="btn btn-primary">
            <Plus size={16} /> New Credit Note
          </button>
        )}
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={rows}
          loading={isLoading}
          emptyComponent={<EmptyState icon={RotateCcw} title="No credit notes" description="Create a credit note to reverse a customer invoice" action={canCreate ? { label: 'New Credit Note', onClick: () => navigate('/credit-notes/new') } : null} />}
        />
      </div>

      <ConfirmDialog
        open={!!postTarget}
        onCancel={() => setPostTarget(null)}
        onConfirm={handlePost}
        loading={posting}
        variant="warning"
        title="Post Credit Note"
        confirmLabel="Post"
        loadingLabel="Posting..."
        message={`Post ${postTarget?.invoice_number}? This will reverse stock and reduce customer outstanding balance. This action cannot be undone.`}
      />
    </div>
  );
}
