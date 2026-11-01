import { useState, useEffect } from 'react';

function fmtCases(qty, caseSize) {
  if (!caseSize || caseSize <= 0) return null;
  const cases = Math.floor(qty / caseSize);
  const units = qty % caseSize;
  if (cases === 0) return `${units} u`;
  if (units === 0) return `${cases} cs`;
  return `${cases} cs + ${units} u`;
}
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

  useEffect(() => {
    if (repOptions.length > 0 && !filterRepId) {
      setFilterRepId(String(repOptions[0].id));
    }
  }, [repOptions.length]);

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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Gift size={20} className="text-purple-600" /> Free Item Allocations
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {canApprove ? 'Manage promotional item quotas per sales rep' : 'Your free item quota — tap Distribute to give items to customers'}
          </p>
        </div>

        {/* Controls — stack on mobile, row on desktop */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search product…"
              className="input text-sm py-1.5 pl-8 w-full sm:w-48"
            />
          </div>

          {/* Rep filter */}
          {canApprove && repOptions.length > 0 && (
            <select
              value={filterRepId}
              onChange={e => setFilterRepId(e.target.value)}
              className="input text-sm py-1.5 sm:w-40"
            >
              {repOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}

          {/* New button */}
          {canApprove && (
            <button onClick={() => setShowNew(true)}
              className="flex items-center justify-center gap-1.5 btn btn-primary text-sm whitespace-nowrap">
              <Plus size={16} /> New Allocation
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="card p-10 text-center text-gray-400">Loading…</div>
      ) : allocations.length === 0 ? (
        <div className="card p-10 text-center">
          <Package size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No free item allocations yet</p>
          {canApprove && <p className="text-sm text-gray-400 mt-1">Click "New Allocation" to assign promotional items to a sales rep</p>}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Product</th>
                  {canApprove && <th className="px-4 py-3 text-left">Sales Rep</th>}
                  <th className="px-4 py-3 text-left">Warehouse</th>
                  <th className="px-4 py-3 text-right">Allocated</th>
                  <th className="px-4 py-3 text-right">Used</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3 text-right">Cases</th>
                  <th className="px-4 py-3 text-center">Usage</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibleAllocations.map(a => {
                  const allocated = parseFloat(a.allocated_quantity);
                  const used      = parseFloat(a.used_quantity);
                  const remaining = allocated - used;
                  const isEmpty   = remaining <= 0;
                  const caseSize  = a.Product?.case_size;
                  return (
                    <tr key={a.id} className={`hover:bg-gray-50 transition-colors ${isEmpty ? 'opacity-70' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{a.Product?.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{a.Product?.sku}</p>
                      </td>
                      {canApprove && (
                        <td className="px-4 py-3 text-purple-600 font-medium">{a.SalesRep?.name || '—'}</td>
                      )}
                      <td className="px-4 py-3 text-gray-600">{a.Warehouse?.name || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">{fmtNumber(allocated, 0)}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">{fmtNumber(used, 0)}</td>
                      <td className={`px-4 py-3 text-right font-bold font-mono ${isEmpty ? 'text-red-500' : 'text-green-600'}`}>
                        {fmtNumber(remaining, 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {fmtCases(remaining, caseSize)
                          ? <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{fmtCases(remaining, caseSize)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-24 mx-auto">
                          <QuotaBar used={used} total={allocated} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isEmpty ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                        }`}>
                          {isEmpty ? 'Empty' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setHistory(a)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
                            <History size={12} /> History
                          </button>
                          {canApprove && (
                            <button onClick={() => setTopping(a)}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-sm">
                              <ChevronUp size={12} /> Top Up
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNew && <NewAllocModal onClose={() => setShowNew(false)} />}
      {topping && <TopupModal alloc={topping} onClose={() => setTopping(null)} />}
      {history && <HistoryModal alloc={history} onClose={() => setHistory(null)} />}
    </div>
  );
}
