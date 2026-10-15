import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RotateCcw, AlertTriangle, Plus, ChevronRight, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { selectCurrentUser, selectAssignedWarehouse } from '../../store/authSlice';
import { useGetCustomerReturnsQuery } from '../../api/salesApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';
import { useSubmitDamageReportMutation, useGetDamageReportsQuery } from '../../api/inventoryApi';
import { fmtDate, fmtNumber } from '../../utils/format';

const TABS = [
  { key: 'returns',  label: 'Customer Returns', icon: RotateCcw },
  { key: 'damages',  label: 'Damaged / Expired', icon: AlertTriangle },
];

const STATUS_STYLE = {
  DRAFT:     { label: 'Draft',     class: 'bg-gray-100 text-gray-600' },
  CONFIRMED: { label: 'Confirmed', class: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', class: 'bg-red-100 text-red-600' },
};

const STATUS_ICON = {
  DRAFT:     <Clock size={11} />,
  CONFIRMED: <CheckCircle size={11} />,
  CANCELLED: <XCircle size={11} />,
};

const REASON_OPTS = [
  { value: 'DAMAGE',  label: 'Damaged' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'OTHER',   label: 'Other' },
];

// ── Customer Returns tab ──────────────────────────────────────
function CustomerReturnsTab() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetCustomerReturnsQuery({ limit: 30 });
  const returns = data?.data || [];

  return (
    <div className="space-y-3">
      <button
        onClick={() => navigate('/customer-returns/new')}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary-600 text-white font-semibold text-sm active:opacity-80 transition-opacity"
      >
        <Plus size={16} /> New Customer Return
      </button>

      {isLoading && <p className="text-center text-gray-400 py-6 text-sm">Loading…</p>}
      {!isLoading && returns.length === 0 && (
        <div className="card p-8 text-center">
          <RotateCcw size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-400 text-sm">No returns yet</p>
        </div>
      )}

      <div className="space-y-2">
        {returns.map(r => {
          const s = STATUS_STYLE[r.status] || STATUS_STYLE.DRAFT;
          return (
            <div
              key={r.id}
              onClick={() => navigate(`/customer-returns/${r.id}`)}
              className="card p-4 flex items-center justify-between gap-3 active:opacity-70 cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{r.return_number}</p>
                <p className="text-xs text-gray-500 truncate">{r.Customer?.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtDate(r.return_date)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.class}`}>
                  {STATUS_ICON[r.status]} {s.label}
                </span>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Searchable product picker ─────────────────────────────────
function ProductSearch({ products, value, onChange }) {
  const selected = products.find(p => String(p.id) === String(value));
  const [query, setQuery]   = useState('');
  const [open,  setOpen]    = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(query.toLowerCase())
      ).slice(0, 20)
    : products.slice(0, 20);

  const select = (p) => { onChange(p.id); setQuery(''); setOpen(false); };
  const clear   = () => { onChange(''); setQuery(''); };

  return (
    <div ref={ref} className="relative flex-1">
      {selected ? (
        <div className="input flex items-center justify-between gap-2 text-sm cursor-pointer" onClick={clear}>
          <span className="font-medium text-gray-900 truncate">{selected.name}</span>
          <span className="text-xs text-gray-400 font-mono flex-shrink-0">{selected.sku}</span>
          <span className="text-gray-300 flex-shrink-0">×</span>
        </div>
      ) : (
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search product…"
          className="input w-full text-sm"
        />
      )}
      {open && !selected && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 max-h-52 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-400">No products found</p>
          )}
          {filtered.map(p => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => select(p)}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center justify-between gap-2 border-b border-gray-50 last:border-0"
            >
              <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
              <span className="text-xs text-gray-400 font-mono flex-shrink-0">{p.sku}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const REASON_BADGE = {
  DAMAGE:  'bg-orange-100 text-orange-700',
  EXPIRED: 'bg-red-100 text-red-700',
  OTHER:   'bg-gray-100 text-gray-600',
};

// ── Damaged / Expired tab ─────────────────────────────────────
function DamagesTab() {
  const assignedWarehouse = useSelector(selectAssignedWarehouse);
  const { data: productsRaw } = useGetProductsQuery({ limit: 500, is_active: true });
  const products = productsRaw?.data || [];
  const [submitReport, { isLoading }] = useSubmitDamageReportMutation();
  const { data: history = [], isLoading: histLoading } = useGetDamageReportsQuery();
  const { data: warehousesRaw } = useGetWarehousesQuery({ limit: 100 }, { skip: !!assignedWarehouse });
  const warehouses = warehousesRaw?.data || [];

  const [pickedWarehouseId, setPickedWarehouseId] = useState('');
  const effectiveWarehouseId = assignedWarehouse?.id || pickedWarehouseId || null;

  const [lines, setLines] = useState([{ product_id: '', quantity: '', reason: 'DAMAGE', notes: '' }]);

  const addLine = () => setLines(prev => [...prev, { product_id: '', quantity: '', reason: 'DAMAGE', notes: '' }]);
  const removeLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i, field, val) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

  const handleSubmit = async () => {
    if (!effectiveWarehouseId) {
      toast.error('Select a warehouse first');
      return;
    }
    const validLines = lines.filter(l => l.product_id && parseFloat(l.quantity) > 0);
    if (validLines.length === 0) {
      toast.error('Add at least one item with a valid quantity');
      return;
    }

    try {
      await submitReport({
        warehouse_id: effectiveWarehouseId,
        lines: validLines.map(l => ({
          product_id: Number(l.product_id),
          quantity:   parseFloat(l.quantity),
          reason:     l.reason,
          notes:      l.notes || undefined,
        })),
      }).unwrap();
      toast.success('Damage / expiry recorded');
      setLines([{ product_id: '', quantity: '', reason: 'DAMAGE', notes: '' }]);
    } catch (e) {
      toast.error(e.data?.message || 'Failed to record');
    }
  };

  return (
    <div className="space-y-4">
      {!assignedWarehouse && (
        <div className="card p-4">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5">Warehouse</label>
          <select
            value={pickedWarehouseId}
            onChange={e => setPickedWarehouseId(e.target.value)}
            className="input w-full text-sm"
          >
            <option value="">Select warehouse…</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Items</p>
          <button type="button" onClick={addLine}
            className="flex items-center gap-1 text-xs font-semibold text-primary-600">
            <Plus size={13} /> Add row
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {lines.map((line, i) => (
            <div key={i} className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <ProductSearch
                  products={products}
                  value={line.product_id}
                  onChange={val => updateLine(i, 'product_id', val)}
                />
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(i)}
                    className="p-1.5 text-red-400 hover:text-red-600 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-0.5">Qty</label>
                  <input
                    type="number" min="0" inputMode="numeric"
                    value={line.quantity}
                    onChange={e => updateLine(i, 'quantity', e.target.value)}
                    placeholder="0"
                    className="input w-full text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-0.5">Reason</label>
                  <select value={line.reason} onChange={e => updateLine(i, 'reason', e.target.value)} className="input w-full text-sm">
                    {REASON_OPTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>

              <input
                type="text"
                value={line.notes}
                onChange={e => updateLine(i, 'notes', e.target.value)}
                placeholder="Notes (optional)"
                className="input w-full text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading || !effectiveWarehouseId}
        className="w-full py-3 rounded-2xl bg-red-600 text-white font-semibold text-sm disabled:opacity-50 active:opacity-80 transition-opacity"
      >
        {isLoading ? 'Submitting…' : 'Submit Report'}
      </button>

      {/* Recent history */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Recent Reports</p>
        </div>
        {histLoading && <p className="text-center text-gray-400 py-6 text-sm">Loading…</p>}
        {!histLoading && history.length === 0 && (
          <p className="text-center text-gray-400 py-6 text-sm">No reports yet</p>
        )}
        <div className="divide-y divide-gray-100">
          {history.map(m => (
            <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{m.Product?.name || `Product #${m.product_id}`}</p>
                <p className="text-xs text-gray-400">{fmtDate(m.createdAt)}</p>
                {m.notes && <p className="text-xs text-gray-500 truncate">{m.notes}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${REASON_BADGE[m.source_type] || REASON_BADGE.OTHER}`}>
                  {REASON_OPTS.find(r => r.value === m.source_type)?.label || m.source_type}
                </span>
                <span className="text-sm font-bold text-red-600">-{fmtNumber(m.quantity)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function SalesReturns() {
  const [tab, setTab] = useState('returns');

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-24">
      <h1 className="text-lg font-bold text-gray-900 px-1">Returns & Damages</h1>

      {/* Tab bar */}
      <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'returns' ? <CustomerReturnsTab /> : <DamagesTab />}
    </div>
  );
}
