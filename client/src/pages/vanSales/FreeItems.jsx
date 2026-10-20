import { useState } from 'react';
import { Gift, Plus, ChevronUp, History, Package, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import { usePermission } from '../../hooks/usePermission';
import { fmtNumber, fmtDate } from '../../utils/format';
import {
  useGetFreeAllocationsQuery, useCreateFreeAllocationMutation,
  useTopupFreeAllocationMutation, useGetFreeAllocationHistoryQuery,
} from '../../api/salesApi';
import { useGetUsersForSelectQuery } from '../../api/settingsApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';

// ── Quota bar ────────────────────────────────────────────────
function QuotaBar({ used, total }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── History modal ─────────────────────────────────────────────
function HistoryModal({ alloc, onClose }) {
  const { data: usages = [], isLoading } = useGetFreeAllocationHistoryQuery(alloc.id);
  return (
    <Modal open title={`History — ${alloc.Product?.name}`} onClose={onClose}>
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {isLoading && <p className="text-center text-gray-400 py-6">Loading…</p>}
        {!isLoading && usages.length === 0 && <p className="text-center text-gray-400 py-6">No distributions yet</p>}
        {usages.map(u => (
          <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900">{u.Customer?.name || '—'}</p>
              <p className="text-xs text-gray-400">{fmtDate(u.createdAt)} · {u.GivenBy?.name}</p>
              {u.notes && <p className="text-xs text-gray-500 italic mt-0.5">{u.notes}</p>}
            </div>
            <span className="font-bold text-gray-800 text-sm ml-4">{fmtNumber(u.quantity)} units</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Topup modal ───────────────────────────────────────────────
function TopupModal({ alloc, onClose }) {
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes]       = useState('');
  const [topup, { isLoading }]  = useTopupFreeAllocationMutation();

  const handleSubmit = async () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return toast.error('Enter a valid quantity');
    try {
      await topup({ id: alloc.id, quantity: qty, notes }).unwrap();
      toast.success(`Added ${qty} units to ${alloc.SalesRep?.name}'s quota`);
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <Modal open title={`Top Up — ${alloc.Product?.name} (${alloc.SalesRep?.name})`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Additional Quantity</label>
          <input type="number" min="1" step="1" value={quantity}
            onChange={e => setQuantity(e.target.value)}
            onFocus={e => e.target.select()}
            className="input w-full text-right text-lg font-bold" placeholder="0" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Notes (optional)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            className="input w-full" placeholder="e.g. quarterly replenishment" />
        </div>
        <div className="flex gap-3 pt-2 border-t">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={isLoading}
            className="btn btn-primary flex-1 disabled:opacity-50 font-semibold">
            {isLoading ? 'Saving…' : 'Top Up'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── New Allocation modal ──────────────────────────────────────
function NewAllocModal({ onClose }) {
  const { data: reps = [] }     = useGetUsersForSelectQuery('sales_rep');
  const { data: productsRaw }   = useGetProductsQuery({ limit: 500, is_active: true });
  const { data: warehousesRaw } = useGetWarehousesQuery();
  const products   = productsRaw?.data  || productsRaw  || [];
  const warehouses = warehousesRaw?.data || warehousesRaw || [];

  const [repId,  setRepId]  = useState('');
  const [whId,   setWhId]   = useState('');

  const handleRepChange = (id) => {
    setRepId(id);
    const rep = reps.find(r => String(r.id) === String(id));
    const assignedWh = rep?.AssignedWarehouses?.[0];
    if (assignedWh) setWhId(String(assignedWh.id));
  };
  const [notes,  setNotes]  = useState('');
  const [qtys,   setQtys]   = useState({});   // { product_id: qty_string }
  const [saving, setSaving] = useState(false);
  const [create] = useCreateFreeAllocationMutation();

  const setQty = (pid, val) => setQtys(q => ({ ...q, [pid]: val }));

  const lines = products.filter(p => parseFloat(qtys[p.id] || 0) > 0);

  const handleSubmit = async () => {
    if (!repId) return toast.error('Select a sales rep');
    if (!whId)  return toast.error('Select a warehouse');
    if (lines.length === 0) return toast.error('Enter quantity for at least one product');
    setSaving(true);
    try {
      await Promise.all(lines.map(p =>
        create({
          sales_rep_id: Number(repId),
          product_id:   p.id,
          warehouse_id: Number(whId),
          quantity:     parseFloat(qtys[p.id]),
          notes,
        }).unwrap()
      ));
      toast.success(`${lines.length} allocation${lines.length > 1 ? 's' : ''} created`);
      onClose();
    } catch (e) {
      toast.error(e.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title="New Free Item Allocation" onClose={onClose} size="xl">
      <div className="flex gap-6" style={{ minHeight: 380 }}>

        {/* Left — rep / warehouse / notes */}
        <div className="w-64 shrink-0 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Sales Rep *</label>
            <select value={repId} onChange={e => handleRepChange(e.target.value)} className="input w-full">
              <option value="">Select rep…</option>
              {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Warehouse *</label>
            <select value={whId} onChange={e => setWhId(e.target.value)} className="input w-full">
              <option value="">Select warehouse…</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              className="input w-full" placeholder="e.g. Q4 promo" />
          </div>
          {lines.length > 0 && (
            <div className="rounded-xl bg-violet-50 border border-violet-100 p-3">
              <p className="text-xs font-semibold text-violet-700 mb-1">{lines.length} product{lines.length > 1 ? 's' : ''} selected</p>
              {lines.map(p => (
                <p key={p.id} className="text-xs text-violet-600 truncate">{p.name} — {qtys[p.id]} units</p>
              ))}
            </div>
          )}
        </div>

        {/* Right — product list with qty inputs */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Products</p>
            <button
              type="button"
              onClick={() => setQtys({})}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear all
            </button>
          </div>
          <div className="overflow-y-auto flex-1 rounded-xl border border-gray-100 divide-y divide-gray-50" style={{ maxHeight: 340 }}>
            {products.map(p => {
              const val = qtys[p.id] || '';
              const active = parseFloat(val) > 0;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-3 py-2 gap-3 ${active ? 'bg-violet-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${active ? 'text-violet-800' : 'text-gray-800'}`}>{p.name}</p>
                    {p.sku && <p className="text-xs text-gray-400">{p.sku}</p>}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={val}
                    placeholder="0"
                    onChange={e => setQty(p.id, e.target.value)}
                    onFocus={e => e.target.select()}
                    className={`w-20 text-right text-sm font-bold rounded-lg border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-300 ${active ? 'border-violet-300 bg-white' : 'border-gray-200 bg-gray-50'}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t mt-4">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="button" onClick={handleSubmit} disabled={saving}
          className="btn btn-primary flex-1 disabled:opacity-50 font-semibold">
          {saving ? 'Creating…' : `Create Allocation${lines.length > 1 ? `s (${lines.length})` : ''}`}
        </button>
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function FreeItems() {
  const canApprove = usePermission('sales.approve');
  const canCreate  = usePermission('sales.create');
  const { data: allocations = [], isLoading } = useGetFreeAllocationsQuery();

  const [showNew,    setShowNew]    = useState(false);
  const [topping,    setTopping]    = useState(null);
  const [history,    setHistory]    = useState(null);
  const [filterRepId, setFilterRepId] = useState('');
  const [searchQ,    setSearchQ]    = useState('');

  // Build unique rep list from loaded allocations
  const repOptions = [...new Map(
    allocations.filter(a => a.SalesRep).map(a => [a.SalesRep.id, a.SalesRep])
  ).values()].sort((a, b) => a.name.localeCompare(b.name));

  const visibleAllocations = allocations.filter(a => {
    if (filterRepId && String(a.SalesRep?.id) !== filterRepId) return false;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      return (a.Product?.name || '').toLowerCase().includes(q) ||
             (a.Product?.sku  || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Gift size={20} className="text-purple-600" /> Free Item Allocations
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {canApprove ? 'Manage promotional item quotas per sales rep' : 'Your free item quota — tap Distribute to give items to customers'}
            </p>
          </div>
          {canApprove && repOptions.length > 0 && (
            <select
              value={filterRepId}
              onChange={e => setFilterRepId(e.target.value)}
              className="input text-sm py-1.5 pr-8"
            >
              <option value="">All Reps</option>
              {repOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          {canApprove && (
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 btn btn-primary text-sm whitespace-nowrap">
              <Plus size={16} /> New Allocation
            </button>
          )}
        </div>
        {/* Search row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search product…"
              className="input text-sm py-1.5 pl-8 w-full"
            />
          </div>
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="card p-10 text-center text-gray-400">Loading…</div>
      ) : allocations.length === 0 ? (
        <div className="card p-10 text-center">
          <Package size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No free item allocations yet</p>
          {canApprove && <p className="text-sm text-gray-400 mt-1">Click "New Allocation" to assign promotional items to a sales rep</p>}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleAllocations.map(a => {
            const allocated = parseFloat(a.allocated_quantity);
            const used      = parseFloat(a.used_quantity);
            const remaining = allocated - used;
            const isEmpty   = remaining <= 0;
            return (
              <div key={a.id} className={`card p-3 border-l-4 ${isEmpty ? 'border-red-300 opacity-75' : 'border-purple-400'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm leading-snug truncate">{a.Product?.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{a.Product?.sku}</p>
                    {canApprove && (
                      <p className="text-xs text-purple-600 font-semibold mt-0.5">{a.SalesRep?.name}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold font-mono ${isEmpty ? 'text-red-500' : 'text-green-600'}`}>{fmtNumber(remaining, 0)}</p>
                    <p className="text-xs text-gray-400">of {fmtNumber(allocated, 0)} units</p>
                  </div>
                </div>

                <QuotaBar used={used} total={allocated} />
                <p className="text-xs text-gray-400 mt-1">{fmtNumber(used, 0)} used · from {a.Warehouse?.name}</p>
                {a.notes && <p className="text-xs text-gray-500 italic mt-1 truncate">{a.notes}</p>}

                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                  <button onClick={() => setHistory(a)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                    <History size={13} /> History
                  </button>
                  {canApprove && (
                    <button onClick={() => setTopping(a)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                      <ChevronUp size={13} /> Top Up
                    </button>
                  )}
                  <span className={`ml-auto text-xs font-semibold px-2 py-1 ${isEmpty ? 'text-red-500' : 'text-purple-600'}`}>
                    {isEmpty ? 'Quota empty' : 'Given via invoice'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && <NewAllocModal onClose={() => setShowNew(false)} />}
      {topping && <TopupModal alloc={topping} onClose={() => setTopping(null)} />}
      {history && <HistoryModal alloc={history} onClose={() => setHistory(null)} />}
    </div>
  );
}
