import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useGetSupplierPaymentQuery } from '../../api/purchasingApi';
import StatusBadge from '../../components/ui/StatusBadge';
import { fmtCurrency, fmtDate } from '../../utils/format';

const METHOD_COLORS = {
  CASH: 'bg-green-100 text-green-700',
  CHEQUE: 'bg-blue-100 text-blue-700',
  BANK_TRANSFER: 'bg-purple-100 text-purple-700',
};

export default function SupplierPaymentDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { data: payment, isLoading } = useGetSupplierPaymentQuery(id);

  if (isLoading) return (
    <div className="card p-8 flex items-center justify-center text-gray-400">
      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-3" /> Loading...
    </div>
  );
  if (!payment) return (
    <div className="card p-8 text-center text-gray-500">Payment not found.</div>
  );

  const grns = payment.GoodsReceiveds || [];

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/supplier-payments')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Back to Payments
        </button>
        <StatusBadge status={payment.status} />
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-mono">{payment.payment_number}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{fmtDate(payment.payment_date)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 font-mono">{fmtCurrency(payment.amount)}</p>
            <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${METHOD_COLORS[payment.payment_method] || 'bg-gray-100 text-gray-600'}`}>
              {payment.payment_method?.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Supplier</p>
            <p className="font-semibold text-gray-800">{payment.Supplier?.name || '—'}</p>
            <p className="text-xs text-gray-400">{payment.Supplier?.code}</p>
          </div>
          {payment.reference && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Reference</p>
              <p className="font-mono font-semibold text-gray-800">{payment.reference}</p>
            </div>
          )}
          {payment.notes && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-gray-600">{payment.notes}</p>
            </div>
          )}
        </div>

        {/* Allocated GRNs */}
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">GRN Allocations</h2>
        {grns.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No allocations</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-2.5 px-3 text-left font-medium text-gray-600">GRN #</th>
                <th className="py-2.5 px-3 text-left font-medium text-gray-600">Date</th>
                <th className="py-2.5 px-3 text-left font-medium text-gray-600">Supplier Invoice</th>
                <th className="py-2.5 px-3 text-right font-medium text-gray-600">GRN Total</th>
                <th className="py-2.5 px-3 text-right font-medium text-gray-600">Allocated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {grns.map(g => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-mono text-xs font-semibold text-gray-800">{g.grn_number}</td>
                  <td className="py-2.5 px-3 text-gray-600">{fmtDate(g.grn_date)}</td>
                  <td className="py-2.5 px-3 text-gray-500 text-xs">{g.supplier_invoice_number || '—'}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{fmtCurrency(g.total_amount)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-green-600">
                    {fmtCurrency(g.PaymentAllocation?.allocated_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td colSpan={4} className="py-2.5 px-3 text-right font-semibold text-gray-700">Total Paid</td>
                <td className="py-2.5 px-3 text-right font-bold font-mono text-gray-900">{fmtCurrency(payment.amount)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
