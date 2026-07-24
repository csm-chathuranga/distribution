import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetGRNsQuery, usePostGRNMutation } from '../../api/purchasingApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtDate } from '../../utils/format';

export default function GRNList() {
  const canCreate = usePermission('purchase.create');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [postingGRN, setPostingGRN] = useState(null);
  const { data, isLoading } = useGetGRNsQuery({ search, page, limit: 20 });
  const [postGRN, { isLoading: posting }] = usePostGRNMutation();

  const handlePost = async () => {
    try {
      await postGRN(postingGRN.id).unwrap();
      toast.success('GRN posted — stock updated');
      setPostingGRN(null);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const columns = [
    { key: 'grn_number', header: 'GRN Number', cell: r => <span className="font-mono font-medium text-primary-700">{r.grn_number}</span> },
    { key: 'po', header: 'PO Reference', cell: r => r.PurchaseOrder?.po_number || '-' },
    { key: 'supplier', header: 'Supplier', cell: r => r.Supplier?.name },
    { key: 'received_date', header: 'Date', cell: r => fmtDate(r.received_date) },
    { key: 'total_amount', header: 'Total', cell: r => fmtCurrency(r.total_amount), className: 'text-right font-medium' },
    { key: 'status', header: 'Status', cell: r => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      cell: r => r.status === 'DRAFT' && canCreate && (
        <button onClick={() => setPostingGRN(r)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Post GRN"><CheckCircle size={14} /></button>
      ),
    },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Goods Received Notes</h2>
        <div className="flex items-center gap-3">
          {canCreate && (
            <Link to="/grn/new" className="btn-primary flex items-center gap-2"><Plus size={16} /> New GRN</Link>
          )}
        </div>
      </div>
      <Table columns={columns} data={data?.data} loading={isLoading} />
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
    </div>
  );
}
