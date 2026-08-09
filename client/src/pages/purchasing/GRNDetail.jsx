import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, CheckCircle, Trash2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetGRNQuery, usePostGRNMutation, useDeleteGRNMutation } from '../../api/purchasingApi';
import { useGetCompanyQuery } from '../../api/reportsApi';
import { usePermission } from '../../hooks/usePermission';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import GRNPrint from '../../components/print/GRNPrint';
import { printComponent } from '../../utils/print';
import { fmtCurrency, fmtDate } from '../../utils/format';

export default function GRNDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canApprove = usePermission('purchase.approve');
  const canCreate  = usePermission('purchase.create');

  const { data: grn, isLoading } = useGetGRNQuery(id);
  const { data: company } = useGetCompanyQuery();
  const [postGRN,   { isLoading: posting  }] = usePostGRNMutation();
  const [deleteGRN, { isLoading: deleting }] = useDeleteGRNMutation();
  const handlePrint = () => printComponent(<GRNPrint grn={grn} company={company} />);

  const [confirmPost,   setConfirmPost]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handlePost = async () => {
    try {
      await postGRN(id).unwrap();
      toast.success('GRN posted — stock updated');
      setConfirmPost(false);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const handleDelete = async () => {
    try {
      await deleteGRN(id).unwrap();
      toast.success('GRN deleted');
      navigate('/grn');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  if (isLoading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  if (!grn) return <div className="text-center py-20 text-gray-400">GRN not found</div>;

  const isDraft = grn.status === 'DRAFT';
  const lines   = grn.Lines || [];
  const total   = lines.reduce((s, l) => s + parseFloat(l.line_total || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/grn')} className="p-2 text-gray-500 hover:text-gray-900">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{grn.grn_number}</h1>
            <StatusBadge status={grn.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{grn.Supplier?.name} · {fmtDate(grn.grn_date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Printer size={15} /> Print
          </button>
          {isDraft && canApprove && (
            <button onClick={() => setConfirmPost(true)} className="btn-primary flex items-center gap-1.5 text-sm">
              <CheckCircle size={15} /> Post GRN
            </button>
          )}
          {isDraft && canCreate && (
            <button onClick={() => setConfirmDelete(true)} className="btn-secondary flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700">
              <Trash2 size={15} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Details card */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 border-b pb-2 mb-4">Receipt Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Supplier</p>
            <p className="font-medium text-gray-900">{grn.Supplier?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Received Date</p>
            <p className="font-medium text-gray-900">{fmtDate(grn.grn_date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Status</p>
            <StatusBadge status={grn.status} />
          </div>
          {grn.invoice_number && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Supplier Invoice</p>
              <p className="font-medium text-gray-900">{grn.invoice_number}</p>
            </div>
          )}
          {grn.notes && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-xs text-gray-500 mb-0.5">Notes</p>
              <p className="text-gray-700">{grn.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Lines */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 border-b pb-2 mb-4">Items Received</h2>
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

      <ConfirmDialog
        open={confirmPost}
        title="Post GRN"
        message={`Post ${grn.grn_number}? This will update stock quantities and create journal entries. This cannot be undone.`}
        confirmLabel="Post GRN"
        onConfirm={handlePost}
        onCancel={() => setConfirmPost(false)}
        loading={posting}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete GRN"
        message={`Delete ${grn.grn_number}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        loading={deleting}
        danger
      />
    </div>
  );
}
