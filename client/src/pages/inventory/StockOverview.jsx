import { useState } from 'react';
import { AlertTriangle, Package, TrendingUp, Warehouse } from 'lucide-react';
import { useGetStockOnHandQuery } from '../../api/inventoryApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';
import { fmtCurrency } from '../../utils/format';

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function StockOverview() {
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);

  const { data, isLoading } = useGetStockOnHandQuery({});
  const { data: warehouses } = useGetWarehousesQuery({});

  const warehouseOpts = warehouses?.data || [];

  const q = search.toLowerCase().trim();
  const rows = (data?.data || []).filter(r => {
    if (warehouseId && String(r.warehouse_id) !== String(warehouseId)) return false;
    if (showLowOnly && !r.low_stock) return false;
    if (q && !r.product?.toLowerCase().includes(q) && !r.sku?.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Stock On Hand</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package}      color="blue"   label="Total SKUs"       value={data?.total ?? '—'} sub={q || warehouseId ? `${rows.length} matching` : undefined} />
        <StatCard icon={TrendingUp}   color="green"  label="Total Stock Value" value={data ? fmtCurrency(data.total_value) : '—'} />
        <StatCard icon={AlertTriangle} color="red"   label="Out of Stock"      value={data?.low_stock_count ?? '—'} sub="zero quantity on hand" />
        <StatCard icon={Warehouse}    color="purple" label="Warehouses"        value={warehouseOpts.length} />
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by product or SKU…"
          className="input flex-1 min-w-48 text-sm"
        />
        <select
          value={warehouseId}
          onChange={e => setWarehouseId(e.target.value)}
          className="input text-sm w-52"
        >
          <option value="">All Warehouses</option>
          {warehouseOpts.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showLowOnly}
            onChange={e => setShowLowOnly(e.target.checked)}
            className="rounded"
          />
          Low stock only
        </label>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Loading stock…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No stock records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Warehouse</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">On Hand</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Reserved</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Available</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Stock Value</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(r => (
                  <tr key={r.id} className={`hover:bg-gray-50 ${r.low_stock ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.sku}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.product}</td>
                    <td className="px-4 py-3 text-gray-500">{r.category || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.warehouse}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                      {r.quantity % 1 === 0 ? r.quantity : r.quantity.toFixed(2)}
                      {r.unit && <span className="text-xs text-gray-400 ml-1">{r.unit}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">{r.reserved || 0}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${r.available <= 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {r.available % 1 === 0 ? r.available : r.available.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmtCurrency(r.stock_value)}</td>
                    <td className="px-4 py-3 text-center">
                      {r.available <= 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          <AlertTriangle size={10} /> Out of stock
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">In stock</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
