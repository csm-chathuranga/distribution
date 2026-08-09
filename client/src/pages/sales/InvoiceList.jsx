import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetInvoicesQuery, usePostInvoiceMutation } from '../../api/salesApi';
import { usePermission } from '../../hooks/usePermission';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtDate } from '../../utils/format';

const STATUSES = ['', 'DRAFT', 'POSTED', 'PARTIAL', 'PAID', 'OVERDUE'];

const STATUS_BORDER = {
  DRAFT:   'border-l-gray-300',
  POSTED:  'border-l-blue-400',
  PARTIAL: 'border-l-amber-400',
  PAID:    'border-l-emerald-500',
  OVERDUE: 'border-l-red-500',
};

export default function InvoiceList() {
  const navigate   = useNavigate();
  const canCreate  = usePermission('sales.create');
  const canApprove = usePermission('sales.approve');
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [status,     setStatus]     = useState('');
  const [postingInv, setPostingInv] = useState(null);

  const { data, isLoading } = useGetInvoicesQuery({ search, page, status: status || undefined, limit: 20 });
  const [postInvoice, { isLoading: posting }] = usePostInvoiceMutation();
  const invoices = (data?.data || []).filter(inv => inv.Customer?.name);
  const total    = data?.total || 0;

  const handlePost = async () => {
    try {
      await postInvoice(postingInv.id).unwrap();
      toast.success('Invoice posted');
      setPostingInv(null);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const pagination = total > 20 && (
    <div className="flex items-center justify-between text-sm text-gray-500 pt-2">
      <span>{(page-1)*20+1}–{Math.min(page*20, total)} of {total}</span>
      <div className="flex gap-2">
        <button disabled={page === 1} onClick={() => setPage(p => p-1)} className="btn-secondary px-3 py-1.5 disabled:opacity-40">Prev</button>
        <button disabled={page*20 >= total} onClick={() => setPage(p => p+1)} className="btn-secondary px-3 py-1.5 disabled:opacity-40">Next</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
        {canCreate && (
          <button onClick={() => navigate('/invoices/new')} className="btn btn-primary flex items-center gap-1.5">
            <Plus size={16} /> New Invoice
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search invoices…" className="input pl-9 w-full text-sm py-2" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-sm">
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center text-gray-400">Loading…</div>
      ) : invoices.length === 0 ? (
        <div className="card p-10 text-center">
          <FileText size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No invoices found</p>
          {canCreate && (
            <button onClick={() => navigate('/invoices/new')} className="mt-4 btn-primary text-sm">
              Create first invoice
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Invoice #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Due</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">Total</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">Balance</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map(inv => {
                  const balance = parseFloat(inv.balance_due || 0);
                  const overdue = balance > 0 && inv.due_date && new Date(inv.due_date) < new Date();
                  return (
                    <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-primary-600">{inv.invoice_number}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{inv.Customer?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(inv.invoice_date)}</td>
                      <td className={`px-4 py-3 ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {inv.due_date ? fmtDate(inv.due_date) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                        {fmtCurrency(inv.total_amount)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${overdue ? 'text-red-600' : balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {balance > 0 ? fmtCurrency(balance) : 'Paid'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        {inv.status === 'DRAFT' && canApprove && (
                          <button onClick={() => setPostingInv(inv)}
                            className="btn btn-primary text-xs py-1 px-3">
                            Post
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="md:hidden space-y-3">
            {invoices.map(inv => {
              const balance = parseFloat(inv.balance_due || 0);
              const paid    = parseFloat(inv.paid_amount || 0);
              const overdue = balance > 0 && inv.due_date && new Date(inv.due_date) < new Date();
              return (
                <div key={inv.id}
                  className={`bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer active:opacity-75 transition-opacity border-l-4 ${STATUS_BORDER[inv.status] || 'border-l-gray-300'}`}
                  onClick={() => navigate(`/invoices/${inv.id}`)}>

                  <div className="p-4">
                    {/* Customer + amount */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm leading-tight">{inv.Customer?.name || '—'}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs font-mono text-primary-600">{inv.invoice_number}</span>
                          <span className="text-gray-300 text-xs">·</span>
                          <span className="text-xs text-gray-400">{fmtDate(inv.invoice_date)}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900 font-mono">{fmtCurrency(inv.total_amount)}</p>
                        <div className="mt-1 flex justify-end">
                          <StatusBadge status={inv.status} />
                        </div>
                      </div>
                    </div>

                    {/* Balance / paid row */}
                    {(balance > 0 || (balance === 0 && paid > 0)) && (
                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {balance > 0
                            ? (inv.due_date ? `Due ${fmtDate(inv.due_date)}` : 'Outstanding')
                            : 'Payment'}
                        </span>
                        {balance > 0 ? (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            overdue
                              ? 'text-red-600 bg-red-50 border-red-100'
                              : 'text-amber-600 bg-amber-50 border-amber-100'
                          }`}>
                            {fmtCurrency(balance)}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                            Fully Paid
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {inv.status === 'DRAFT' && canApprove && (
                    <div className="px-4 pb-4">
                      <button onClick={e => { e.stopPropagation(); setPostingInv(inv); }}
                        className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors">
                        Post Invoice
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {pagination}
        </>
      )}

      <ConfirmDialog
        open={!!postingInv}
        title="Post Invoice"
        message={`Post ${postingInv?.invoice_number}? This creates journal entries, deducts stock, and makes it payable.`}
        confirmLabel="Post Invoice"
        onConfirm={handlePost}
        onCancel={() => setPostingInv(null)}
        loading={posting}
      />
    </div>
  );
}
