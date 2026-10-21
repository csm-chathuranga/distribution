import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, User, Building2, Calendar, FileText, FilePlus, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetSalesOrderQuery, useConfirmSalesOrderMutation, useInvoiceSalesOrderMutation } from '../../api/salesApi';
import { usePermission } from '../../hooks/usePermission';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtDate } from '../../utils/format';

export default function SalesOrderDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const canApprove   = usePermission('sales.approve');
  const [confirming, setConfirming] = useState(false);

  const { data: order, isLoading, isError } = useGetSalesOrderQuery(id);
  const [confirmOrder,  { isLoading: confirming_ }] = useConfirmSalesOrderMutation();
  const [invoiceOrder,  { isLoading: invoicing }]   = useInvoiceSalesOrderMutation();

  const handleConfirm = async () => {
    try {
      await confirmOrder(id).unwrap();
      toast.success('Order confirmed');
      setConfirming(false);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const handleInvoice = async () => {
    try {
      const result = await invoiceOrder(id).unwrap();
      toast.success(`Invoice ${result.invoice_number} created`);
      navigate(`/invoices/${result.invoice_id}`);
    } catch (e) { toast.error(e.data?.message || 'Failed to create invoice'); }
  };

  if (isLoading) return (
    <div className="space-y-4">
      <div className="card p-6 animate-pulse space-y-3">
        <div className="skeleton h-6 w-48" /><div className="skeleton h-4 w-32" />
      </div>
      {[1,2,3].map(i => <div key={i} className="card p-4 animate-pulse h-14" />)}
    </div>
  );

  if (isError || !order) return (
    <div className="card p-10 text-center text-gray-500">
      Order not found. <button onClick={() => navigate('/sales-orders')} className="text-primary-600 hover:underline">Back</button>
    </div>
  );

  const lines = order.Lines || [];
  const total = parseFloat(order.total_amount || 0);

  return (
    <div className="space-y-4 pb-24">
      {/* Order title row */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <h1 className="text-lg font-bold text-gray-900 font-mono">{order.order_number}</h1>
        <StatusBadge status={order.status} />
        <span className="text-xs text-gray-400 ml-auto">{fmtDate(order.order_date)}</span>
      </div>

      {/* Info card */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <div className="p-2 rounded-lg bg-blue-50"><User size={15} className="text-blue-600" /></div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Customer</p>
            <p className="font-semibold text-gray-900">{order.Customer?.name || '—'}</p>
            {order.Customer?.code && <p className="text-xs font-mono text-gray-400">{order.Customer.code}</p>}
          </div>
        </div>

        {order.SalesRep && (
          <div className="flex items-center gap-3 text-sm">
            <div className="p-2 rounded-lg bg-purple-50"><User size={15} className="text-purple-600" /></div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Sales Rep</p>
              <p className="font-semibold text-gray-900">{order.SalesRep.name}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-sm">
          <div className="p-2 rounded-lg bg-green-50"><Building2 size={15} className="text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Warehouse</p>
            <p className="font-semibold text-gray-900">{order.Warehouse?.name || '—'}</p>
          </div>
        </div>

        {order.Route && (
          <div className="flex items-center gap-3 text-sm">
            <div className="p-2 rounded-lg bg-rose-50"><MapPin size={15} className="text-rose-500" /></div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Route</p>
              <p className="font-semibold text-gray-900">{order.Route.name}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-sm">
          <div className="p-2 rounded-lg bg-amber-50"><Calendar size={15} className="text-amber-600" /></div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Order Date</p>
            <p className="font-semibold text-gray-900">{fmtDate(order.order_date)}</p>
          </div>
        </div>

        {order.notes && (
          <div className="flex items-start gap-3 text-sm">
            <div className="p-2 rounded-lg bg-gray-50"><FileText size={15} className="text-gray-500" /></div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Notes</p>
              <p className="text-gray-700 leading-snug">{order.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
            Items <span className="ml-1 text-gray-400 font-normal normal-case">({lines.length})</span>
          </h2>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">FOC</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit Price</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Disc%</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lines.map(line => (
                <tr key={line.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{line.Product?.name || '—'}</p>
                    <p className="text-xs font-mono text-gray-400">{line.Product?.sku}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">{parseFloat(line.quantity)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-400">{parseFloat(line.free_quantity) || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">{fmtCurrency(line.unit_price)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{parseFloat(line.discount_rate) || '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 font-mono">{fmtCurrency(line.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-gray-50">
          {lines.map((line, i) => (
            <div key={line.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-snug">{line.Product?.name || '—'}</p>
                  <p className="text-xs font-mono text-gray-400">{line.Product?.sku}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">#{i + 1}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-gray-400">Qty</p>
                  <p className="font-bold text-gray-900 font-mono">{parseFloat(line.quantity)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-gray-400">Unit Price</p>
                  <p className="font-bold text-gray-900 font-mono">{fmtCurrency(line.unit_price)}</p>
                </div>
                <div className="bg-primary-50 rounded-lg p-2 text-center">
                  <p className="text-primary-500">Total</p>
                  <p className="font-bold text-primary-700 font-mono">{fmtCurrency(line.line_total)}</p>
                </div>
              </div>
              {(parseFloat(line.free_quantity) > 0 || parseFloat(line.discount_rate) > 0) && (
                <div className="flex gap-2 mt-2">
                  {parseFloat(line.free_quantity) > 0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      FOC: {parseFloat(line.free_quantity)}
                    </span>
                  )}
                  {parseFloat(line.discount_rate) > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      {parseFloat(line.discount_rate)}% disc
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Total footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
          <span className="font-semibold text-gray-600 text-sm">Order Total</span>
          <span className="font-extrabold text-gray-900 font-mono text-base">{fmtCurrency(total)}</span>
        </div>
        {(() => {
          const deduction = (order.Returns || [])
            .filter(r => r.action === 'DEDUCT')
            .reduce((s, r) => s + parseFloat(r.quantity) * parseFloat(r.unit_price), 0);
          if (deduction <= 0) return null;
          return (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 text-sm text-amber-700">
                <span>Return Deductions</span>
                <span className="font-mono">− {fmtCurrency(deduction)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-t border-green-100">
                <span className="font-semibold text-green-800 text-sm">Invoice Total</span>
                <span className="font-extrabold text-green-900 font-mono text-base">{fmtCurrency(Math.max(0, total - deduction))}</span>
              </div>
            </>
          );
        })()}
      </div>

      {/* Requested Returns */}
      {order.Returns && order.Returns.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-amber-50">
            <h2 className="font-semibold text-amber-800 text-sm uppercase tracking-wide">
              Requested Returns <span className="ml-1 text-amber-500 font-normal normal-case">({order.Returns.length})</span>
            </h2>
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit Price</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.Returns.map(r => (
                  <tr key={r.id} className="hover:bg-amber-50/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{r.Product?.name || '—'}</p>
                      <p className="text-xs font-mono text-gray-400">{r.Product?.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{parseFloat(r.quantity)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmtCurrency(r.unit_price)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">{r.reason}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.action === 'REPLACE' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-700'}`}>{r.action}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="sm:hidden divide-y divide-gray-50">
            {order.Returns.map(r => (
              <div key={r.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{r.Product?.name || '—'}</p>
                  <p className="text-xs font-mono text-gray-400">{r.Product?.sku}</p>
                  <div className="flex gap-1.5 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">{r.reason}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.action === 'REPLACE' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-700'}`}>{r.action}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900 font-mono text-sm">{parseFloat(r.quantity)} units</p>
                  <p className="text-xs text-gray-400">{fmtCurrency(r.unit_price)} each</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm button — admin/manager only, DRAFT orders */}
      {/* DRAFT → Confirm (admin/manager) */}
      {order.status === 'DRAFT' && canApprove && (
        <>
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 sm:hidden">
            <button onClick={() => setConfirming(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-base transition-colors">
              <CheckCircle size={18} /> Confirm Order
            </button>
          </div>
          <div className="hidden sm:flex justify-end">
            <button onClick={() => setConfirming(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors">
              <CheckCircle size={16} /> Confirm Order
            </button>
          </div>
        </>
      )}

      {/* CONFIRMED → Create Invoice (admin/manager) */}
      {order.status === 'CONFIRMED' && canApprove && (
        <>
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 sm:hidden">
            <button onClick={handleInvoice} disabled={invoicing}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-base transition-colors disabled:opacity-50">
              <FilePlus size={18} /> {invoicing ? 'Creating…' : 'Create Invoice'}
            </button>
          </div>
          <div className="hidden sm:flex justify-end">
            <button onClick={handleInvoice} disabled={invoicing}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
              <FilePlus size={16} /> {invoicing ? 'Creating…' : 'Create Invoice'}
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title="Confirm Sales Order"
        message={`Confirm order ${order.order_number} for ${order.Customer?.name}?`}
        confirmLabel="Confirm Order"
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
        loading={confirming_}
      />
    </div>
  );
}
