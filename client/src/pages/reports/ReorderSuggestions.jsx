import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useGetReorderSuggestionsQuery } from '../../api/reportsApi';
import PageHeader from '../../components/ui/PageHeader';
import { fmtNumber } from '../../utils/format';

export default function ReorderSuggestions() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetReorderSuggestionsQuery();
  const [selected, setSelected] = useState(new Set());

  const rows = data || [];

  const toggle = (idx) => setSelected(prev => {
    const next = new Set(prev);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    return next;
  });

  const toggleAll = () => {
    setSelected(prev => prev.size === rows.length ? new Set() : new Set(rows.map((_, i) => i)));
  };

  const createPO = (items) => {
    const lines = items.map(r => ({
      product_id: r.product_id,
      product_label: `${r.sku} — ${r.name}`,
      quantity: Math.ceil(parseFloat(r.suggested_order || 0)),
      unit_cost: parseFloat(r.cost_price || 0),
    }));
    const warehouseId = items[0]?.warehouse_id || '';
    navigate('/purchase-orders/new', { state: { lines, warehouse_id: warehouseId } });
  };

  const selectedItems = rows.filter((_, i) => selected.has(i));

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <PageHeader title="Reorder Suggestions" />
        {selectedItems.length > 0 && (
          <button
            onClick={() => createPO(selectedItems)}
            className="btn btn-primary flex items-center gap-2"
          >
            <ShoppingCart size={15} />
            Create PO for {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-gray-400">No products need reordering</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selected.size === rows.length} onChange={toggleAll}
                    className="rounded" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">SKU</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Warehouse</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Current Stock</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Reorder Point</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Avg Monthly</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Suggested Order</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={i} className={`hover:bg-gray-50 ${selected.has(i) ? 'bg-primary-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)}
                      className="rounded" />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.sku}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.warehouse}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">{fmtNumber(r.current_stock, 2)}</td>
                  <td className="px-4 py-3 text-right">{fmtNumber(r.reorder_point, 2)}</td>
                  <td className="px-4 py-3 text-right">{fmtNumber(r.avg_monthly_sales || 0, 1)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-primary-700">
                    {fmtNumber(r.suggested_order || 0, 0)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => createPO([r])}
                      className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
                    >
                      <ShoppingCart size={12} /> PO
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
