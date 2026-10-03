import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, MapPin, User, Building2,
  FileText, CreditCard, ShoppingCart, TrendingUp, AlertCircle, CheckCircle, Clock,
  Pencil,
} from 'lucide-react';
import { useGetCustomerProfileQuery } from '../../api/customersApi';
import { usePermission } from '../../hooks/usePermission';
import { fmtCurrency, fmtDate } from '../../utils/format';
import StatusBadge from '../../components/ui/StatusBadge';

const TYPE_COLORS = {
  WHOLESALER:  'bg-blue-100 text-blue-800',
  RETAILER:    'bg-green-100 text-green-800',
  DIRECT:      'bg-purple-100 text-purple-800',
  INSTITUTION: 'bg-amber-100 text-amber-800',
};

const TAB_INVOICE  = 'invoices';
const TAB_RECEIPT  = 'receipts';
const TAB_ORDER    = 'orders';

function StatCard({ icon: Icon, label, value, sub, color = 'blue', danger }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    red:    'bg-red-50 text-red-600',
    amber:  'bg-amber-50 text-amber-600',
  };
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-lg font-bold leading-tight ${danger ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function InvoiceStatusDot({ status }) {
  const map = {
    PAID:    'bg-green-500',
    PENDING: 'bg-amber-400',
    OVERDUE: 'bg-red-500',
    DRAFT:   'bg-gray-300',
    CANCELLED: 'bg-gray-400',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status] || 'bg-gray-300'}`} />;
}

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canCreate = usePermission('sales.create');
  const [tab, setTab] = useState(TAB_INVOICE);

  const { data, isLoading, isError } = useGetCustomerProfileQuery(id);

  if (isLoading) return (
    <div className="space-y-4">
      <div className="card p-6 animate-pulse space-y-3">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-4 w-32" />
      </div>
      {[1,2,3,4].map(i => <div key={i} className="card p-4 animate-pulse h-16" />)}
    </div>
  );

  if (isError) return (
    <div className="card p-10 text-center">
      <AlertCircle size={32} className="mx-auto text-red-300 mb-3" />
      <p className="text-gray-500">Failed to load customer profile.</p>
    </div>
  );

  const { customer: c, stats: s, recentInvoices, recentReceipts, recentOrders } = data;

  const outstanding   = parseFloat(s?.total_outstanding || 0);
  const totalInvoiced = parseFloat(s?.total_invoiced    || 0);
  const totalPaid     = parseFloat(s?.total_paid        || 0);
  const overdueCount  = parseInt(s?.overdue_count       || 0);
  const creditUsedPct = c.credit_limit > 0
    ? Math.min(100, Math.round((outstanding / parseFloat(c.credit_limit)) * 100))
    : 0;

  const tabs = [
    { key: TAB_INVOICE, label: 'Invoices',  count: recentInvoices.length },
    { key: TAB_RECEIPT, label: 'Receipts',  count: recentReceipts.length },
    { key: TAB_ORDER,   label: 'Orders',    count: recentOrders.length   },
  ];

  return (
    <div className="space-y-4 pb-6">
      {/* Back + Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/customers')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 mt-0.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{c.name}</h1>
            {c.customer_type && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[c.customer_type] || 'bg-gray-100 text-gray-600'}`}>
                {c.customer_type}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {c.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {c.code && <p className="text-xs font-mono text-gray-400 mt-0.5">{c.code}</p>}
        </div>
        <button
          onClick={() => navigate('/customers', { state: { editId: c.id } })}
          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
        >
          <Pencil size={16} />
        </button>
      </div>

      {/* Action buttons */}
      {canCreate && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate(`/invoices/new?customer_id=${c.id}`)}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white shadow-md transition-opacity active:opacity-80"
            style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}
          >
            <FileText size={16} /> New Invoice
          </button>
          <button
            onClick={() => navigate(`/sales-orders/new?customer_id=${c.id}`)}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white shadow-md transition-opacity active:opacity-80"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' }}
          >
            <ShoppingCart size={16} /> New Order
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-3">
        <StatCard icon={TrendingUp}   label="Total Invoiced"   value={fmtCurrency(totalInvoiced)} sub={`${s?.total_count || 0} invoices`} color="blue" />
        <StatCard icon={AlertCircle}  label="Outstanding"      value={fmtCurrency(outstanding)}   sub={overdueCount > 0 ? `${overdueCount} overdue` : 'All current'} color={outstanding > 0 ? 'red' : 'green'} danger={outstanding > 0} />
        <StatCard icon={CheckCircle}  label="Total Collected"  value={fmtCurrency(totalPaid)}     sub={`${s?.paid_count || 0} paid invoices`} color="green" />
        <StatCard icon={CreditCard}   label="Credit Limit"     value={fmtCurrency(c.credit_limit)} sub={`${c.credit_days} days · ${creditUsedPct}% used`} color="amber" />
      </div>

      {/* Credit utilisation bar */}
      {c.credit_limit > 0 && (
        <div className="card px-4 py-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Credit utilisation</span>
            <span className={creditUsedPct >= 90 ? 'text-red-600 font-semibold' : ''}>{creditUsedPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${creditUsedPct >= 90 ? 'bg-red-500' : creditUsedPct >= 70 ? 'bg-amber-400' : 'bg-green-500'}`}
              style={{ width: `${creditUsedPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Info card */}
      <div className="card p-4 grid grid-cols-1 gap-2.5 text-sm">
        {c.phone && (
          <a href={`tel:${c.phone}`} className="flex items-center gap-2.5 text-primary-600">
            <Phone size={15} className="text-gray-400 flex-shrink-0" />
            {c.phone}
          </a>
        )}
        {c.email && (
          <a href={`mailto:${c.email}`} className="flex items-center gap-2.5 text-primary-600 truncate">
            <Mail size={15} className="text-gray-400 flex-shrink-0" />
            {c.email}
          </a>
        )}
        {c.contact_person && (
          <div className="flex items-center gap-2.5 text-gray-700">
            <User size={15} className="text-gray-400 flex-shrink-0" />
            {c.contact_person}
          </div>
        )}
        {c.address && (
          <div className="flex items-start gap-2.5 text-gray-700">
            <MapPin size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{c.address}</span>
          </div>
        )}
        {c.Route && (
          <div className="flex items-center gap-2.5 text-gray-700">
            <Building2 size={15} className="text-gray-400 flex-shrink-0" />
            Route: <span className="font-medium">{c.Route.name}</span>
          </div>
        )}
        {c.tin_number && (
          <div className="flex items-center gap-2.5 text-gray-600">
            <FileText size={15} className="text-gray-400 flex-shrink-0" />
            TIN: <span className="font-mono">{c.tin_number}</span>
          </div>
        )}
        {c.is_vat_registered && (
          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full w-fit">
            <CheckCircle size={11} /> VAT Registered
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                tab === t.key
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/40'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${tab === t.key ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Invoices */}
        {tab === TAB_INVOICE && (
          <div className="divide-y divide-gray-50">
            {recentInvoices.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No invoices yet</p>
            ) : recentInvoices.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <InvoiceStatusDot status={inv.status} />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold text-gray-800">{inv.invoice_number}</p>
                  <p className="text-xs text-gray-400">
                    {fmtDate(inv.invoice_date)}
                    {inv.due_date && <> · Due {fmtDate(inv.due_date)}</>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{fmtCurrency(inv.total_amount)}</p>
                  {parseFloat(inv.balance_due) > 0 && (
                    <p className="text-xs text-red-500 font-medium">Due {fmtCurrency(inv.balance_due)}</p>
                  )}
                  {inv.status === 'PAID' && (
                    <p className="text-xs text-green-600 font-medium">Paid</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Receipts */}
        {tab === TAB_RECEIPT && (
          <div className="divide-y divide-gray-50">
            {recentReceipts.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No receipts yet</p>
            ) : recentReceipts.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="p-1.5 rounded-lg bg-green-50">
                  <CreditCard size={14} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold text-gray-800">{r.receipt_number}</p>
                  <p className="text-xs text-gray-400">{fmtDate(r.receipt_date)} · {r.payment_method?.replace('_', ' ')}</p>
                </div>
                <p className="text-sm font-bold text-green-600 shrink-0">{fmtCurrency(r.amount)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Orders */}
        {tab === TAB_ORDER && (
          <div className="divide-y divide-gray-50">
            {recentOrders.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No orders yet</p>
            ) : recentOrders.map(o => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                <div className="p-1.5 rounded-lg bg-blue-50">
                  <ShoppingCart size={14} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold text-gray-800">{o.order_number}</p>
                  <p className="text-xs text-gray-400">{fmtDate(o.order_date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{fmtCurrency(o.total_amount)}</p>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
