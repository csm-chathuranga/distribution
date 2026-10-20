import { useState } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { RotateCcw, Printer, Truck, Trash2, Plus, X, FileText, CheckSquare } from 'lucide-react';
import { useGetLoadingSheetQuery, useLoadLoadingSheetMutation, useCloseLoadingSheetMutation, useDeleteLoadingSheetMutation, useGetExpensesQuery, useCreateExpenseMutation, useGetAvailableInvoicesQuery, useAddInvoicesToSheetMutation, useRemoveInvoiceFromSheetMutation, useUpdateLoadingSheetMutation } from '../../api/salesApi';
import { useGetUsersForSelectQuery } from '../../api/settingsApi';
import { useGetCompanyQuery } from '../../api/reportsApi';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import LoadingSheetPrint from '../../components/print/LoadingSheetPrint';
import InvoicePrint from '../../components/print/InvoicePrint';
import InvoicePrintPOS from '../../components/print/InvoicePrintPOS';
import { printComponent, printPOS } from '../../utils/print';
import { fmtCurrency, fmtDate, today } from '../../utils/format';
import { usePermission } from '../../hooks/usePermission';

const fmtQty = v => { const n = parseFloat(v) || 0; return n % 1 === 0 ? String(n) : n.toFixed(2); };

const availColor = (avail, loaded) => {
  if (avail <= 0) return 'text-red-600 bg-red-50 font-bold';
  if (loaded > 0 && avail / loaded <= 0.25) return 'text-amber-600 bg-amber-50 font-semibold';
  return 'text-green-700 bg-green-50 font-semibold';
};

