import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useGetLoadingSheetQuery, useCloseLoadingSheetMutation } from '../../api/salesApi';
import { useGetCompanyQuery } from '../../api/reportsApi';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSheetPrint from '../../components/print/LoadingSheetPrint';
import { fmtCurrency, fmtDate } from '../../utils/format';
import { usePermission } from '../../hooks/usePermission';

export default function LoadingSheetDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const printRef   = useRef(null);
  const canCreate  = usePermission('sales.create');
  const { data: sheet, isLoading } = useGetLoadingSheetQuery(id);
  const { data: company }          = useGetCompanyQuery();
  const [close, { isLoading: closing }] = useCloseLoadingSheetMutation();
  const [showClose, setShowClose] = useState(false);
  const [returns, setReturns]     = useState({});
  const handlePrint = useReactToPrint({ contentRef: printRef });

  if (isLoading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!sheet) return <div className="text-center py-20 text-gray-500">Sheet not found</div>;

  const handleClose = async () => {
    const returnPayload = Object.entries(returns)
      .filter(([, qty]) => parseFloat(qty) > 0)
      .map(([line_id, returned_quantity]) => ({ line_id: Number(line_id), returned_quantity: parseFloat(returned_quantity) }));
    await close({ id: sheet.id, returns: returnPayload }).unwrap();
    setShowClose(false);
    navigate('/loading-sheets');
  };

  const lines = sheet.Lines || [];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/loading-sheets')} className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{sheet.sheet_number}</h1>
          <p className="text-sm text-gray-500">{fmtDate(sheet.sheet_date)} · {sheet.Route?.name} · {sheet.vehicle_number}</p>
        </div>
        <button onClick={handlePrint} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5">
          <Printer size={15} /> Print
        </button>
        <StatusBadge status={sheet.status} />
      </div>

      {/* Header info */}
      <div className="card">
        <div className="card-body grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-gray-500">Sales Rep</p><p className="font-semibold">{sheet.SalesRep?.name || '—'}</p></div>
          <div><p className="text-gray-500">Driver</p><p className="font-semibold">{sheet.Driver?.name || '—'}</p></div>
          <div><p className="text-gray-500">Warehouse</p><p className="font-semibold">{sheet.Warehouse?.name || '—'}</p></div>
          <div><p className="text-gray-500">Loaded Value</p><p className="font-semibold text-primary-700">{fmtCurrency(sheet.total_loaded_value)}</p></div>
        </div>
      </div>

      {/* Lines */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-800">Loaded Items</h3>
          {sheet.status === 'LOADED' && canCreate && (
            <button onClick={() => setShowClose(true)} className="btn btn-sm bg-green-600 text-white hover:bg-green-700">
              <RotateCcw size={14} /> Day-End Close
            </button>
          )}
        </div>
        <div className="card-body">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th">Product</th>
                <th className="table-th text-right">Loaded</th>
                <th className="table-th text-right">Returned</th>
                <th className="table-th text-right">Sold</th>
                <th className="table-th text-right">Unit Cost</th>
                <th className="table-th text-right">Value</th>
                {sheet.status === 'LOADED' && <th className="table-th text-right">Return Qty</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lines.map(line => (
                <tr key={line.id}>
                  <td className="table-td font-medium">{line.Product?.name}</td>
                  <td className="table-td text-right">{parseFloat(line.loaded_quantity).toFixed(2)}</td>
                  <td className="table-td text-right">{parseFloat(line.returned_quantity || 0).toFixed(2)}</td>
                  <td className="table-td text-right font-semibold">{parseFloat(line.sold_quantity || 0).toFixed(2)}</td>
                  <td className="table-td text-right text-gray-500">{fmtCurrency(line.unit_cost)}</td>
                  <td className="table-td text-right">{fmtCurrency(parseFloat(line.loaded_quantity) * parseFloat(line.unit_cost))}</td>
                  {sheet.status === 'LOADED' && (
                    <td className="table-td">
                      <input
                        type="number"
                        min="0"
                        max={line.loaded_quantity}
                        step="0.001"
                        value={returns[line.id] ?? ''}
                        onChange={e => setReturns(prev => ({ ...prev, [line.id]: e.target.value }))}
                        className="input-sm w-24 text-right"
                        placeholder="0"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {sheet.status === 'CLOSED' && (
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={5} className="table-td text-right font-semibold">Total Sales</td>
                  <td className="table-td text-right font-bold text-green-700">{fmtCurrency(sheet.total_sales_amount)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Hidden print template */}
      <div ref={printRef} style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}>
        <LoadingSheetPrint sheet={sheet} company={company} />
      </div>

      <ConfirmDialog
        open={showClose}
        onCancel={() => setShowClose(false)}
        onConfirm={handleClose}
        loading={closing}
        variant="warning"
        title="Close Loading Sheet"
        confirmLabel="Close Sheet"
        loadingLabel="Closing..."
        message="This will return stock for unsold items and mark the sheet as CLOSED. This cannot be undone."
      />
    </div>
  );
}
