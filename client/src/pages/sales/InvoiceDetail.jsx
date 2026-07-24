import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Printer, FileText, MapPin, Truck } from 'lucide-react';
import MapModal from '../../components/MapModal';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { useGetInvoiceQuery, usePostInvoiceMutation } from '../../api/salesApi';
import { useGetCompanyQuery } from '../../api/reportsApi';
import { usePermission } from '../../hooks/usePermission';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import InvoicePrint from '../../components/print/InvoicePrint';
import { fmtCurrency, fmtDate } from '../../utils/format';

export default function InvoiceDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const printRef  = useRef(null);
  const canCreate = usePermission('sales.create');
  const canPost   = usePermission('sales.approve');
  const [confirmPost, setConfirmPost] = useState(false);
  const [mapOpen,     setMapOpen]     = useState(false);

  const { data: invoice, isLoading, error } = useGetInvoiceQuery(id);
  const { data: company } = useGetCompanyQuery();
  const [postInvoice, { isLoading: posting }] = usePostInvoiceMutation();
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const handlePost = async () => {
    try {
      await postInvoice(id).unwrap();
      toast.success('Invoice posted');
      setConfirmPost(false);
    } catch (e) { toast.error(e.data?.message || 'Failed to post'); }
  };

  if (isLoading) return (
    <div className="card p-8 flex items-center justify-center text-gray-400">
      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-3" /> Loading…
    </div>
  );

  if (error || !invoice) return (
    <div className="card p-8 text-center text-gray-500">
      Invoice not found. <Link to="/invoices" className="text-primary-600 hover:underline">Back to list</Link>
    </div>
  );

  const lines   = invoice.Lines || [];
  const paid    = parseFloat(invoice.paid_amount || 0);
  const balance = parseFloat(invoice.balance_due || 0);
  const overdue = balance > 0 && invoice.due_date && new Date(invoice.due_date) < new Date();

  const showPostBar    = invoice.status === 'DRAFT' && canPost;
  const showAssignBar  = ['POSTED', 'PARTIAL'].includes(invoice.status) && canCreate;
  const showStickyBar  = showPostBar || showAssignBar;

  return (
    <div className={`space-y-4 max-w-2xl mx-auto ${showStickyBar ? 'pb-28' : 'pb-6'}`}>

      {/* Top bar */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => navigate('/invoices')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 active:opacity-70">
          <ArrowLeft size={16} /> Back
        </button>
        <button onClick={handlePrint} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5">
          <Printer size={15} /> Print
        </button>
      </div>

      {/* Status hero */}
      <div className={`card p-5 border-l-4 ${
        invoice.status === 'PAID'    ? 'border-green-500 bg-green-50' :
        invoice.status === 'POSTED'  ? 'border-blue-500 bg-blue-50'  :
        invoice.status === 'PARTIAL' ? 'border-amber-500 bg-amber-50':
        invoice.status === 'OVERDUE' ? 'border-red-500 bg-red-50'    :
        'border-gray-300 bg-white'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <StatusBadge status={invoice.status} />
              <span className="text-xs font-mono text-gray-500">{invoice.invoice_number}</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 leading-snug">
              {invoice.Customer?.name || '—'}
            </h1>
            {invoice.Customer?.customer_type && (
              <p className="text-xs text-gray-500 mt-0.5">{invoice.Customer.customer_type}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-gray-900 font-mono">{fmtCurrency(invoice.total_amount)}</p>
            {balance > 0 && (
              <p className={`text-sm font-semibold mt-0.5 ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
                Due: {fmtCurrency(balance)}
              </p>
            )}
            {balance === 0 && paid > 0 && (
              <p className="text-sm text-green-600 font-semibold mt-0.5">Fully paid</p>
            )}
          </div>
        </div>
      </div>

      {/* Dates & financials */}
      <div className="card p-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Invoice Date</p>
          <p className="font-semibold text-gray-800 text-sm">{fmtDate(invoice.invoice_date)}</p>
        </div>
        {invoice.due_date && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Due Date</p>
            <p className={`font-semibold text-sm ${overdue ? 'text-red-600' : 'text-gray-800'}`}>
              {fmtDate(invoice.due_date)}
            </p>
          </div>
        )}
        {invoice.payment_terms && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Payment Terms</p>
            <p className="font-semibold text-gray-800 text-sm">{invoice.payment_terms}</p>
          </div>
        )}
        {invoice.Customer?.code && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Customer Code</p>
            <p className="font-semibold text-gray-800 text-sm font-mono">{invoice.Customer.code}</p>
          </div>
        )}
      </div>

      {/* Financial summary */}
      <div className="card p-4 space-y-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Summary</p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-mono">{fmtCurrency(invoice.subtotal)}</span>
        </div>
        {parseFloat(invoice.vat_amount) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">VAT</span>
            <span className="font-mono">{fmtCurrency(invoice.vat_amount)}</span>
          </div>
        )}
        {parseFloat(invoice.discount_amount || 0) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Discount</span>
            <span className="text-red-600 font-mono">−{fmtCurrency(invoice.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold border-t border-gray-100 pt-2">
          <span>Total</span>
          <span className="font-mono">{fmtCurrency(invoice.total_amount)}</span>
        </div>
        {paid > 0 && (
          <div className="flex justify-between text-green-600 text-sm">
            <span>Paid</span>
            <span className="font-mono">{fmtCurrency(paid)}</span>
          </div>
        )}
        {balance > 0 && (
          <div className="flex justify-between font-semibold text-red-600">
            <span>Balance Due</span>
            <span className="font-mono">{fmtCurrency(balance)}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="card p-4 bg-gray-50">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-gray-700">{invoice.notes}</p>
        </div>
      )}

      {/* Map navigation */}
      {invoice.latitude && invoice.longitude && (
        <button
          onClick={() => setMapOpen(true)}
          className="card p-4 w-full text-left flex items-center gap-4 hover:bg-blue-50 active:bg-blue-100 transition-colors border border-blue-100"
        >
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <MapPin size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-blue-900">Navigate to Customer</p>
            <p className="text-xs font-mono text-blue-500 mt-0.5 truncate">
              {parseFloat(invoice.latitude).toFixed(6)}, {parseFloat(invoice.longitude).toFixed(6)}
            </p>
          </div>
          <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0">Go</div>
        </button>
      )}

      {/* Line items */}
      {lines.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Items ({lines.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {lines.map((line, i) => (
              <div key={line.id || i} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm leading-snug">
                    {line.Product?.name || `Product #${line.product_id}`}
                  </p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {line.Product?.sku || '—'}
                    {parseFloat(line.vat_rate || 0) > 0 && ` · VAT ${line.vat_rate}%`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900 text-sm">× {line.quantity}</p>
                  <p className="text-xs text-gray-500 font-mono">{fmtCurrency(line.line_total)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-600">Total</span>
            <span className="font-bold text-gray-900 font-mono">{fmtCurrency(invoice.total_amount)}</span>
          </div>
        </div>
      )}

      {/* Hidden print template */}
      <div ref={printRef} style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}>
        <InvoicePrint invoice={invoice} company={company} />
      </div>

      {/* Map modal */}
      {mapOpen && invoice.latitude && invoice.longitude && (
        <MapModal
          lat={invoice.latitude}
          lng={invoice.longitude}
          label={invoice.Customer?.name || 'Customer Location'}
          onClose={() => setMapOpen(false)}
        />
      )}

      {/* Sticky bottom action bar */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3 pb-safe">
          {showPostBar && (
            <button
              onClick={() => setConfirmPost(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-base transition-colors"
            >
              <CheckCircle size={20} /> Post Invoice
            </button>
          )}
          {showAssignBar && (
            <button
              onClick={() => navigate(`/deliveries/new?invoice_id=${invoice.id}`)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-base transition-colors"
            >
              <Truck size={20} /> Assign to Driver
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmPost}
        title="Post Invoice"
        message={`Post ${invoice.invoice_number}? This creates journal entries, deducts stock, and makes it payable.`}
        confirmLabel="Post Invoice"
        onConfirm={handlePost}
        onCancel={() => setConfirmPost(false)}
        loading={posting}
      />
    </div>
  );
}
