import { useState } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Printer, Truck, Trash2, Plus } from 'lucide-react';
import { useGetLoadingSheetQuery, useLoadLoadingSheetMutation, useCloseLoadingSheetMutation, useDeleteLoadingSheetMutation } from '../../api/salesApi';
import { useGetCompanyQuery } from '../../api/reportsApi';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import LoadingSheetPrint from '../../components/print/LoadingSheetPrint';
import { printComponent } from '../../utils/print';
import { fmtCurrency, fmtDate } from '../../utils/format';
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
  const hasInvoices = invoices.filter(i => i.status === 'POSTED').length > 0;

  // Pre-fill returns with expected quantity (loaded - invoiced) when invoices exist
  const initReturns = {};
  if (hasInvoices) {
    lines.forEach(line => {
      const remaining = Math.max(0, parseFloat(line.loaded_quantity) - parseFloat(line.sold_quantity || 0));
      if (remaining > 0) initReturns[line.id] = String(remaining);
    });
  }
  const [returns, setReturns] = useState(initReturns);
  const [cash, setCash] = useState('');

  const rows = lines.map(line => {
    const loaded   = parseFloat(line.loaded_quantity) || 0;
    const invoiced = hasInvoices ? (parseFloat(line.sold_quantity || 0)) : 0;
    const returned = parseFloat(returns[line.id] || 0);
    const sold     = hasInvoices ? invoiced : Math.max(0, loaded - returned);
    const value    = sold * (parseFloat(line.unit_cost) || 0);
    return { ...line, loaded, invoiced, returned, sold, value };
  });

  const totalSoldValue = rows.reduce((s, r) => s + r.value, 0);
  const cashFloat = parseFloat(cash) || 0;
  const variance = cashFloat - totalSoldValue;

  const handleSubmit = () => {
    const returnPayload = rows
      .filter(r => r.returned > 0)
      .map(r => ({ line_id: r.id, returned_quantity: r.returned }));
    onConfirm({ returns: returnPayload, cash_collected: cashFloat });
  };

  return (
    <Modal open title="Day-End Close" onClose={onClose} size="lg">
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
                <th className="table-th text-right w-28">Returned</th>
                <th className="table-th text-right">Sold</th>
                <th className="table-th text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="table-td font-medium">{row.Product?.name}</td>
                  <td className="table-td text-right">{fmtQty(row.loaded)}</td>
                  {hasInvoices && <td className="table-td text-right text-blue-600">{fmtQty(row.invoiced)}</td>}
                  <td className="table-td">
                    <input
                      type="number"
                      min="0"
                      max={row.loaded}
                      step="0.001"
                      value={returns[row.id] ?? ''}
                      onChange={e => setReturns(prev => ({ ...prev, [row.id]: e.target.value }))}
                      onFocus={e => e.target.select()}
                      className="input-sm w-24 text-right ml-auto block"
                      placeholder="0"
                    />
                  </td>
                  <td className="table-td text-right font-semibold">{fmtQty(row.sold)}</td>
                  <td className="table-td text-right">{fmtCurrency(row.value)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={hasInvoices ? 4 : 3} className="table-td text-right font-semibold text-gray-700">Expected Cash</td>
                <td className="table-td text-right font-bold text-gray-900" colSpan={2}>{fmtCurrency(totalSoldValue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

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

export default function LoadingSheetDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const canCreate = usePermission('sales.create');

  const { data: sheet, isLoading } = useGetLoadingSheetQuery(id);
  const { data: company }          = useGetCompanyQuery();
  const [load,   { isLoading: loading  }] = useLoadLoadingSheetMutation();
  const [close,  { isLoading: closing  }] = useCloseLoadingSheetMutation();
  const [remove, { isLoading: deleting }] = useDeleteLoadingSheetMutation();

  const [showLoad,   setShowLoad]   = useState(false);
  const [showClose,  setShowClose]  = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handlePrint = () => printComponent(<LoadingSheetPrint sheet={sheet} company={company} />);

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
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/loading-sheets')} className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{sheet.sheet_number}</h1>
          <p className="text-sm text-gray-500">{fmtDate(sheet.sheet_date)} · {sheet.Route?.name}{vehicle ? ` · ${vehicle}` : ''}</p>
        </div>
        {sheet.status === 'DRAFT' && canCreate && (
          <>
            <button onClick={() => setShowDelete(true)} className="btn flex items-center gap-1.5 text-sm text-red-600 border border-red-200 hover:bg-red-50">
              <Trash2 size={15} /> Delete
            </button>
            <button onClick={() => setShowLoad(true)} className="btn btn-primary flex items-center gap-1.5 text-sm">
              <Truck size={15} /> Load Van
            </button>
          </>
        )}
        {sheet.status === 'LOADED' && canCreate && (
          <>
            <button onClick={() => navigate(`/invoices/create?sheet=${sheet.id}`)} className="btn btn-secondary flex items-center gap-1.5 text-sm">
              <Plus size={15} /> Create Invoice
            </button>
            <button onClick={() => setShowClose(true)} className="btn flex items-center gap-1.5 text-sm bg-green-600 text-white hover:bg-green-700">
              <RotateCcw size={15} /> Day-End Close
            </button>
          </>
        )}
        <button onClick={handlePrint} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5">
          <Printer size={15} /> Print
        </button>
        <StatusBadge status={sheet.status} />
      </div>

      {/* Info card */}
      <div className="card">
        <div className="card-body grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-gray-500">Sales Rep</p><p className="font-semibold">{sheet.SalesRep?.name || '—'}</p></div>
          <div><p className="text-gray-500">Driver</p><p className="font-semibold">{sheet.Driver?.name || '—'}</p></div>
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

      {/* Invoices card — shown when any invoices exist */}
      {invoices.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Invoices ({invoices.length})</h3>
            {sheet.status === 'LOADED' && canCreate && (
              <button onClick={() => navigate(`/invoices/create?sheet=${sheet.id}`)}
                className="flex items-center gap-1 text-xs text-primary-600 font-semibold hover:text-primary-800">
                <Plus size={13} /> New Invoice
              </button>
            )}
          </div>
          <div className="card-body">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th">Invoice #</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Date</th>
                  <th className="table-th text-right">Amount</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <td className="table-td font-mono text-primary-700">{inv.invoice_number}</td>
                    <td className="table-td">{inv.Customer?.name}</td>
                    <td className="table-td text-gray-500">{fmtDate(inv.invoice_date)}</td>
                    <td className="table-td text-right font-semibold">{fmtCurrency(inv.total_amount)}</td>
                    <td className="table-td">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${invoiceStatusColor(inv.status)}`}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={3} className="table-td text-right font-semibold">Total Invoiced</td>
                  <td className="table-td text-right font-bold text-green-700">
                    {fmtCurrency(invoices.filter(i => i.status === 'POSTED').reduce((s, i) => s + parseFloat(i.total_amount), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Lines */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Loaded Items</h3>
          {sheet.status === 'LOADED' && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> In stock</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Low (&le;25%)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Out</span>
            </div>
          )}
        </div>
        <div className="card-body">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th">Product</th>
                <th className="table-th text-right">Loaded</th>
                <th className="table-th text-right">Sold</th>
                <th className="table-th text-right">Returned</th>
                {sheet.status === 'LOADED' && <th className="table-th text-right">Available</th>}
                {sheet.status !== 'LOADED' && <th className="table-th text-right">Unit Cost</th>}
                {sheet.status !== 'LOADED' && <th className="table-th text-right">Value</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lines
                .map(line => {
                  const loaded   = parseFloat(line.loaded_quantity) || 0;
                  const sold     = parseFloat(line.sold_quantity) || 0;
                  const returned = parseFloat(line.returned_quantity) || 0;
                  const avail    = Math.max(0, loaded - sold - returned);
                  return { ...line, _loaded: loaded, _sold: sold, _returned: returned, _avail: avail };
                })
                .sort((a, b) => sheet.status === 'LOADED' ? a._avail - b._avail : 0)
                .map(line => (
                <tr key={line.id} className={sheet.status === 'LOADED' && line._avail === 0 ? 'bg-red-50/40' : ''}>
                  <td className="table-td font-medium">{line.Product?.name}</td>
                  <td className="table-td text-right">{fmtQty(line._loaded)}</td>
                  <td className="table-td text-right font-semibold text-blue-700">{fmtQty(line._sold)}</td>
                  <td className="table-td text-right text-gray-500">{fmtQty(line._returned)}</td>
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
                      <td className="table-td text-right">{fmtCurrency(line._loaded * parseFloat(line.unit_cost))}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            {sheet.status === 'CLOSED' && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={5} className="table-td text-right font-semibold">Total Sales</td>
                  <td className="table-td text-right font-bold text-green-700">{fmtCurrency(sheet.total_sales_amount)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
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
    </div>
  );
}
