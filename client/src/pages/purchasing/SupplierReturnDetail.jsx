import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, RotateCcw, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetSupplierReturnQuery, usePostSupplierReturnMutation } from '../../api/purchasingApi';
import { useGetCompanyQuery } from '../../api/reportsApi';
import { usePermission } from '../../hooks/usePermission';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SupplierReturnPrint from '../../components/print/SupplierReturnPrint';
import { printComponent } from '../../utils/print';
import { fmtCurrency, fmtDate } from '../../utils/format';

export default function SupplierReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canApprove = usePermission('purchase.approve');

  const { data: ret, isLoading } = useGetSupplierReturnQuery(id);
  const { data: company } = useGetCompanyQuery();
  const [postReturn, { isLoading: posting }] = usePostSupplierReturnMutation();
  const [confirmPost, setConfirmPost] = useState(false);
  const handlePrint = () => printComponent(<SupplierReturnPrint ret={ret} company={company} />);

  const handlePost = async () => {
    try {
      await postReturn(id).unwrap();
      toast.success('Supplier return posted');
      setConfirmPost(false);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  if (isLoading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  if (!ret) return <div className="text-center py-20 text-gray-400">Not found</div>;

  const lines = ret.Lines || [];
  const total = lines.reduce((s, l) => s + parseFloat(l.line_total || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/supplier-returns')} className="p-2 text-gray-500 hover:text-gray-900">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{ret.return_number}</h1>
            <StatusBadge status={ret.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{ret.Supplier?.name} · {fmtDate(ret.return_date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Printer size={15} /> Print
          </button>
          {ret.status === 'DRAFT' && canApprove && (
            <button onClick={() => setConfirmPost(true)} className="btn-primary flex items-center gap-1.5 text-sm">
              <RotateCcw size={15} /> Post Return
            </button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 border-b pb-2 mb-4">Return Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Supplier</p>
            <p className="font-medium text-gray-900">{ret.Supplier?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Return Date</p>
            <p className="font-medium text-gray-900">{fmtDate(ret.return_date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Status</p>
            <StatusBadge status={ret.status} />
          </div>
          {ret.GoodsReceived && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">GRN Reference</p>
              <button
                onClick={() => navigate(`/grn/${ret.goods_received_id}`)}
                className="font-medium text-primary-600 hover:underline font-mono"
              >
                {ret.GoodsReceived.grn_number}
              </button>
            </div>
          )}
          {ret.notes && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-xs text-gray-500 mb-0.5">Notes</p>
              <p className="text-gray-700">{ret.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Lines */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 border-b pb-2 mb-4">Returned Items</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 font-medium text-gray-600">Product</th>
              <th className="py-2 font-medium text-gray-600 text-right w-28">Qty</th>
              <th className="py-2 font-medium text-gray-600 text-right w-36">Unit Cost</th>
              <th className="py-2 font-medium text-gray-600 text-right w-36">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lines.map(line => (
              <tr key={line.id}>
                <td className="py-2.5">
                  <p className="font-medium text-gray-900">{line.Product?.name}</p>
                  <p className="text-xs text-gray-400">{line.Product?.sku}</p>
                </td>
                <td className="py-2.5 text-right font-mono">{parseFloat(line.quantity)}</td>
                <td className="py-2.5 text-right font-mono">{fmtCurrency(line.unit_cost)}</td>
                <td className="py-2.5 text-right font-mono font-semibold text-red-600">{fmtCurrency(line.line_total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2">
              <td colSpan={3} className="py-3 text-right font-semibold">Total:</td>
              <td className="py-3 text-right font-bold text-lg font-mono text-red-600">{fmtCurrency(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <ConfirmDialog
        open={confirmPost}
        title="Post Supplier Return"
        message={`Post ${ret.return_number}? This will deduct stock and create journal entries. This cannot be undone.`}
        confirmLabel="Post Return"
        onConfirm={handlePost}
        onCancel={() => setConfirmPost(false)}
        loading={posting}
      />
    </div>
  );
}
