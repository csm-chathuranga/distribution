import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Banknote, CreditCard, Building2, TrendingUp, Users } from 'lucide-react';
import { useGetMyCollectionsQuery } from '../../api/salesApi';
import { fmtNumber, fmtDateTime } from '../../utils/format';

const today = () => new Date().toISOString().slice(0, 10);

const METHOD_LABEL = { CASH: 'Cash', CHEQUE: 'Cheque', BANK_TRANSFER: 'Transfer' };
const METHOD_COLOR = {
  CASH: 'bg-emerald-100 text-emerald-800',
  CHEQUE: 'bg-blue-100 text-blue-800',
  BANK_TRANSFER: 'bg-violet-100 text-violet-800',
};

export default function MyCollection() {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo]     = useState(today());

  const { data, isFetching } = useGetMyCollectionsQuery(
    { date_from: dateFrom, date_to: dateTo },
    { refetchOnMountOrArgChange: true }
  );

  const receipts = data?.receipts ?? [];
  const totals   = data?.totals   ?? { CASH: 0, CHEQUE: 0, BANK_TRANSFER: 0, total: 0 };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Header */}
      <div className="bg-white border-b px-4 pt-4 pb-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-slate-100">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">My Collections</h1>
            <p className="text-xs text-slate-500">{receipts.length} receipt{receipts.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {/* Date range filter */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500 block mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500 block mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Summary tiles */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="opacity-80" />
              <span className="text-xs font-semibold opacity-80 uppercase tracking-wide">Total Collected</span>
            </div>
            <p className="text-2xl font-bold">LKR {fmtNumber(totals.total)}</p>
            <p className="text-xs opacity-70 mt-0.5">{receipts.length} transactions</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Banknote size={16} className="text-emerald-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cash</span>
            </div>
            <p className="text-lg font-bold text-slate-900">LKR {fmtNumber(totals.CASH ?? 0)}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={16} className="text-blue-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cheque</span>
            </div>
            <p className="text-lg font-bold text-slate-900">LKR {fmtNumber(totals.CHEQUE ?? 0)}</p>
          </div>

          {totals.BANK_TRANSFER > 0 && (
            <div className="col-span-2 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={16} className="text-violet-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bank Transfer</span>
              </div>
              <p className="text-lg font-bold text-slate-900">LKR {fmtNumber(totals.BANK_TRANSFER)}</p>
            </div>
          )}
        </div>

        {/* Outstanding customers link */}
        <button
          onClick={() => navigate('/driver/payments')}
          className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-left"
        >
          <Users size={18} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">View Outstanding Customers</p>
            <p className="text-xs text-amber-600">See who still owes payment</p>
          </div>
        </button>

        {/* Receipts list */}
        {isFetching ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-12">
            <Banknote size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No collections found</p>
            <p className="text-slate-400 text-sm">Try changing the date range</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">Receipts</h2>
            {receipts.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{r.Customer?.name ?? '—'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.receipt_number} · {fmtDateTime(r.receipt_date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-900 text-sm">LKR {fmtNumber(r.amount)}</p>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${METHOD_COLOR[r.payment_method] ?? 'bg-slate-100 text-slate-600'}`}>
                    {METHOD_LABEL[r.payment_method] ?? r.payment_method}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
