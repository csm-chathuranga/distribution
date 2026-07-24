import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useGetReorderSuggestionsQuery } from '../../api/reportsApi';
import Table from '../../components/ui/Table';
import PageHeader from '../../components/ui/PageHeader';
import { fmtNumber } from '../../utils/format';

export default function ReorderSuggestions() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetReorderSuggestionsQuery();

  const columns = [
    { key: 'sku', header: 'SKU', cell: r => <span className="font-mono text-xs text-gray-500">{r.sku}</span> },
    { key: 'name', header: 'Product', cell: r => <span className="font-medium">{r.name}</span> },
    { key: 'warehouse', header: 'Warehouse' },
    { key: 'current_stock', header: 'Current Stock', className: 'text-right', cell: r => parseFloat(r.current_stock).toFixed(2) },
    { key: 'reorder_point', header: 'Reorder Point', className: 'text-right', cell: r => parseFloat(r.reorder_point).toFixed(2) },
    { key: 'avg_monthly_sales', header: 'Avg Monthly', className: 'text-right', cell: r => parseFloat(r.avg_monthly_sales || 0).toFixed(1) },
    {
      key: 'suggested_order', header: 'Suggested Order', className: 'text-right font-semibold',
      cell: r => <span className="text-primary-700">{parseFloat(r.suggested_order || 0).toFixed(0)}</span>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      cell: () => (
        <button
          onClick={() => navigate('/purchase-orders/new')}
          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
        >
          <ShoppingCart size={12} /> Create PO
        </button>
      ),
    },
  ];

  return (
    <div className="card">
      <PageHeader title="Reorder Suggestions" />
      <Table columns={columns} data={data} loading={isLoading} emptyText="No products need reordering" />
    </div>
  );
}
