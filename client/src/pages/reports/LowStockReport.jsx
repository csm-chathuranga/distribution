import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ShoppingCart } from 'lucide-react';
import { useGetLowStockQuery } from '../../api/reportsApi';
import Table from '../../components/ui/Table';
import PageHeader from '../../components/ui/PageHeader';

export default function LowStockReport() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetLowStockQuery();

  const columns = [
    { key: 'sku', header: 'SKU', cell: r => <span className="font-mono text-xs text-gray-500">{r.sku}</span> },
    { key: 'name', header: 'Product', cell: r => <span className="font-medium">{r.name}</span> },
    { key: 'warehouse', header: 'Warehouse' },
    {
      key: 'quantity', header: 'Current Stock', className: 'text-right',
      cell: r => <span className={parseFloat(r.quantity) === 0 ? 'text-red-600 font-bold' : 'text-amber-600 font-medium'}>{parseFloat(r.quantity).toFixed(2)}</span>,
    },
    { key: 'reorder_point', header: 'Reorder Point', className: 'text-right', cell: r => parseFloat(r.reorder_point).toFixed(2) },
    {
      key: 'shortage', header: 'Shortage', className: 'text-right',
      cell: r => {
        const s = parseFloat(r.reorder_point) - parseFloat(r.quantity);
        return <span className="text-red-600 font-medium">{s > 0 ? s.toFixed(2) : '—'}</span>;
      },
    },
    {
      key: 'actions', header: '', className: 'text-right',
      cell: r => (
        <button
          onClick={() => navigate(`/purchase-orders/new`)}
          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
        >
          <ShoppingCart size={12} /> Create PO
        </button>
      ),
    },
  ];

  return (
    <div className="card">
      <PageHeader title="Low Stock Alert">
        <span className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
          <AlertTriangle size={15} />
          {data?.length || 0} product{data?.length !== 1 ? 's' : ''} below reorder point
        </span>
      </PageHeader>
      <Table columns={columns} data={data} loading={isLoading} emptyText="All products are adequately stocked" />
    </div>
  );
}
