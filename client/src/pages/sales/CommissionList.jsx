import { useState } from 'react';
import { RefreshCw, CheckCircle, DollarSign, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useGetCommissionsQuery, useGenerateCommissionMutation,
  useApproveCommissionMutation, usePayCommissionMutation, useCancelCommissionMutation,
} from '../../api/reportsApi';
import { fmtCurrency, fmtDate } from '../../utils/format';

const STATUS_BADGE = {
  PENDING:   'badge-warning',
  APPROVED:  'badge-info',
  PAID:      'badge-success',
  CANCELLED: 'badge-danger',
};

const now = new Date();
const thisYear  = now.getFullYear();
const thisMonth = now.getMonth() + 1;

export default function CommissionList() {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear,   setFilterYear]   = useState(String(thisYear));
  const [filterMonth,  setFilterMonth]  = useState('');

  const [genYear,  setGenYear]  = useState(String(thisYear));
  const [genMonth, setGenMonth] = useState(String(thisMonth));

  const [payId,       setPayId]       = useState(null);
  const [payDate,     setPayDate]     = useState(new Date().toISOString().slice(0, 10));
  const [payNotes,    setPayNotes]    = useState('');

  const { data, isLoading, refetch } = useGetCommissionsQuery({
    status: filterStatus || undefined,
    year:   filterYear   || undefined,
    month:  filterMonth  || undefined,
    limit:  100,
  });

  const [generate,  { isLoading: generating }]  = useGenerateCommissionMutation();
  const [approve,   { isLoading: approving }]   = useApproveCommissionMutation();
  const [pay,       { isLoading: paying }]      = usePayCommissionMutation();
  const [cancel,    { isLoading: cancelling }]  = useCancelCommissionMutation();

  const rows = data?.data || [];

  const handleGenerate = async () => {
    try {
      const res = await generate({ year: parseInt(genYear), month: parseInt(genMonth) }).unwrap();
      toast.success(`Generated ${res.generated} commission record(s)`);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const handleApprove = async (id) => {
    try {
      await approve(id).unwrap();
      toast.success('Commission approved');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const handlePay = async () => {
    try {
      await pay({ id: payId, paid_date: payDate, payment_notes: payNotes }).unwrap();
      toast.success('Commission marked as paid');
      setPayId(null); setPayNotes('');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this commission record?')) return;
    try {
      await cancel(id).unwrap();
      toast.success('Cancelled');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sales Commission</h1>
          <p className="text-sm text-gray-500 mt-0.5">5% of net profit on cash sales — paid one month after sale</p>
        </div>
      </div>

      {/* Generate panel */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Generate Commission</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Year</label>
            <input type="number" value={genYear} onChange={e => setGenYear(e.target.value)}
              className="input w-24" min={2020} max={2099} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Month</label>
            <select value={genMonth} onChange={e => setGenMonth(e.target.value)} className="input w-32">
              {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <button onClick={handleGenerate} disabled={generating}
            className="btn btn-primary flex items-center gap-2">
            <RefreshCw size={15} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating…' : 'Calculate & Generate'}
          </button>
          <p className="text-xs text-gray-400 self-end pb-1">
            Sums all CASH invoices for selected month. Existing PENDING records are recalculated.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Year</label>
          <input type="number" value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="input w-24" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Month</label>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="input w-32">
            <option value="">All months</option>
            {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-36">
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No commission records found. Generate one above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th">Sales Rep</th>
                  <th className="table-th text-center">Month</th>
                  <th className="table-th text-right">Cash Revenue</th>
                  <th className="table-th text-right">COGS</th>
                  <th className="table-th text-right">Net Profit</th>
                  <th className="table-th text-right text-green-700">Commission (5%)</th>
                  <th className="table-th text-center">Due Date</th>
                  <th className="table-th text-center">Status</th>
                  <th className="table-th text-center">Paid Date</th>
                  <th className="table-th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{r.SalesRep?.name}</td>
                    <td className="table-td text-center text-gray-600">{months[r.sale_month - 1]} {r.sale_year}</td>
                    <td className="table-td text-right">{fmtCurrency(r.cash_revenue)}</td>
                    <td className="table-td text-right text-gray-500">{fmtCurrency(r.cogs)}</td>
                    <td className="table-td text-right font-semibold">{fmtCurrency(r.net_profit)}</td>
                    <td className="table-td text-right font-bold text-green-700">{fmtCurrency(r.commission_amount)}</td>
                    <td className="table-td text-center text-gray-600">{fmtDate(r.due_date)}</td>
                    <td className="table-td text-center">
                      <span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="table-td text-center text-gray-500">{r.paid_date ? fmtDate(r.paid_date) : '—'}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-1 justify-end">
                        {r.status === 'PENDING' && (
                          <button onClick={() => handleApprove(r.id)} disabled={approving}
                            className="btn btn-xs btn-primary flex items-center gap-1">
                            <CheckCircle size={12} /> Approve
                          </button>
                        )}
                        {r.status === 'APPROVED' && (
                          <button onClick={() => { setPayId(r.id); setPayDate(new Date().toISOString().slice(0,10)); }}
                            className="btn btn-xs btn-success flex items-center gap-1">
                            <DollarSign size={12} /> Pay
                          </button>
                        )}
                        {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                          <button onClick={() => handleCancel(r.id)} disabled={cancelling}
                            className="btn btn-xs btn-danger flex items-center gap-1">
                            <XCircle size={12} /> Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={5} className="table-td text-right font-semibold text-gray-700">Total Commission</td>
                  <td className="table-td text-right font-bold text-green-700">
                    {fmtCurrency(rows.filter(r => r.status !== 'CANCELLED').reduce((s, r) => s + parseFloat(r.commission_amount), 0))}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Pay modal */}
      {payId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">Mark Commission as Paid</h3>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Payment Date</label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
              <textarea value={payNotes} onChange={e => setPayNotes(e.target.value)}
                className="input w-full" rows={2} placeholder="Cash / bank transfer ref…" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPayId(null)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={handlePay} disabled={paying} className="btn btn-primary flex-1">
                {paying ? 'Saving…' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