function DayEndCloseModal({ sheet, onClose, onConfirm, isLoading }) {
  const lines = sheet.Lines || [];
  const invoices = sheet.Invoices || [];
  const hasInvoices = invoices.filter(i => ['POSTED', 'DELIVERED', 'PAID', 'PARTIAL'].includes(i.status)).length > 0;

  // Sum invoiced quantities per product from actual invoice lines
  const invoicedQtyMap = {};
  invoices
    .filter(i => ['POSTED', 'DELIVERED', 'PAID', 'PARTIAL'].includes(i.status))
    .forEach(inv => {
      (inv.Lines || []).forEach(il => {
        const pid = String(il.product_id);
        invoicedQtyMap[pid] = (invoicedQtyMap[pid] || 0) + parseFloat(il.quantity || 0);
      });
    });

  const initReturns = {};
  if (hasInvoices) {
    lines.forEach(line => {
      const invoiced = invoicedQtyMap[String(line.product_id)] || 0;
      const remaining = Math.max(0, parseFloat(line.loaded_quantity) - invoiced);
      if (remaining > 0) initReturns[line.id] = String(remaining);
    });
  }
  const [returns,  setReturns]  = useState(initReturns);
  const [damages,  setDamages]  = useState({});
  const [losts,    setLosts]    = useState({});
  const [dmgNotes, setDmgNotes] = useState({});
  const [cash, setCash] = useState('');

  const rows = lines.map(line => {
    const loaded   = parseFloat(line.loaded_quantity) || 0;
    const invoiced = hasInvoices ? (invoicedQtyMap[String(line.product_id)] || 0) : 0;
    const returned = parseFloat(returns[line.id] || 0);
    const damaged  = parseFloat(damages[line.id]  || 0);
    const lost     = parseFloat(losts[line.id]    || 0);
    const sold     = hasInvoices ? invoiced : Math.max(0, loaded - returned - damaged - lost);
    const unaccounted = Math.max(0, loaded - sold - returned - damaged - lost);
    const value    = sold * (parseFloat(line.unit_cost) || 0);
    return { ...line, loaded, invoiced, returned, damaged, lost, sold, unaccounted, value };
  });

  const totalSoldValue = rows.reduce((s, r) => s + r.value, 0);
  const totalUnaccounted = rows.reduce((s, r) => s + r.unaccounted, 0);
  const totalCollected = invoices.reduce((s, i) => s + parseFloat(i.paid_amount || 0), 0);
  const totalOutstanding = invoices.reduce((s, i) => s + parseFloat(i.balance_due || 0), 0);
  const cashFloat = parseFloat(cash) || 0;
  const variance = cashFloat - totalSoldValue;

  const handleSubmit = () => {
    const returnPayload = rows.map(r => ({
      line_id:           r.id,
      returned_quantity: r.returned,
      damaged_quantity:  r.damaged,
      lost_quantity:     r.lost,
      damage_notes:      dmgNotes[r.id] || null,
    }));
    onConfirm({ returns: returnPayload, cash_collected: cashFloat });
  };

  return (
    <Modal open title="Day-End Close" onClose={onClose} size="xl">
      <div className="space-y-5">
        {hasInvoices && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
            <Truck size={13} /> {invoices.filter(i => i.status === 'POSTED').length} invoice(s) posted today — sold quantities are pre-filled from invoices.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th">Product</th>
                <th className="table-th text-right">Loaded</th>
                {hasInvoices && <th className="table-th text-right">Invoiced</th>}
                <th className="table-th text-right w-24">Returned</th>
                <th className="table-th text-right w-24 text-orange-600">Damaged</th>
                <th className="table-th text-right w-24 text-red-600">Lost</th>
                <th className="table-th text-right">Sold</th>
                <th className="table-th text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(row => (
                <tr key={row.id} className={row.unaccounted > 0 ? 'bg-yellow-50' : ''}>
                  <td className="table-td font-medium">
                    {row.Product?.name}
                    {(row.damaged > 0 || row.lost > 0) && (
                      <input
                        type="text"
                        value={dmgNotes[row.id] || ''}
                        onChange={e => setDmgNotes(prev => ({ ...prev, [row.id]: e.target.value }))}
                        placeholder="Notes (reason)…"
                        className="input-sm w-full mt-1 text-xs text-orange-700"
                      />
                    )}
                    {row.unaccounted > 0 && (
                      <span className="block text-xs text-yellow-700 mt-0.5">⚠ {fmtQty(row.unaccounted)} unaccounted</span>
                    )}
                  </td>
                  <td className="table-td text-right">{fmtQty(row.loaded)}</td>
                  {hasInvoices && <td className="table-td text-right text-blue-600">{fmtQty(row.invoiced)}</td>}
                  <td className="table-td">
                    <input type="number" min="0" max={row.loaded} step="0.001"
                      value={returns[row.id] ?? ''}
                      onChange={e => setReturns(prev => ({ ...prev, [row.id]: e.target.value }))}
                      onFocus={e => e.target.select()}
                      className="input-sm w-20 text-right ml-auto block" placeholder="0" />
                  </td>
                  <td className="table-td">
                    <input type="number" min="0" max={row.loaded} step="0.001"
                      value={damages[row.id] ?? ''}
                      onChange={e => setDamages(prev => ({ ...prev, [row.id]: e.target.value }))}
                      onFocus={e => e.target.select()}
                      className="input-sm w-20 text-right ml-auto block border-orange-300 text-orange-700" placeholder="0" />
                  </td>
                  <td className="table-td">
                    <input type="number" min="0" max={row.loaded} step="0.001"
                      value={losts[row.id] ?? ''}
                      onChange={e => setLosts(prev => ({ ...prev, [row.id]: e.target.value }))}
                      onFocus={e => e.target.select()}
                      className="input-sm w-20 text-right ml-auto block border-red-300 text-red-700" placeholder="0" />
                  </td>
                  <td className="table-td text-right font-semibold">{fmtQty(row.sold)}</td>
                  <td className="table-td text-right">{fmtCurrency(row.value)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {totalUnaccounted > 0 && (
                <tr className="bg-yellow-50 border-t border-yellow-200">
                  <td colSpan={hasInvoices ? 8 : 7} className="table-td text-center text-yellow-700 text-xs font-semibold">
                    ⚠ {fmtQty(totalUnaccounted)} unit(s) unaccounted — please fill Damaged or Lost columns
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={hasInvoices ? 6 : 5} className="table-td text-right font-semibold text-gray-700">Expected Cash</td>
                <td className="table-td text-right font-bold text-gray-900" colSpan={2}>{fmtCurrency(totalSoldValue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {totalCollected > 0 && (
          <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 font-medium">Today's Collections</p>
              <p className="text-base font-bold text-emerald-700">{fmtCurrency(totalCollected)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Outstanding</p>
              <p className={`text-base font-bold ${totalOutstanding > 0 ? 'text-red-600' : 'text-gray-400'}`}>{fmtCurrency(totalOutstanding)}</p>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 w-40 flex-shrink-0">Cash Collected (LKR)</label>
            <input
              type="number"
              step="0.01"
              value={cash}
              onChange={e => setCash(e.target.value)}
              onFocus={e => e.target.select()}
              className="input w-48 text-right"
              placeholder="0.00"
            />
            {cash !== '' && (
              <span className={`text-sm font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {variance >= 0 ? '+' : ''}{fmtCurrency(variance)} variance
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn bg-green-600 text-white hover:bg-green-700"
          >
            {isLoading ? 'Closing...' : 'Close Sheet'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AddInvoiceModal({ sheetId, onClose }) {
  const { data: available = [], isLoading } = useGetAvailableInvoicesQuery(sheetId);
  const [addInvoices, { isLoading: adding }] = useAddInvoicesToSheetMutation();
  const [selected, setSelected] = useState(new Set());

  const toggle = id => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (selected.size === available.length) setSelected(new Set());
    else setSelected(new Set(available.map(inv => inv.id)));
  };

  const handleAdd = async () => {
    if (!selected.size) return;
    try {
      const result = await addInvoices({ id: sheetId, invoice_ids: [...selected] }).unwrap();
      toast.success(`${result.linked} invoice${result.linked !== 1 ? 's' : ''} added to sheet`);
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed to add invoices'); }
  };

  return (
    <Modal open title="Add Invoices to Sheet" onClose={onClose} size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-gray-500">
            {selected.size > 0 ? `${selected.size} selected` : 'Select invoices below'}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button onClick={handleAdd} disabled={!selected.size || adding} className="btn btn-primary">
              {adding ? 'Adding…' : `Add ${selected.size || ''} Invoice${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div className="py-10 text-center text-gray-400">Loading available invoices…</div>
      ) : available.length === 0 ? (
        <div className="py-10 text-center">
          <FileText size={36} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500 font-medium">No posted invoices available</p>
          <p className="text-xs text-gray-400 mt-1">All posted invoices are already assigned to a loading sheet</p>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-3 px-1 pb-2 border-b border-gray-100">
            <button onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-800">
              <CheckSquare size={13} />
              {selected.size === available.length ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-xs text-gray-400">{available.length} available</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {available.map(inv => (
              <label key={inv.id} className={`flex items-center gap-3 px-2 py-3 cursor-pointer rounded-lg hover:bg-gray-50 transition-colors ${selected.has(inv.id) ? 'bg-primary-50/50' : ''}`}>
                <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggle(inv.id)}
                  className="w-4 h-4 accent-primary-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-primary-700">{inv.invoice_number}</span>
                    <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">POSTED</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span>{inv.Customer?.name || '—'}</span>
                    <span>{fmtDate(inv.invoice_date)}</span>
                  </div>
                </div>
                <span className="font-bold text-gray-900 font-mono text-sm flex-shrink-0">{fmtCurrency(inv.total_amount)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function LoadingSheetDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const canCreate = usePermission('sales.create');
  const canLoadVan = usePermission('sales.approve');

  const { data: sheet, isLoading } = useGetLoadingSheetQuery(id);
  const { data: company }          = useGetCompanyQuery();
  const [load,   { isLoading: loading  }] = useLoadLoadingSheetMutation();
  const [close,  { isLoading: closing  }] = useCloseLoadingSheetMutation();
  const [remove, { isLoading: deleting }] = useDeleteLoadingSheetMutation();
  const [removeInv,   { isLoading: unlinking }]  = useRemoveInvoiceFromSheetMutation();
  const [updateSheet, { isLoading: updatingSheet }] = useUpdateLoadingSheetMutation();
  const { data: drivers = [] } = useGetUsersForSelectQuery('delivery', { skip: !canLoadVan });

  const [showLoad,      setShowLoad]      = useState(false);
  const [showClose,     setShowClose]     = useState(false);
  const [showDelete,    setShowDelete]    = useState(false);
  const [showAddInv,    setShowAddInv]    = useState(false);

  const { data: expenseData, refetch: refetchExpenses } = useGetExpensesQuery({ loading_sheet_id: id, limit: 50 });
  const [createExpense, { isLoading: savingExpense }] = useCreateExpenseMutation();
  const [expForm, setExpForm] = useState({ description: '', amount: '', category: 'TRANSPORT', expense_date: today(), payment_method: 'CASH' });
  const [showExpForm, setShowExpForm] = useState(false);

  const handleAddExpense = async () => {
    if (!expForm.description || !expForm.amount) return toast.error('Description and amount required');
    try {
      await createExpense({ ...expForm, loading_sheet_id: Number(id) }).unwrap();
      toast.success('Expense recorded');
      setExpForm({ description: '', amount: '', category: 'TRANSPORT', expense_date: today(), payment_method: 'CASH' });
      setShowExpForm(false);
      refetchExpenses();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };
  const sheetExpenses = expenseData?.data || [];

  const handlePrint = () => printComponent(<LoadingSheetPrint sheet={sheet} company={company} />);
  const handlePrintInvoices = () => {
    const sheetInvoices = (sheet.Invoices || []).filter(i => ['POSTED','DELIVERED','PAID','PARTIAL'].includes(i.status));
    if (!sheetInvoices.length) return;
    printComponent(
      <div>
        {sheetInvoices.map((inv, idx) => (
          <div key={inv.id} style={idx < sheetInvoices.length - 1 ? { pageBreakAfter: 'always' } : {}}>
            <InvoicePrint invoice={inv} company={company} />
          </div>
        ))}
      </div>
    );
  };
  const handlePOSPrintInvoices = () => {
    const sheetInvoices = (sheet.Invoices || []).filter(i => ['POSTED','DELIVERED','PAID','PARTIAL'].includes(i.status));
    if (!sheetInvoices.length) return;
    printPOS(
      <div>
        {sheetInvoices.map((inv, idx) => (
          <div key={inv.id} style={idx < sheetInvoices.length - 1 ? { pageBreakAfter: 'always' } : {}}>
            <InvoicePrintPOS invoice={inv} company={company} />
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!sheet)    return <div className="text-center py-20 text-gray-500">Sheet not found</div>;

  const lines    = sheet.Lines || [];
  const invoices = sheet.Invoices || [];

  const handleDelete = async () => {
    try {
      await remove(sheet.id).unwrap();
      toast.success('Loading sheet deleted');
      navigate('/loading-sheets');
    } catch (e) {
      setShowDelete(false);
      toast.error(e.data?.message || 'Failed to delete');
    }
  };

  const handleLoad = async () => {
    try {
      await load(sheet.id).unwrap();
      setShowLoad(false);
      toast.success('Van loaded successfully');
    } catch (e) {
      setShowLoad(false);
      toast.error(e.data?.message || 'Failed to load van');
    }
  };

  const handleClose = async ({ returns, cash_collected }) => {
    try {
      await close({ id: sheet.id, returns, cash_collected }).unwrap();
      setShowClose(false);
      navigate('/loading-sheets');
    } catch (e) {
      setShowClose(false);
      toast.error(e.data?.message || 'Failed to close sheet');
    }
  };

  const vehicle = sheet.Vehicle
    ? `${sheet.Vehicle.registration_number}${sheet.Vehicle.make ? ` — ${sheet.Vehicle.make} ${sheet.Vehicle.model || ''}`.trimEnd() : ''}`
    : sheet.vehicle_number || '';

  const invoiceStatusColor = s => ({
    POSTED: 'text-green-700 bg-green-50', DRAFT: 'text-amber-700 bg-amber-50', PAID: 'text-blue-700 bg-blue-50',
  }[s] || 'text-gray-600 bg-gray-50');

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="space-y-3">
        {/* Top row: status */}
        <div className="flex items-center justify-end">
          <StatusBadge status={sheet.status} />
        </div>

        {/* Title + subtitle */}
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{sheet.sheet_number}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {fmtDate(sheet.sheet_date)}
            {sheet.Route?.name && <span> · {sheet.Route.name}</span>}
            {vehicle && <span> · {vehicle}</span>}
          </p>
        </div>

        {/* Action buttons — horizontally scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
          {sheet.status === 'DRAFT' && canLoadVan && (
            <>
              <button onClick={() => setShowLoad(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white whitespace-nowrap flex-shrink-0 shadow-sm transition-opacity active:opacity-80"
                style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                <Truck size={15} /> Load Van
              </button>
              <button onClick={() => setShowDelete(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 border border-red-200 whitespace-nowrap flex-shrink-0 transition-colors active:opacity-80">
                <Trash2 size={15} /> Delete
              </button>
            </>
          )}
          {sheet.status === 'LOADED' && canLoadVan && (
            <button onClick={() => setShowClose(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white whitespace-nowrap flex-shrink-0 shadow-sm transition-opacity active:opacity-80"
              style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)' }}>
              <RotateCcw size={15} /> Day-End Close
            </button>
          )}
          {sheet.status === 'LOADED' && canCreate && (
            <button onClick={() => navigate(`/invoices/create?sheet=${sheet.id}`)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 whitespace-nowrap flex-shrink-0 transition-colors active:opacity-80">
              <Plus size={15} /> Create Invoice
            </button>
          )}
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 border border-gray-200 whitespace-nowrap flex-shrink-0 transition-colors active:opacity-80">
            <Printer size={15} /> Print
          </button>
          <button onClick={handlePrintInvoices}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 border border-gray-200 whitespace-nowrap flex-shrink-0 transition-colors active:opacity-80">
            <Printer size={15} /> Print Invoices
          </button>
          <button onClick={handlePOSPrintInvoices}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 border border-gray-200 whitespace-nowrap flex-shrink-0 transition-colors active:opacity-80">
            <Printer size={15} /> POS Print
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="card">
        <div className="card-body grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-gray-500">Sales Rep</p><p className="font-semibold">{sheet.SalesRep?.name || '—'}</p></div>
          <div>
            <p className="text-gray-500">Driver</p>
            {sheet.Driver?.name ? (
              <p className="font-semibold">{sheet.Driver.name}</p>
            ) : canLoadVan && sheet.status !== 'CLOSED' ? (
              <select
                defaultValue=""
                disabled={updatingSheet}
                onChange={async e => {
                  if (!e.target.value) return;
                  try {
                    await updateSheet({ id: sheet.id, driver_id: Number(e.target.value) }).unwrap();
                    toast.success('Driver assigned');
                  } catch (err) { toast.error(err.data?.message || 'Failed'); }
                }}
                className="mt-0.5 text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full"
              >
                <option value="">Assign driver…</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            ) : (
              <p className="font-semibold text-gray-400">—</p>
            )}
          </div>
          <div><p className="text-gray-500">Warehouse</p><p className="font-semibold">{sheet.Warehouse?.name || '—'}</p></div>
          <div><p className="text-gray-500">Loaded Value</p><p className="font-semibold text-primary-700">{fmtCurrency(sheet.total_loaded_value)}</p></div>
          {sheet.status === 'CLOSED' && (
            <>
              <div><p className="text-gray-500">Total Sold</p><p className="font-semibold text-green-700">{fmtCurrency(sheet.total_sales_amount)}</p></div>
              <div><p className="text-gray-500">Cash Collected</p><p className="font-semibold">{fmtCurrency(sheet.cash_collected)}</p></div>
              <div>
                <p className="text-gray-500">Variance</p>
                <p className={`font-semibold ${parseFloat(sheet.cash_collected) >= parseFloat(sheet.total_sales_amount) ? 'text-green-600' : 'text-red-500'}`}>
                  {fmtCurrency(parseFloat(sheet.cash_collected) - parseFloat(sheet.total_sales_amount))}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Invoices card — shown for admin on DRAFT/LOADED sheets, or whenever invoices exist */}
      {(invoices.length > 0 || (canLoadVan && sheet.status !== 'CLOSED')) && (
        <div className="card">
          <div className="card-header flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-800">Invoices {invoices.length > 0 && `(${invoices.length})`}</h3>
            <div className="flex items-center gap-2">
              {canLoadVan && sheet.status !== 'CLOSED' && (
                <button onClick={() => setShowAddInv(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary-600 bg-primary-50 border border-primary-200 hover:bg-primary-100 transition-colors">
                  <Plus size={13} /> Add Existing
                </button>
              )}
              {sheet.status === 'LOADED' && canCreate && (
                <button onClick={() => navigate(`/invoices/create?sheet=${sheet.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors">
                  <Plus size={13} /> New Invoice
                </button>
              )}
            </div>
          </div>
          {invoices.length === 0 ? (
            <div className="p-8 text-center">
              <FileText size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No invoices linked yet</p>
              <p className="text-xs text-gray-300 mt-0.5">Use "Add Existing" to link posted invoices</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {invoices.map(inv => {
                const isPosted = inv.status === 'POSTED';
                return (
                <div key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                  {/* Left: invoice info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-primary-700">{inv.invoice_number}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${invoiceStatusColor(inv.status)}`}>{inv.status}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 truncate">{inv.Customer?.name}</p>
                    <p className="text-xs text-gray-400">{fmtDate(inv.invoice_date)}</p>
                  </div>
                  {/* Right: amount + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <span className="font-bold text-gray-900 font-mono text-sm">{fmtCurrency(inv.total_amount)}</span>
                    {isPosted && canCreate && sheet.status === 'LOADED' && (
                      <button
                        onClick={() => navigate(`/invoices/${inv.id}?collect=1`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700 active:bg-green-800 transition-colors whitespace-nowrap">
                        Collect
                      </button>
                    )}
                    {canLoadVan && sheet.status !== 'CLOSED' && (
                      <button
                        onClick={() => removeInv({ sheetId: sheet.id, invoiceId: inv.id })}
                        disabled={unlinking}
                        title="Remove from sheet"
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
              <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-t border-green-100">
                <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Total Invoiced</span>
                <span className="font-bold text-green-700 font-mono text-sm">
                  {fmtCurrency(invoices.filter(i => ['POSTED','DELIVERED','PAID','PARTIAL'].includes(i.status)).reduce((s, i) => s + parseFloat(i.total_amount), 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lines */}
      {(() => {
        const enriched = lines
          .map(line => {
            const loaded   = parseFloat(line.loaded_quantity) || 0;
            const sold     = parseFloat(line.sold_quantity) || 0;
            const returned = parseFloat(line.returned_quantity) || 0;
            const damaged  = parseFloat(line.damaged_quantity) || 0;
            const lost     = parseFloat(line.lost_quantity) || 0;
            const avail    = Math.max(0, loaded - sold - returned);
            return { ...line, _loaded: loaded, _sold: sold, _returned: returned, _damaged: damaged, _lost: lost, _avail: avail };
          })
          .sort((a, b) => sheet.status === 'LOADED' ? a._avail - b._avail : 0);

        return (
          <div className="card">
            <div className="card-header flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-gray-800">Loaded Items <span className="text-gray-400 font-normal">({enriched.length})</span></h3>
              {sheet.status === 'LOADED' && (
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> In stock</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Low</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Out</span>
                </div>
              )}
            </div>

            {/* ── Desktop table ── */}
            <div className="hidden md:block card-body">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-th">Product</th>
                    <th className="table-th text-right">Loaded</th>
                    <th className="table-th text-right">Sold</th>
                    <th className="table-th text-right">Returned</th>
                    {sheet.status === 'CLOSED' && <th className="table-th text-right text-orange-600">Damaged</th>}
                    {sheet.status === 'CLOSED' && <th className="table-th text-right text-red-600">Lost</th>}
                    {sheet.status === 'LOADED' && <th className="table-th text-right">Available</th>}
                    {sheet.status !== 'LOADED' && <th className="table-th text-right">Unit Cost</th>}
                    {sheet.status !== 'LOADED' && <th className="table-th text-right">Value</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {enriched.map(line => (
                    <tr key={line.id} className={
                      (sheet.status === 'LOADED' && line._avail === 0) ? 'bg-red-50/40' :
                      (sheet.status === 'CLOSED' && (line._damaged > 0 || line._lost > 0)) ? 'bg-orange-50/40' : ''
                    }>
                      <td className="table-td font-medium">
                        {line.Product?.name}
                        {line.damage_notes && <span className="block text-xs text-orange-600 mt-0.5">{line.damage_notes}</span>}
                      </td>
                      <td className="table-td text-right">{fmtQty(line._loaded)}</td>
                      <td className="table-td text-right font-semibold text-blue-700">{fmtQty(line._sold)}</td>
                      <td className="table-td text-right text-gray-500">{fmtQty(line._returned)}</td>
                      {sheet.status === 'CLOSED' && <td className="table-td text-right text-orange-600 font-semibold">{line._damaged > 0 ? fmtQty(line._damaged) : '—'}</td>}
                      {sheet.status === 'CLOSED' && <td className="table-td text-right text-red-600 font-semibold">{line._lost > 0 ? fmtQty(line._lost) : '—'}</td>}
                      {sheet.status === 'LOADED' && (
                        <td className="table-td text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${availColor(line._avail, line._loaded)}`}>
                            {line._avail === 0 ? 'OUT' : fmtQty(line._avail)}
                          </span>
                        </td>
                      )}
                      {sheet.status !== 'LOADED' && (
                        <>
                          <td className="table-td text-right text-gray-500">{fmtCurrency(line.unit_cost)}</td>
                          <td className="table-td text-right">{fmtCurrency(line._sold * parseFloat(line.unit_cost))}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                {sheet.status === 'CLOSED' && (
                  <tfoot>
                    {lines.some(l => parseFloat(l.damaged_quantity) > 0 || parseFloat(l.lost_quantity) > 0) && (
                      <tr className="bg-orange-50 border-t border-orange-200">
                        <td colSpan={7} className="table-td text-xs text-orange-700 font-semibold">
                          Damaged: {fmtQty(lines.reduce((s,l) => s + (parseFloat(l.damaged_quantity)||0), 0))} units &nbsp;|&nbsp;
                          Lost: {fmtQty(lines.reduce((s,l) => s + (parseFloat(l.lost_quantity)||0), 0))} units
                        </td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td colSpan={7} className="table-td text-right font-semibold">Total Sales</td>
                      <td className="table-td text-right font-bold text-green-700">{fmtCurrency(sheet.total_sales_amount)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* ── Mobile cards ── */}
            <div className="md:hidden divide-y divide-gray-100">
              {enriched.map(line => (
                <div key={line.id} className={`p-4 ${
                  (sheet.status === 'LOADED' && line._avail === 0) ? 'bg-red-50/60' :
                  (sheet.status === 'CLOSED' && (line._damaged > 0 || line._lost > 0)) ? 'bg-orange-50/60' : ''
                }`}>
                  {/* Product name + available badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{line.Product?.name}</p>
                      {line.damage_notes && <p className="text-xs text-orange-600 mt-0.5">{line.damage_notes}</p>}
                    </div>
                    {sheet.status === 'LOADED' && (
                      <span className={`flex-shrink-0 inline-block px-2.5 py-1 rounded-full text-xs font-bold ${availColor(line._avail, line._loaded)}`}>
                        {line._avail === 0 ? 'OUT' : `${fmtQty(line._avail)} avail`}
                      </span>
                    )}
                    {sheet.status === 'CLOSED' && (
                      <span className="flex-shrink-0 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                        {fmtCurrency(line._sold * parseFloat(line.unit_cost))}
                      </span>
                    )}
                  </div>

                  {/* Stat pills */}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Loaded</span>
                      <span className="font-bold text-gray-800 text-sm">{fmtQty(line._loaded)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-blue-50 rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">Sold</span>
                      <span className="font-bold text-blue-700 text-sm">{fmtQty(line._sold)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Returned</span>
                      <span className="font-bold text-gray-600 text-sm">{fmtQty(line._returned)}</span>
                    </div>
                    {sheet.status === 'CLOSED' && line._damaged > 0 && (
                      <div className="flex items-center gap-1.5 bg-orange-50 rounded-lg px-2.5 py-1.5">
                        <span className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide">Damaged</span>
                        <span className="font-bold text-orange-700 text-sm">{fmtQty(line._damaged)}</span>
                      </div>
                    )}
                    {sheet.status === 'CLOSED' && line._lost > 0 && (
                      <div className="flex items-center gap-1.5 bg-red-50 rounded-lg px-2.5 py-1.5">
                        <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wide">Lost</span>
                        <span className="font-bold text-red-700 text-sm">{fmtQty(line._lost)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {sheet.status === 'CLOSED' && (
                <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-t border-green-100">
                  <span className="text-sm font-semibold text-green-700">Total Sales</span>
                  <span className="font-extrabold text-green-700 font-mono">{fmtCurrency(sheet.total_sales_amount)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}


      {/* Route Expenses */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Route Expenses</h3>
            {sheetExpenses.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{sheetExpenses.length} expense{sheetExpenses.length > 1 ? 's' : ''}</p>
            )}
          </div>
          {!showExpForm && (
            <button onClick={() => setShowExpForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-primary-600 bg-primary-50 border border-primary-200 hover:bg-primary-100 transition-colors">
              <Plus size={13} /> Add Expense
            </button>
          )}
        </div>

        {/* Add expense form */}
        {showExpForm && (
          <div className="p-4 border-b border-gray-100 space-y-3 bg-gray-50/50">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
              <input type="text" placeholder="e.g. Fuel for Route A"
                value={expForm.description}
                onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))}
                className="input w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount (LKR)</label>
                <input type="number" step="0.01" placeholder="0.00" value={expForm.amount}
                  onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))}
                  className="input" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
                <select value={expForm.category} onChange={e => setExpForm(p => ({ ...p, category: e.target.value }))} className="input">
                  <option value="TRANSPORT">Transport</option>
                  <option value="FUEL">Fuel</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
                <input type="date" value={expForm.expense_date}
                  onChange={e => setExpForm(p => ({ ...p, expense_date: e.target.value }))}
                  className="input" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Method</label>
                <select value={expForm.payment_method} onChange={e => setExpForm(p => ({ ...p, payment_method: e.target.value }))} className="input">
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setShowExpForm(false)} className="btn btn-secondary">Cancel</button>
              <button type="button" onClick={handleAddExpense} disabled={savingExpense} className="btn btn-primary">
                {savingExpense ? 'Saving…' : 'Save Expense'}
              </button>
            </div>
          </div>
        )}

        {/* Expense list */}
        {sheetExpenses.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">No expenses recorded for this trip</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {sheetExpenses.map(exp => (
                <div key={exp.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{exp.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {exp.category}
                      </span>
                      <span className="text-xs text-gray-400">{fmtDate(exp.expense_date)}</span>
                      <span className="text-xs text-gray-400">{exp.payment_method}</span>
                    </div>
                  </div>
                  <p className="font-bold text-red-600 font-mono text-sm flex-shrink-0">{fmtCurrency(exp.amount)}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-t border-red-100">
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Total Expenses</span>
              <span className="font-extrabold text-red-700 font-mono">
                {fmtCurrency(sheetExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0))}
              </span>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={showDelete}
        onCancel={() => setShowDelete(false)}
        onConfirm={handleDelete}
        loading={deleting}
        variant="danger"
        title="Delete Loading Sheet"
        confirmLabel="Delete"
        loadingLabel="Deleting..."
        message={`Permanently delete ${sheet.sheet_number}? This cannot be undone.`}
      />

      <ConfirmDialog
        open={showLoad}
        onCancel={() => setShowLoad(false)}
        onConfirm={handleLoad}
        loading={loading}
        title="Load Van"
        confirmLabel="Load Van"
        loadingLabel="Loading..."
        message="This will deduct the loaded quantities from warehouse stock and mark the sheet as LOADED. Continue?"
      />

      {showClose && (
        <DayEndCloseModal
          sheet={sheet}
          onClose={() => setShowClose(false)}
          onConfirm={handleClose}
          isLoading={closing}
        />
      )}

      {showAddInv && (
        <AddInvoiceModal sheetId={sheet.id} onClose={() => setShowAddInv(false)} />
      )}
    </div>
  );
}
