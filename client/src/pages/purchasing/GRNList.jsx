import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetGRNsQuery, usePostGRNMutation, useDeleteGRNMutation } from '../../api/purchasingApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtDate } from '../../utils/format';

export default function GRNList() {
  const navigate = useNavigate();
  const canCreate  = usePermission('purchase.create');
  const canApprove = usePermission('purchase.approve');
  const [page, setPage] = useState(1);
  const [postingGRN, setPostingGRN] = useState(null);
  const [deletingGRN, setDeletingGRN] = useState(null);

  const { data, isLoading } = useGetGRNsQuery({ page, limit: 20 });
  const [postGRN,   { isLoading: posting  }] = usePostGRNMutation();
  const [deleteGRN, { isLoading: deleting }] = useDeleteGRNMutation();

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
    { key: 'supplier', header: 'Supplier', cell: r => r.Supplier?.name },
    { key: 'grn_date', header: 'Date', cell: r => fmtDate(r.grn_date) },
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
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Goods Received Notes</h2>
        {canCreate && (
          <Link to="/grn/new" className="btn-primary flex items-center gap-2"><Plus size={16} /> New GRN</Link>
        )}
      </div>

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
