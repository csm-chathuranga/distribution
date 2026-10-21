import { Package } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/authSlice';
import { useGetActiveSheetQuery, useGetVanStockQuery } from '../../api/salesApi';
import { fmtNumber } from '../../utils/format';

function StockRow({ item }) {
  const pct = item.loaded > 0 ? (item.remaining / item.loaded) * 100 : 0;
  const color = pct > 50 ? '#10b981' : pct > 20 ? '#f59e0b' : '#ef4444';

  return (
    <div className="px-4 py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{item.product?.name}</p>
          <p className="text-xs text-gray-400 font-mono">{item.product?.sku}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 text-right">
          <div>
            <p className="text-xs text-gray-400">Loaded</p>
            <p className="text-sm font-medium text-gray-700">{fmtNumber(item.loaded, 0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Sold</p>
            <p className="text-sm font-medium text-blue-600">{fmtNumber(item.sold, 0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Remaining</p>
            <p className="text-sm font-bold" style={{ color }}>{fmtNumber(item.remaining, 0)}</p>
          </div>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function DriverStock() {
  const user = useSelector(selectCurrentUser);
  const { data: activeSheet, isLoading: sheetLoading } = useGetActiveSheetQuery(user?.id, { skip: !user?.id });
  const sheetId = activeSheet?.id;
  const { data: vanStock, isLoading: stockLoading } = useGetVanStockQuery(sheetId, { skip: !sheetId });

  const isLoading = sheetLoading || stockLoading;
  const lines = vanStock?.lines || [];
  const totalRemaining = lines.reduce((s, l) => s + l.remaining, 0);
  const totalLoaded    = lines.reduce((s, l) => s + l.loaded, 0);

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-24">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-lg font-bold text-gray-900">Van Stock</h1>
        {vanStock?.sheet_number && (
          <span className="text-xs text-gray-400 font-mono">{vanStock.sheet_number}</span>
        )}
      </div>

      {/* Summary chips */}
      {!isLoading && lines.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Loaded', value: fmtNumber(totalLoaded, 0), color: 'text-gray-700', bg: 'bg-gray-50' },
            { label: 'Total Sold',   value: fmtNumber(totalLoaded - totalRemaining, 0), color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Remaining',    value: fmtNumber(totalRemaining, 0), color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className={`card p-3 text-center ${s.bg}`}>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="card animate-pulse divide-y divide-gray-50">
          {[1,2,3,4].map(i => (
            <div key={i} className="px-4 py-3">
              <div className="skeleton h-4 w-40 mb-1" />
              <div className="skeleton h-3 w-24 mb-2" />
              <div className="skeleton h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !sheetId && (
        <div className="card p-10 text-center">
          <Package size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-400 text-sm">No active loading sheet</p>
        </div>
      )}

      {!isLoading && sheetId && lines.length === 0 && (
        <div className="card p-10 text-center">
          <Package size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-400 text-sm">No items in van</p>
        </div>
      )}

      {!isLoading && lines.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Products</p>
            <p className="text-xs text-gray-400">{lines.length} items</p>
          </div>
          {lines.map(item => <StockRow key={item.line_id} item={item} />)}
        </div>
      )}
    </div>
  );
}
