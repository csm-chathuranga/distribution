import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ChevronRight, RefreshCw } from 'lucide-react';
import { useGetActiveSheetQuery, useGetLoadingSheetQuery } from '../../api/salesApi';
import { fmtDate } from '../../utils/format';

const fmtQty = v => { const n = parseFloat(v) || 0; return n % 1 === 0 ? String(n) : n.toFixed(2); };

const pillStyle = (avail, loaded) => {
  if (avail <= 0) return 'text-red-600 bg-red-100 font-bold';
  if (loaded > 0 && avail / loaded <= 0.25) return 'text-amber-600 bg-amber-100 font-semibold';
  return 'text-green-700 bg-green-100 font-semibold';
};

export default function VanStock() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Step 1: get active sheet ID (lightweight)
  const { data: activeSheet, isLoading: loadingActive, error: activeError, refetch: refetchActive } =
    useGetActiveSheetQuery(undefined, { refetchOnMountOrArgChange: true });

  // Step 2: get full sheet with Lines using the ID from step 1
  const { data: sheet, isLoading: loadingSheet, refetch: refetchSheet } =
    useGetLoadingSheetQuery(activeSheet?.id, { skip: !activeSheet?.id, refetchOnMountOrArgChange: true });

  const isLoading = loadingActive || loadingSheet;
  const hasError  = activeError || !activeSheet;

  const handleRefresh = () => { refetchActive(); refetchSheet?.(); };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-32 text-gray-400">
      <Package size={40} className="mb-3 opacity-30" />
      <p className="text-sm">Loading van stock…</p>
    </div>
  );

  if (hasError || !sheet) return (
    <div className="flex flex-col items-center justify-center py-32 text-gray-400 gap-3">
      <Package size={48} className="opacity-20" />
      <p className="text-base font-medium text-gray-500">No active van loaded</p>
      <p className="text-sm text-gray-400">Ask your manager to load the van for today.</p>
      <button onClick={handleRefresh} className="flex items-center gap-1.5 text-sm text-primary-600 font-medium mt-2">
        <RefreshCw size={14} /> Check again
      </button>
    </div>
  );

  const lines = (sheet.Lines || [])
    .map(line => {
      const loaded   = parseFloat(line.loaded_quantity) || 0;
      const sold     = parseFloat(line.sold_quantity) || 0;
      const returned = parseFloat(line.returned_quantity) || 0;
      const avail    = Math.max(0, loaded - sold - returned);
      return { ...line, _loaded: loaded, _sold: sold, _returned: returned, _avail: avail };
    })
    .filter(l => !search || l.Product?.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a._avail - b._avail);

  const totalItems  = lines.length;
  const outCount    = lines.filter(l => l._avail === 0).length;
  const lowCount    = lines.filter(l => l._avail > 0 && l._loaded > 0 && l._avail / l._loaded <= 0.25).length;

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Van Stock</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {sheet.sheet_number} · {fmtDate(sheet.sheet_date)}
            {sheet.Vehicle ? ` · ${sheet.Vehicle.registration_number}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <button onClick={handleRefresh}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            <RefreshCw size={13} />
          </button>
          <button onClick={() => navigate(`/loading-sheets/${sheet.id}`)}
            className="flex items-center gap-1 text-xs text-primary-600 font-semibold hover:text-primary-800">
            Full detail <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl bg-gray-50 border border-gray-100 py-2.5 text-center">
          <p className="text-lg font-bold text-gray-800">{totalItems}</p>
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Products</p>
        </div>
        <div className="flex-1 rounded-xl bg-amber-50 border border-amber-100 py-2.5 text-center">
          <p className="text-lg font-bold text-amber-700">{lowCount}</p>
          <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wide">Low Stock</p>
        </div>
        <div className="flex-1 rounded-xl bg-red-50 border border-red-100 py-2.5 text-center">
          <p className="text-lg font-bold text-red-600">{outCount}</p>
          <p className="text-[10px] text-red-500 font-medium uppercase tracking-wide">Out of Stock</p>
        </div>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Search product…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input w-full"
      />

      {/* Stock list */}
      <div className="space-y-2">
        {lines.map(line => (
          <div
            key={line.id}
            className={`card p-3.5 flex items-center gap-3 ${line._avail === 0 ? 'bg-red-50/60 border-red-100' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{line.Product?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Loaded {fmtQty(line._loaded)} · Sold {fmtQty(line._sold)}
                {line._returned > 0 ? ` · Returned ${fmtQty(line._returned)}` : ''}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-sm ${pillStyle(line._avail, line._loaded)}`}>
                {line._avail === 0 ? 'OUT' : fmtQty(line._avail)}
              </span>
              <p className="text-[10px] text-gray-400 mt-0.5 text-center">available</p>
            </div>
          </div>
        ))}

        {lines.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">No products match your search.</p>
        )}
      </div>
    </div>
  );
}
