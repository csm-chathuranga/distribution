import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Tag } from 'lucide-react';
import { useGetPriceListsQuery } from '../../api/productsApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { fmtDate } from '../../utils/format';

const TYPE_COLORS = {
  RETAIL: 'bg-blue-100 text-blue-800',
  WHOLESALE: 'bg-purple-100 text-purple-800',
  SPECIAL: 'bg-amber-100 text-amber-800',
};

export default function PriceListList() {
  const canCreate = usePermission('inventory.create');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetPriceListsQuery({ page, limit: 20 });

  const columns = [
    { key: 'name', header: 'Name', cell: r => <span className="font-medium">{r.name}</span> },
    {
      key: 'type', header: 'Type',
      cell: r => <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[r.type] || ''}`}>{r.type}</span>,
    },
    { key: 'valid_from', header: 'Valid From', cell: r => r.valid_from ? fmtDate(r.valid_from) : '—' },
    { key: 'valid_to', header: 'Valid To', cell: r => r.valid_to ? fmtDate(r.valid_to) : '—' },
    { key: 'is_active', header: 'Status', cell: r => <StatusBadge status={r.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      cell: r => canCreate && (
        <Link to={`/price-lists/${r.id}/edit`} className="text-xs text-primary-600 hover:underline">Edit</Link>
      ),
    },
  ];

  return (
    <div className="card">
      <PageHeader title="Price Lists">
        {canCreate && (
          <Link to="/price-lists/new" className="btn btn-primary btn-sm gap-1.5"><Plus size={15} /> New Price List</Link>
        )}
      </PageHeader>
      <Table columns={columns} data={data?.data} loading={isLoading} emptyText="No price lists found" />
      <Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} />
    </div>
  );
}
