import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetPOQuery, useApprovePOMutation } from '../../api/purchasingApi';
import { useGetCompanyQuery } from '../../api/reportsApi';
import { usePermission } from '../../hooks/usePermission';
import StatusBadge from '../../components/ui/StatusBadge';
import PurchaseOrderPrint from '../../components/print/PurchaseOrderPrint';
import { printComponent } from '../../utils/print';
import { fmtCurrency, fmtDate } from '../../utils/format';

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canApprove = usePermission('purchase.approve');

  const { data: po, isLoading } = useGetPOQuery(id);
  const { data: company } = useGetCompanyQuery();
  const [approvePO, { isLoading: approving }] = useApprovePOMutation();
  const handlePrint = () => printComponent(<PurchaseOrderPrint po={po} company={company} />);

  const handleApprove = async () => {
    try {
      await approvePO(id).unwrap();
      toast.success('Purchase order approved');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  if (isLoading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  if (!po) return <div className="text-center py-20 text-gray-400">Purchase order not found</div>;

  const lines = po.Lines || [];
  const total = parseFloat(po.total_amount || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/purchase-orders')} className="p-2 text-gray-500 hover:text-gray-900">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{po.po_number}</h1>
            <StatusBadge status={po.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{po.Supplier?.name} · {fmtDate(po.order_date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Printer size={15} /> Print
          </button>
          {po.status === 'DRAFT' && canApprove && (
            <button onClick={handleApprove} disabled={approving} className="btn-primary flex items-center gap-1.5 text-sm">
              <CheckCircle size={15} /> {approving ? 'Approving…' : 'Approve PO'}
            </button>
          )}
        </div>
      </div>

      {/* Details card */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 border-b pb-2 mb-4">Order Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Supplier</p>
            <p className="font-medium text-gray-900">{po.Supplier?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Order Date</p>
            <p className="font-medium text-gray-900">{fmtDate(po.order_date)}</p>
          </div>
          {po.expected_date && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Expected Date</p>
              <p className="font-medium text-gray-900">{fmtDate(po.expected_date)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Status</p>
            <StatusBadge status={po.status} />
          </div>
          {po.payment_terms && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Payment Terms</p>
              <p className="font-medium text-gray-900">{po.payment_terms}</p>
            </div>
          )}
          {po.notes && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-xs text-gray-500 mb-0.5">Notes</p>
              <p className="text-gray-700">{po.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Lines */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 border-b pb-2 mb-4">Ordered Items</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 font-medium text-gray-600">Product</th>
              <th className="py-2 font-medium text-gray-600 text-right w-24">Qty</th>
              <th className="py-2 font-medium text-gray-600 text-right w-32">Unit Cost</th>
              <th className="py-2 font-medium text-gray-600 text-right w-32">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lines.map(line => (
              <tr key={line.id}>
                <td className="py-2.5">
                  <p className="font-medium text-gray-900">{line.Product?.name || `Product #${line.product_id}`}</p>
                  <p className="text-xs text-gray-400 font-mono">{line.Product?.sku}</p>
                </td>
                <td className="py-2.5 text-right font-mono">{parseFloat(line.quantity_ordered || line.quantity || 0)}</td>
                <td className="py-2.5 text-right font-mono">{fmtCurrency(line.unit_cost)}</td>
                <td className="py-2.5 text-right font-mono font-semibold">{fmtCurrency(line.line_total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2">
              <td colSpan={3} className="py-3 text-right font-semibold">Total:</td>
              <td className="py-3 text-right font-bold text-lg font-mono">{fmtCurrency(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
}
