import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Package } from 'lucide-react';
import { useGetProductsQuery } from '../../api/productsApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';
import { useSetOpeningStockMutation } from '../../api/inventoryApi';

export default function OpeningStock() {
  const [warehouseId, setWarehouseId] = useState('');
  const [quantities, setQuantities] = useState({});
  const [costs, setCosts] = useState({});
  const [search, setSearch] = useState('');

  const { data: warehouses } = useGetWarehousesQuery({});
  const { data: productsData, isLoading } = useGetProductsQuery({ limit: 500, is_active: true });
  const [setOpeningStock, { isLoading: saving }] = useSetOpeningStockMutation();

  const products = useMemo(() => {
    const all = productsData?.data || [];
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(p => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
  }, [productsData, search]);

  const setQty = (id, val) => setQuantities(prev => ({ ...prev, [id]: val }));
  const setCost = (id, val) => setCosts(prev => ({ ...prev, [id]: val }));

  const filledCount = Object.values(quantities).filter(v => parseFloat(v) > 0).length;

  const handleSubmit = async () => {
    if (!warehouseId) return toast.error('Select a warehouse');
    const items = products
      .filter(p => parseFloat(quantities[p.id] || 0) > 0)
      .map(p => ({
        product_id: p.id,
        quantity: parseFloat(quantities[p.id] || 0),
        unit_cost: parseFloat(costs[p.id] || p.cost_price || 0),
      }));

    if (items.length === 0) return toast.error('Enter quantity for at least one product');

    try {
      await setOpeningStock({ warehouse_id: parseInt(warehouseId), items }).unwrap();
      toast.success(`Opening stock set for ${items.length} product(s)`);
      setQuantities({});
      setCosts({});
    } catch (e) { toast.error(e.data?.message || 'Failed to set stock'); }
  };

  const warehouseOptions = warehouses?.data || [];

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
            <Package size={18} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Opening Stock</h1>
            <p className="text-sm text-gray-500">Set initial inventory quantities when starting the system</p>
          </div>
        </div>

        <div className="flex items-end gap-4 mb-4">
          <div className="flex-1 max-w-xs">
            <label className="label">Warehouse</label>
            <select className="input" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
              <option value="">Select warehouse...</option>
              {warehouseOptions.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="flex-1 max-w-xs">
            <label className="label">Search Products</label>
            <input
              type="text"
              className="input"
              placeholder="Filter by name or SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="text-sm text-gray-500 pb-1">
            {filledCount} product(s) with quantity
          </div>
        </div>

        {isLoading ? (
          <p className="text-gray-500 text-sm py-8 text-center">Loading products...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-200">
                  <th className="text-left py-2 w-28">SKU</th>
                  <th className="text-left py-2">Product Name</th>
                  <th className="text-left py-2 w-36">Category</th>
                  <th className="text-left py-2 w-20">Unit</th>
                  <th className="text-right py-2 w-36">Quantity</th>
                  <th className="text-right py-2 w-36">Unit Cost (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 ${parseFloat(quantities[p.id] || 0) > 0 ? 'bg-green-50' : ''}`}
                  >
                    <td className="py-1.5 font-mono text-xs text-gray-500">{p.sku}</td>
                    <td className="py-1.5 font-medium text-gray-800">{p.name}</td>
                    <td className="py-1.5 text-gray-600">{p.Category?.name || '-'}</td>
                    <td className="py-1.5 text-gray-600">{p.BaseUnit?.abbreviation || '-'}</td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="0"
                        value={quantities[p.id] || ''}
                        onChange={e => setQty(p.id, e.target.value)}
                        className="input text-right w-full py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={p.cost_price || '0.00'}
                        value={costs[p.id] || ''}
                        onChange={e => setCost(p.id, e.target.value)}
                        className="input text-right w-full py-1 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-3 mt-4 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={saving || !warehouseId || filledCount === 0}
            className="btn-primary"
          >
            {saving ? 'Saving...' : `Set Opening Stock (${filledCount} products)`}
          </button>
        </div>
      </div>
    </div>
  );
}
