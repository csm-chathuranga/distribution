import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RotateCcw, Plus, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetSalesOrderQuery, useUpdateSalesOrderMutation, useCancelSalesOrderMutation } from '../../api/salesApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { useGetStockOnHandQuery } from '../../api/inventoryApi';
import { usePermission } from '../../hooks/usePermission';
import { selectCurrentUser } from '../../store/authSlice';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtNumber } from '../../utils/format';

const SIZES = [
  { label: '250ml', pattern: /250/i },
  { label: '500ml', pattern: /500/i },
  { label: '750ml', pattern: /750/i },
  { label: '1L',    pattern: /(?:^|[^0-9.])1[Ll](?![Ll0-9])/ },
  { label: '1.5L',  pattern: /1\.5[Ll]/i },
];

export default function SalesOrderEdit() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const canApprove  = usePermission('sales.approve');
  const currentUser = useSelector(selectCurrentUser);

  const { data: order, isLoading }    = useGetSalesOrderQuery(id);
  const { data: productsRaw }          = useGetProductsQuery({ limit: 500, is_active: true });
  const [updateOrder, { isLoading: saving }]     = useUpdateSalesOrderMutation();
  const [cancelOrder, { isLoading: cancelling }] = useCancelSalesOrderMutation();

  // product catalog state — mirrors SalesOrderCreate
  const [qtys,          setQtys]          = useState({});  // { [productId]: { qty, free } }
  const [notes,         setNotes]         = useState('');
  const [sizeFilter,    setSizeFilter]    = useState(SIZES[0]);
  const [search,        setSearch]        = useState('');
  const [pricingMode,   setPricingMode]   = useState('free');
  const [orderDisc,     setOrderDisc]     = useState('');
  const [orderDiscType, setOrderDiscType] = useState('pct');
  const [returns,       setReturns]       = useState([]);
  const [returnDropPos, setReturnDropPos] = useState({});
  const [showCancel,    setShowCancel]    = useState(false);

  const products = productsRaw?.data || [];

  const { data: stockRaw } = useGetStockOnHandQuery(
    { warehouse_id: order?.warehouse_id },
    { skip: !order?.warehouse_id },
  );
  const stockMap = useMemo(() => {
    const m = {};
    (stockRaw?.data || []).forEach(s => { m[s.product_id] = s.available; });
    return m;
  }, [stockRaw]);

  // Pre-populate from existing order when it loads
  useEffect(() => {
    if (!order) return;
    setNotes(order.notes || '');

    const q = {};
    (order.Lines || []).forEach(l => {
      q[l.product_id] = {
        qty:  String(parseFloat(l.quantity)),
        free: String(parseFloat(l.free_quantity || 0)),
      };
    });
    setQtys(q);

    setReturns((order.Returns || []).map(r => ({
      _id:          String(r.id),
      product_id:   r.product_id,
      product_name: r.Product?.name || '',
      search:       r.Product?.name || '',
      quantity:     String(parseFloat(r.quantity)),
      unit_price:   String(parseFloat(r.unit_price)),
      reason:       r.reason,
      action:       r.action,
      open:         false,
    })));
  }, [order]);

  const isOwner = order && String(order.created_by) === String(currentUser?.id);
  const canEdit = canApprove || isOwner;

  // returns helpers
  const addReturn    = () => setReturns(p => [...p, { _id: `new-${Date.now()}`, product_id: '', product_name: '', quantity: '', unit_price: '', reason: 'EXPIRED', action: 'DEDUCT', search: '', open: false }]);
  const removeReturn = (_id) => setReturns(p => p.filter(r => r._id !== _id));
  const updateReturn = (_id, field, value) => setReturns(p => p.map(r => r._id === _id ? { ...r, [field]: value } : r));
  const pickReturn   = (_id, product) => setReturns(p => p.map(r => r._id === _id ? { ...r, product_id: product.id, product_name: product.name, unit_price: product.selling_price || '', search: product.name, open: false } : r));
  const openReturnDrop = (_id, el) => {
    if (el) {
      const rect = el.getBoundingClientRect();
      setReturnDropPos(p => ({ ...p, [_id]: { top: rect.bottom + 4, left: rect.left, width: rect.width } }));
    }
    updateReturn(_id, 'open', true);
  };

  const setQty  = (id, val) => setQtys(p => ({ ...p, [id]: { ...p[id], qty: val } }));
  const setFree = (id, val) => setQtys(p => ({ ...p, [id]: { ...p[id], free: val } }));

  // grouped product catalog
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = {};
    products
      .filter(p => !q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
      .forEach(p => {
        const cat = p.Category?.name || 'Uncategorized';
        if (!map[cat]) map[cat] = [];
        map[cat].push(p);
      });
    return map;
  }, [products, search]);

  // active lines from qtys
  const lines = products
    .map(p => {
      const qty   = parseFloat(qtys[p.id]?.qty  || 0);
      const free  = pricingMode === 'free' ? parseFloat(qtys[p.id]?.free || 0) : 0;
      const price = pricingMode === 'mrp' && parseFloat(p.marked_price) > 0
        ? parseFloat(p.marked_price)
        : parseFloat(p.selling_price || 0);
      return { product: p, qty, free, price, total: qty * price };
    })
    .filter(l => l.qty > 0);

  const subtotal    = lines.reduce((s, l) => s + l.total, 0);
  const discVal     = parseFloat(orderDisc) || 0;
  const discountAmt = orderDiscType === 'pct' ? subtotal * discVal / 100 : Math.min(discVal, subtotal);
  const orderTotal  = Math.max(0, subtotal - discountAmt);

  const validReturns = returns.filter(r => r.product_id && parseFloat(r.quantity) > 0);
  const returnDeduction = validReturns
    .filter(r => r.action === 'DEDUCT')
    .reduce((sum, r) => {
      const product = products.find(p => String(p.id) === String(r.product_id));
      const price = parseFloat(r.unit_price) > 0 ? parseFloat(r.unit_price) : parseFloat(product?.selling_price || 0);
      return sum + parseFloat(r.quantity) * price;
    }, 0);
  const netTotal = Math.max(0, orderTotal - returnDeduction);

  const handleSave = async () => {
    if (lines.length === 0) { toast.error('Add at least one item with a quantity'); return; }
    try {
      await updateOrder({
        id,
        notes,
        total_amount: orderTotal,
        lines: lines.map(l => ({
          product_id:    l.product.id,
          quantity:      l.qty,
          free_quantity: l.free || 0,
          unit_price:    l.price,
          discount_rate: 0,
          line_total:    l.total,
        })),
        returns: validReturns.map(r => {
          const product = products.find(p => String(p.id) === String(r.product_id));
          const price = parseFloat(r.unit_price) > 0 ? parseFloat(r.unit_price) : parseFloat(product?.selling_price || 0);
          return {
            product_id: Number(r.product_id),
            quantity:   parseFloat(r.quantity),
            unit_price: price,
            reason:     r.reason,
            action:     r.action,
          };
        }),
      }).unwrap();
      toast.success('Order updated');
      navigate(`/sales-orders/${id}`);
    } catch (e) { toast.error(e.data?.message || 'Failed to update order'); }
  };

  const handleCancel = async () => {
    try {
      await cancelOrder(id).unwrap();
      toast.success('Order cancelled');
      navigate('/sales-orders');
    } catch (e) { toast.error(e.data?.message || 'Failed to cancel order'); }
  };

  if (isLoading) return (
    <div className="card p-10 text-center animate-pulse text-gray-400">Loading order…</div>
  );
  if (!order || order.status !== 'CONFIRMED') return (
    <div className="card p-10 text-center text-gray-500">
      Order not found or cannot be edited.{' '}
      <button onClick={() => navigate(-1)} className="text-primary-600 hover:underline">Back</button>
    </div>
  );
  if (!canEdit) return (
    <div className="card p-10 text-center text-gray-500">You don't have permission to edit this order.</div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4" style={{ paddingBottom: 170 }}>

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <h1 className="text-lg font-bold text-gray-900 font-mono">Edit {order.order_number}</h1>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">CONFIRMED</span>
        <span className="text-xs text-gray-400 ml-auto">{order.Customer?.name}</span>
      </div>

      {/* Order info (read-only) */}
      <div className="card p-4 space-y-2">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Order Details</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 font-medium">Customer</p>
            <p className="font-semibold text-gray-900">{order.Customer?.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Warehouse</p>
            <p className="font-semibold text-gray-900">{order.Warehouse?.name}</p>
          </div>
          {order.SalesRep && (
            <div>
              <p className="text-xs text-gray-400 font-medium">Sales Rep</p>
              <p className="font-semibold text-gray-900">{order.SalesRep.name}</p>
            </div>
          )}
          {order.Route && (
            <div>
              <p className="text-xs text-gray-400 font-medium">Route</p>
              <p className="font-semibold text-gray-900">{order.Route.name}</p>
            </div>
          )}
        </div>
        <div className="pt-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Order notes…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Product catalogue — mirrors SalesOrderCreate */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Products</h2>
          <div className="flex items-center gap-2">
            {lines.length > 0 && (
              <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                {lines.length} item{lines.length > 1 ? 's' : ''} selected
              </span>
            )}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold flex-shrink-0">
              <button type="button" onClick={() => setPricingMode('free')}
                className={`px-2.5 py-1.5 transition-colors ${pricingMode === 'free' ? 'bg-purple-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                Free Items
              </button>
              <button type="button" onClick={() => setPricingMode('mrp')}
                className={`px-2.5 py-1.5 transition-colors ${pricingMode === 'mrp' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                MRP + Discount
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        {/* Size filter chips */}
        <div className="flex gap-2 overflow-x-auto px-3 py-2 border-b border-gray-100 scrollbar-none">
          <button type="button" onClick={() => setSizeFilter(null)}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${sizeFilter === null ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            All
          </button>
          {SIZES.map(s => (
            <button type="button" key={s.label} onClick={() => setSizeFilter(s)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${sizeFilter?.label === s.label ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Product rows */}
        {Object.entries(grouped)
          .map(([cat, prods]) => [cat, sizeFilter ? prods.filter(p => sizeFilter.pattern.test(p.name + ' ' + (p.Category?.name || ''))) : prods])
          .filter(([, prods]) => prods.length > 0)
          .map(([category, prods]) => (
          <div key={category}>
            <div className="px-3 py-2.5" style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' }}>
              <span className="text-sm font-bold text-white tracking-wide">{category}</span>
            </div>

            {prods.map((p, idx) => {
              const qty       = qtys[p.id]?.qty  ?? '';
              const free      = qtys[p.id]?.free ?? '';
              const price     = pricingMode === 'mrp' && parseFloat(p.marked_price) > 0
                ? parseFloat(p.marked_price)
                : parseFloat(p.selling_price || 0);
              const amt       = (parseFloat(qty) || 0) * price;
              const hasQty    = parseFloat(qty) > 0;
              const available = stockMap[p.id] ?? null;
              const overStock = available !== null && parseFloat(qty) > available;

              return (
                <div key={p.id}
                  className={`px-3 py-3 border-b border-gray-100 transition-colors ${
                    hasQty ? 'bg-green-50/70' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 leading-snug">{p.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {p.sku && (
                          <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{p.sku}</span>
                        )}
                        {stockRaw && (
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                            (available ?? 0) <= 0 ? 'bg-red-100 text-red-600'
                            : (available ?? 0) < 10 ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            Stock: {available ?? 0}
                          </span>
                        )}
                        {parseFloat(p.marked_price) > 0 && (
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            MRP {fmtCurrency(p.marked_price)}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-500 font-mono">{fmtCurrency(price)}</span>
                        {hasQty && (
                          <>
                            <span className="text-xs text-gray-400">× {qty} =</span>
                            <span className="text-sm font-bold text-green-700 font-mono">{fmtCurrency(amt)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* QTY input */}
                    <div className="flex-shrink-0 w-16">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={qty}
                        onChange={e => {
                          const val = e.target.value;
                          if (available !== null && parseFloat(val) > available) return;
                          setQty(p.id, val);
                        }}
                        placeholder="0"
                        className={`w-full h-12 text-center text-lg font-bold rounded-xl border-2 focus:outline-none focus:ring-2 transition-colors ${
                          overStock
                            ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400'
                            : hasQty
                            ? 'border-green-400 bg-green-50 text-green-800 focus:ring-green-400'
                            : 'border-gray-200 bg-gray-50 text-gray-700 focus:ring-primary-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Free qty row */}
                  {pricingMode === 'free' && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">Free qty:</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={free}
                        onChange={e => setFree(p.id, e.target.value)}
                        placeholder="0"
                        className="w-20 h-9 text-center text-sm font-bold rounded-lg border-2 border-purple-200 text-purple-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition-colors"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Order summary */}
        {lines.length > 0 && (
          <div className="px-4 py-3 bg-primary-50 border-t border-primary-100 space-y-1.5">
            {lines.map(l => (
              <div key={l.product.id} className="flex items-center justify-between text-sm text-gray-700">
                <span className="truncate flex-1 mr-2 font-medium">{l.product.name} × {l.qty}{l.free > 0 ? ` (+${l.free} free)` : ''}</span>
                <span className="font-bold font-mono flex-shrink-0">{fmtCurrency(l.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Returns & Collections */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw size={15} className="text-orange-500" />
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Returns & Collections</h2>
          </div>
          <button type="button" onClick={addReturn}
            className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg active:opacity-70">
            <Plus size={12} /> Add
          </button>
        </div>

        {returns.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-1">No returns — tap Add to record customer returns</p>
        )}

        {returns.map(r => {
          const product   = products.find(p => String(p.id) === String(r.product_id));
          const price     = parseFloat(r.unit_price) > 0 ? parseFloat(r.unit_price) : parseFloat(product?.selling_price || 0);
          const deductAmt = r.action === 'DEDUCT' && parseFloat(r.quantity) > 0 ? parseFloat(r.quantity) * price : 0;
          return (
            <div key={r._id} className="border border-orange-200 bg-orange-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Return Item</span>
                <button type="button" onClick={() => removeReturn(r._id)} className="text-gray-400 hover:text-red-500 p-0.5">
                  <X size={14} />
                </button>
              </div>

              {/* Product picker */}
              <input
                type="text"
                value={r.search ?? r.product_name}
                onChange={e => { updateReturn(r._id, 'search', e.target.value); updateReturn(r._id, 'open', true); }}
                onFocus={e => openReturnDrop(r._id, e.currentTarget)}
                onBlur={() => setTimeout(() => updateReturn(r._id, 'open', false), 150)}
                placeholder="Search returned product…"
                className="input text-sm w-full"
                autoComplete="off"
              />
              {r.open && returnDropPos[r._id] && (
                <div style={{
                  position: 'fixed',
                  top:   returnDropPos[r._id].top,
                  left:  returnDropPos[r._id].left,
                  width: returnDropPos[r._id].width,
                  zIndex: 9999,
                }} className="bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {products
                    .filter(p => !r.search || p.name.toLowerCase().includes((r.search || '').toLowerCase()) || (p.sku || '').toLowerCase().includes((r.search || '').toLowerCase()))
                    .slice(0, 30)
                    .map(p => (
                      <button key={p.id} type="button"
                        onMouseDown={() => pickReturn(r._id, p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 border-b border-gray-50 last:border-0">
                        <span className="font-medium text-gray-900">{p.name}</span>
                        {p.sku && <span className="ml-2 text-xs text-gray-400 font-mono">{p.sku}</span>}
                      </button>
                    ))}
                  {products.filter(p => !r.search || p.name.toLowerCase().includes((r.search || '').toLowerCase())).length === 0 && (
                    <div className="px-3 py-3 text-sm text-gray-400 text-center">No products found</div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <input type="number" inputMode="numeric" min="0" placeholder="Qty returned"
                  value={r.quantity} onChange={e => updateReturn(r._id, 'quantity', e.target.value)}
                  className="input text-sm" />
                <input type="number" inputMode="decimal" min="0"
                  placeholder={product ? `Price (${fmtCurrency(product.selling_price)})` : 'Unit price'}
                  value={r.unit_price} onChange={e => updateReturn(r._id, 'unit_price', e.target.value)}
                  className="input text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select value={r.reason} onChange={e => updateReturn(r._id, 'reason', e.target.value)} className="input text-sm">
                  <option value="EXPIRED">Expired</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="WRONG_ITEM">Wrong Item</option>
                  <option value="OTHER">Other</option>
                </select>
                <select value={r.action} onChange={e => updateReturn(r._id, 'action', e.target.value)} className="input text-sm">
                  <option value="DEDUCT">Deduct from bill</option>
                  <option value="REPLACE">Replacement given</option>
                </select>
              </div>

              {deductAmt > 0 && (
                <div className="text-right text-sm font-bold text-red-600">Deduction: − {fmtCurrency(deductAmt)}</div>
              )}
              {r.action === 'REPLACE' && (
                <div className="text-xs text-blue-600 font-medium">Replacement — add the replacement product to the order above</div>
              )}
            </div>
          );
        })}

        {returnDeduction > 0 && (
          <div className="flex justify-between text-sm font-bold text-red-600 pt-2 border-t border-orange-200">
            <span>Total Return Deductions</span>
            <span>− {fmtCurrency(returnDeduction)}</span>
          </div>
        )}
      </div>

      {/* Order-level discount (MRP mode) */}
      {lines.length > 0 && pricingMode === 'mrp' && (
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Order Discount</h2>
          <div className="flex gap-2 items-center">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
              <button type="button" onClick={() => setOrderDiscType('pct')}
                className={`px-3 py-2 text-sm font-semibold transition-colors ${orderDiscType === 'pct' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>%</button>
              <button type="button" onClick={() => setOrderDiscType('amt')}
                className={`px-3 py-2 text-sm font-semibold transition-colors ${orderDiscType === 'amt' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>LKR</button>
            </div>
            <input
              type="number" min="0" inputMode="decimal"
              value={orderDisc}
              onChange={e => setOrderDisc(e.target.value)}
              placeholder={orderDiscType === 'pct' ? 'Discount %' : 'Discount amount'}
              className="input flex-1 text-right font-semibold text-lg"
            />
          </div>
          <div className="space-y-1 pt-2 border-t border-gray-100">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-mono">{fmtCurrency(subtotal)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Discount {orderDiscType === 'pct' && discVal > 0 ? `(${discVal}%)` : ''}</span>
                <span className="font-mono">− {fmtCurrency(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
              <span>Total</span>
              <span className="font-mono text-primary-700">{fmtCurrency(orderTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order */}
      <div className="card p-4">
        <button type="button" onClick={() => setShowCancel(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors">
          <X size={14} /> Cancel This Order
        </button>
      </div>

      {/* Sticky save bar */}
      <div className="fixed left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3" style={{ bottom: 88 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || lines.length === 0}
          className="w-full py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-base transition-colors disabled:opacity-40"
        >
          {saving
            ? 'Saving…'
            : lines.length === 0
            ? 'Select items to continue'
            : returnDeduction > 0
            ? `Save Changes · ${fmtCurrency(netTotal)} (−${fmtCurrency(returnDeduction)} returns)`
            : `Save Changes · ${fmtCurrency(netTotal)}`}
        </button>
      </div>

      <ConfirmDialog
        open={showCancel}
        title="Cancel Sales Order"
        message={`This will cancel order ${order.order_number} and release all stock reservations. This cannot be undone.`}
        confirmLabel="Cancel Order"
        onConfirm={handleCancel}
        onCancel={() => setShowCancel(false)}
        loading={cancelling}
      />
    </div>
  );
}
