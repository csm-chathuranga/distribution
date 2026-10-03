import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetCustomerReturnQuery, useConfirmCustomerReturnMutation, useCancelCustomerReturnMutation } from '../../api/salesApi';
import { fmtDate, fmtCurrency } from '../../utils/format';

const STATUS_BADGE = {
  DRAFT:     'badge-warning',
  CONFIRMED: 'badge-success',
  CREDITED:  'badge-info',
  CANCELLED: 'badge-danger',
};

export default function CustomerReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: ret, isLoading } = useGetCustomerReturnQuery(id);
  const [confirm, { isLoading: confirming }] = useConfirmCustomerReturnMutation();
  const [cancel,  { isLoading: cancelling }] = useCancelCustomerReturnMutation();

  const handleConfirm = async () => {
    try {
      await confirm(id).unwrap();
      toast.success('Return confirmed — stock updated');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this return note?')) return;
    try {
      await cancel(id).unwrap();
      toast.success('Return cancelled');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const handlePrint = () => window.print();

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading…</div>;
  if (!ret) return <div className="p-8 text-center text-red-500">Return note not found</div>;

  const lines = ret.Lines || [];
  const totalValue = lines.reduce((s, l) => s + parseFloat(l.quantity) * parseFloat(l.unit_price), 0);

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12px; }
          .print-border { border: 1px solid #000 !important; }
        }
      `}</style>

      <div className="max-w-2xl mx-auto space-y-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/customer-returns')} className="p-2 text-gray-500 hover:text-gray-900">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Return Note</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn btn-secondary flex items-center gap-1">
              <Printer size={15} /> Print
            </button>
            {ret.status === 'DRAFT' && (
              <>
                <button onClick={handleConfirm} disabled={confirming}
                  className="btn btn-primary flex items-center gap-1">
                  <CheckCircle size={15} /> Confirm &amp; Restock
                </button>
                <button onClick={handleCancel} disabled={cancelling}
                  className="btn btn-danger flex items-center gap-1">
                  <XCircle size={15} /> Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Printable document */}
        <div className="card p-6 print-border">
          {/* Document heading */}
          <div className="text-center mb-6 border-b border-gray-200 pb-4">
            <h2 className="text-2xl font-bold tracking-wide uppercase">Customer Return Note</h2>
            <p className="text-gray-500 text-sm mt-1">This document certifies that the listed goods were returned</p>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
            <div>
              <span className="text-gray-500">Return No:</span>
              <span className="ml-2 font-mono font-bold text-primary-700">{ret.return_number}</span>
            </div>
            <div>
              <span className="text-gray-500">Date:</span>
              <span className="ml-2 font-semibold">{fmtDate(ret.return_date)}</span>
            </div>
            <div>
              <span className="text-gray-500">Customer:</span>
              <span className="ml-2 font-semibold">{ret.Customer?.name}</span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <span className={`ml-2 badge ${STATUS_BADGE[ret.status]}`}>{ret.status}</span>
            </div>
            {ret.OriginalInvoice && (
              <div>
                <span className="text-gray-500">Original Invoice:</span>
                <span className="ml-2 font-mono">{ret.OriginalInvoice.invoice_number}</span>
              </div>
            )}
            {ret.CreditNote && (
              <div>
                <span className="text-gray-500">Credit Note:</span>
                <span className="ml-2 font-mono">{ret.CreditNote.invoice_number}</span>
              </div>
            )}
          </div>

          {/* Items table */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2 font-semibold">Product</th>
                <th className="text-left py-2 font-semibold w-24">SKU</th>
                <th className="text-right py-2 font-semibold w-20">Qty</th>
                <th className="text-right py-2 font-semibold w-28">Unit Price</th>
                <th className="text-right py-2 font-semibold w-28">Value</th>
                <th className="text-left py-2 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map((line, i) => (
                <tr key={i}>
                  <td className="py-2">{line.Product?.name}</td>
                  <td className="py-2 text-gray-500 font-mono text-xs">{line.Product?.sku}</td>
                  <td className="py-2 text-right font-semibold">{parseFloat(line.quantity)}</td>
                  <td className="py-2 text-right">{fmtCurrency(line.unit_price)}</td>
                  <td className="py-2 text-right font-semibold">{fmtCurrency(parseFloat(line.quantity) * parseFloat(line.unit_price))}</td>
                  <td className="py-2 text-gray-500 text-xs">{line.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300">
                <td colSpan={4} className="py-2 text-right font-bold text-gray-800">Total Return Value</td>
                <td className="py-2 text-right font-bold text-red-700 text-base">{fmtCurrency(totalValue)}</td>
                <td />
              </tr>
            </tfoot>
          </table>

          {ret.notes && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <span className="font-semibold">Notes: </span>{ret.notes}
            </div>
          )}

          {/* Signature section */}
          <div className="grid grid-cols-2 gap-8 mt-10 pt-6 border-t border-gray-200 text-sm text-gray-600">
            <div>
              <div className="border-b border-gray-400 h-10 mb-1" />
              <span>Driver / Sales Rep Signature</span>
            </div>
            <div>
              <div className="border-b border-gray-400 h-10 mb-1" />
              <span>Customer Signature</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
