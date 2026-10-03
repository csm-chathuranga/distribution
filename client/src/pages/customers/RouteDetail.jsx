import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUp, ArrowDown, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetRoutesQuery, useGetRouteCustomersQuery, useUpdateVisitOrderMutation } from '../../api/customersApi';
import { fmtCurrency } from '../../utils/format';

const CREDIT_BADGE = (outstanding, limit) => {
  if (limit > 0 && outstanding >= limit) return 'bg-red-100 text-red-700';
  if (limit > 0 && outstanding >= limit * 0.8) return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
};

export default function RouteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: routesData } = useGetRoutesQuery({ limit: 200 });
  const route = routesData?.data?.find(r => String(r.id) === String(id));

  const { data: customers = [], isLoading } = useGetRouteCustomersQuery(id);
  const [updateVisitOrder, { isLoading: saving }] = useUpdateVisitOrderMutation();

  // Local ordered list for drag-free reordering via arrows
  const [ordered, setOrdered] = useState(null);
  const list = ordered ?? customers;

  const move = (index, direction) => {
    const arr = [...list];
    const target = index + direction;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setOrdered(arr);
  };

  const handleSave = async () => {
    try {
      const order = list.map((c, i) => ({ customer_id: c.id, visit_order: i + 1 }));
      await updateVisitOrder({ id, order }).unwrap();
      toast.success('Visit order saved');
      setOrdered(null);
    } catch (e) { toast.error(e.data?.message || 'Failed to save'); }
  };

  const isDirty = ordered !== null;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-900">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{route?.name || 'Route'}</h1>
          {route && (
            <p className="text-sm text-gray-500">
              Rep: {route.SalesRep?.name} &nbsp;·&nbsp; Driver: {route.Driver?.name}
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">
            Customer Visit Order &nbsp;
            <span className="text-gray-400 font-normal">({list.length} customers)</span>
          </h2>
          {isDirty && (
            <button onClick={handleSave} disabled={saving}
              className="btn btn-primary btn-sm flex items-center gap-1">
              <Save size={14} /> {saving ? 'Saving…' : 'Save Order'}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No customers on this route</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {list.map((c, i) => {
              const overLimit = c.credit_limit > 0 && c.outstanding_balance >= c.credit_limit;
              return (
                <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${overLimit ? 'bg-red-50/50' : ''}`}>
                  {/* Visit number */}
                  <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>

                  {/* Customer info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900 truncate">{c.name}</span>
                      {c.code && <span className="text-xs text-gray-400">{c.code}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {c.phone && <span className="text-xs text-gray-500">{c.phone}</span>}
                      {c.credit_limit > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${CREDIT_BADGE(c.outstanding_balance, c.credit_limit)}`}>
                          {fmtCurrency(c.outstanding_balance)} / {fmtCurrency(c.credit_limit)}
                          {overLimit && ' ⚠ OVER LIMIT'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Move buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => move(i, -1)} disabled={i === 0}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20">
                      <ArrowUp size={14} />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === list.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20">
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow px-4 py-3 pb-safe">
          <button onClick={handleSave} disabled={saving}
            className="w-full py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-base disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Visit Order'}
          </button>
        </div>
      )}
    </div>
  );
}
