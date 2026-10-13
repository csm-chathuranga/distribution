import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ArrowLeft, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { useCreateSalesOrderMutation } from '../../api/salesApi';
import { useGetCustomersQuery, useGetRoutesQuery } from '../../api/customersApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';
import { useGetStockOnHandQuery } from '../../api/inventoryApi';
import { useGetUsersQuery } from '../../api/settingsApi';
import { selectCurrentUser } from '../../store/authSlice';
import { usePermission } from '../../hooks/usePermission';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { enqueueRequest } from '../../utils/offlineQueue';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
import { today, fmtCurrency } from '../../utils/format';

const headerSchema = yup.object({
  customer_id:  yup.number().required('Customer required').typeError('Select customer'),
  warehouse_id: yup.number().required('Warehouse required').typeError('Select warehouse'),
  route_id:     yup.number().nullable().transform((v, o) => (o === '' || o == null) ? null : v),
  sales_rep_id: yup.number().nullable().transform((v, o) => (o === '' || o == null) ? null : v),
  order_date:   yup.string().required('Date required'),
  notes:        yup.string().nullable(),
});

export default function SalesOrderCreate() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const preCustomerId  = searchParams.get('customer_id') ? Number(searchParams.get('customer_id')) : undefined;
  const currentUser    = useSelector(selectCurrentUser);
  const canManageUsers = usePermission('settings.users');
  const [create, { isLoading }] = useCreateSalesOrderMutation();
  const { isOnline, refreshCount } = useOfflineSync();

  const { data: customers }  = useGetCustomersQuery({ limit: 500 });
  const { data: warehouses } = useGetWarehousesQuery({});
  const { data: routes }     = useGetRoutesQuery({ limit: 200 });
  const { data: users }      = useGetUsersQuery({ limit: 200 }, { skip: !canManageUsers });
  const { data: productsRaw } = useGetProductsQuery({ limit: 500, is_active: true });
  const products = productsRaw?.data || [];

  const selectedWarehouseId = watch('warehouse_id');
  const { data: stockRaw } = useGetStockOnHandQuery(
    { warehouse_id: selectedWarehouseId },
    { skip: !selectedWarehouseId }
  );
  // Map product_id → available qty for quick lookup
  const stockMap = useMemo(() => {
    const m = {};
    (stockRaw?.data || []).forEach(s => { m[s.product_id] = s.available; });
    return m;
  }, [stockRaw]);

  // qty state: { [productId]: { qty: '', free: '' } }
  const [qtys, setQtys]         = useState({});
  const [sizeFilter,    setSizeFilter]    = useState(null);
  const [orderDisc,     setOrderDisc]     = useState('');
  const [orderDiscType, setOrderDiscType] = useState('pct'); // 'pct' | 'amt'
  const SIZES = [
    { label: '250ml',  re: /250/i },
    { label: '500ml',  re: /500/i },
    { label: '750ml',  re: /750/i },
    { label: '1L',     re: /(?<![0-9.])1[Ll](?![Ll0-9])/  },
    { label: '1.5L',   re: /1\.5[Ll]/i },
  ];

  const setQty      = (id, val) => setQtys(prev => ({ ...prev, [id]: { ...prev[id], qty: val } }));
  const setFree     = (id, val) => setQtys(prev => ({ ...prev, [id]: { ...prev[id], free: val } }));

  // Group products by category
  const grouped = useMemo(() => {
    const map = {};
    products.forEach(p => {
      const cat = p.Category?.name || 'Uncategorized';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [products]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: yupResolver(headerSchema),
    defaultValues: {
      order_date:   today(),
      sales_rep_id: currentUser?.id || '',
      ...(preCustomerId ? { customer_id: preCustomerId } : {}),
    },
  });

  const selectedCustomerId = watch('customer_id');
  const selectedCustomer   = customers?.data?.find(c => String(c.id) === String(selectedCustomerId));
  const creditLimit        = parseFloat(selectedCustomer?.credit_limit || 0);
  const outstanding        = parseFloat(selectedCustomer?.outstanding_balance || 0);
  const overLimit          = creditLimit > 0 && outstanding >= creditLimit;
  const nearLimit          = creditLimit > 0 && !overLimit && outstanding >= creditLimit * 0.8;

  const customerOpts  = customers?.data?.map(c => ({ value: c.id, label: c.name })) || [];
  const warehouseOpts = warehouses?.data?.map(w => ({ value: w.id, label: w.name })) || [];
  const routeOpts     = [{ value: '', label: '— No route —' }, ...(routes?.data?.map(r => ({ value: r.id, label: r.name })) || [])];
  const userOpts      = [{ value: '', label: '— No rep —' }, ...(users?.data?.map(u => ({ value: u.id, label: u.name })) || [])];

  // Compute totals
  const lines = products
    .map(p => {
      const qty   = parseFloat(qtys[p.id]?.qty  || 0);
      const free  = parseFloat(qtys[p.id]?.free || 0);
      const price = parseFloat(p.selling_price || 0);
      const total = qty * price;
      return { product: p, qty, free, price, total };
    })
    .filter(l => l.qty > 0);

  const subtotal     = lines.reduce((s, l) => s + l.total, 0);
  const discVal      = parseFloat(orderDisc) || 0;
  const discountAmt  = orderDiscType === 'pct' ? subtotal * discVal / 100 : Math.min(discVal, subtotal);
  const orderTotal   = Math.max(0, subtotal - discountAmt);

  const onSubmit = async (headerData) => {
    if (lines.length === 0) {
      toast.error('Add at least one item with a quantity');
      return;
    }
    const payload = {
      ...headerData,
      subtotal_amount: subtotal,
      discount_amount: discountAmt,
      total_amount: orderTotal,
      lines: lines.map(l => ({
        product_id:    l.product.id,
        quantity:      l.qty,
        free_quantity: l.free || 0,
        unit_price:    l.price,
        discount_rate: 0,
        line_total:    l.total,
      })),
    };

    if (!navigator.onLine) {
      try {
        await enqueueRequest({ id: `order-${Date.now()}-${Math.random().toString(36).slice(2)}`, url: '/sales-orders', method: 'POST', body: payload });
        await refreshCount();
        toast.success('Order saved — will sync when back online', { duration: 4000 });
        navigate('/sales-orders');
      } catch { toast.error('Failed to save offline'); }
      return;
    }

    try {
      await create(payload).unwrap();
      toast.success('Sales order created');
      navigate('/sales-orders');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/sales-orders')} className="p-2 text-gray-500 hover:text-gray-900 active:opacity-70">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">New Sales Order</h1>
      </div>

      {!isOnline && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 text-white text-sm font-medium">
          <WifiOff size={15} className="text-red-400 flex-shrink-0" />
          Offline — order will sync when connected
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Order Details */}
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Order Details</h2>

          <SelectField label="Customer" required options={customerOpts}
            error={errors.customer_id?.message} {...register('customer_id')} />

          {overLimit && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 font-medium">
              ⛔ Credit limit exceeded — Outstanding: {fmtCurrency(outstanding)} / Limit: {fmtCurrency(creditLimit)}
            </div>
          )}
          {nearLimit && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
              ⚠ Near credit limit — Outstanding: {fmtCurrency(outstanding)} / Limit: {fmtCurrency(creditLimit)}
            </div>
          )}

          <SelectField label="Warehouse" required options={warehouseOpts}
            error={errors.warehouse_id?.message} {...register('warehouse_id')} />

          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Route" options={routeOpts}
              error={errors.route_id?.message} {...register('route_id')} />
            {canManageUsers ? (
              <SelectField label="Sales Rep" options={userOpts}
                error={errors.sales_rep_id?.message} {...register('sales_rep_id')} />
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sales Rep</label>
                <div className="input bg-gray-50 text-gray-700 cursor-default">{currentUser?.name}</div>
                <input type="hidden" {...register('sales_rep_id')} value={currentUser?.id} />
              </div>
            )}
          </div>

          <TextField label="Order Date" required type="date"
            error={errors.order_date?.message} {...register('order_date')} />
          <TextareaField label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
        </div>

        {/* Catalogue order table */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Products</h2>
            {lines.length > 0 && (
              <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                {lines.length} item{lines.length > 1 ? 's' : ''} added
              </span>
            )}
          </div>

          {/* Size filter chips */}
          <div className="flex gap-2 overflow-x-auto px-3 py-2 border-b border-gray-100 scrollbar-none">
            <button type="button" onClick={() => setSizeFilter(null)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                sizeFilter === null ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>All</button>
            {SIZES.map(s => (
              <button type="button" key={s.label}
                onClick={() => setSizeFilter(s)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  sizeFilter?.label === s.label ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{s.label}</button>
            ))}
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_56px_72px_80px_56px] gap-0 border-b border-gray-200 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <div className="px-3 py-2">Description</div>
            <div className="px-1 py-2 text-center">Qty</div>
            <div className="px-1 py-2 text-right">Price</div>
            <div className="px-1 py-2 text-right">Amount</div>
            <div className="px-1 py-2 text-center">Free</div>
          </div>

          {Object.entries(grouped)
            .map(([cat, prods]) => [
              cat,
              sizeFilter
                ? prods.filter(p => sizeFilter.re.test(p.name + ' ' + (p.Category?.name || '')))
                : prods,
            ])
            .filter(([, prods]) => prods.length > 0)
            .map(([category, prods]) => (
            <div key={category}>
              {/* Category header */}
              <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
                <span className="text-sm font-bold text-gray-700">{category}</span>
              </div>

              {prods.map((p, idx) => {
                const qty   = qtys[p.id]?.qty  ?? '';
                const free  = qtys[p.id]?.free ?? '';
                const price = parseFloat(p.selling_price || 0);
                const amt   = (parseFloat(qty) || 0) * price;
                const hasQty = parseFloat(qty) > 0;

                return (
                  <div
                    key={p.id}
                    className={`grid grid-cols-[1fr_56px_72px_80px_56px] gap-0 border-b border-gray-100 items-center ${
                      hasQty ? 'bg-green-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    {/* Description */}
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.sku && <span className="text-xs text-gray-400 font-mono">{p.sku}</span>}
                        {selectedWarehouseId && (
                          <span className={`text-xs font-semibold ${
                            (stockMap[p.id] ?? 0) <= 0
                              ? 'text-red-500'
                              : (stockMap[p.id] ?? 0) < 10
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}>
                            Stock: {stockMap[p.id] ?? 0}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Qty input */}
                    <div className="px-1 py-1.5">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={qty}
                        onChange={e => setQty(p.id, e.target.value)}
                        placeholder="0"
                        className={`w-full h-10 text-center text-base font-bold rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          hasQty ? 'border-green-400 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-700'
                        }`}
                      />
                    </div>

                    {/* Unit price */}
                    <div className="px-1 py-2 text-right">
                      <span className="text-xs font-medium text-gray-600 font-mono">{fmtCurrency(price)}</span>
                    </div>

                    {/* Amount */}
                    <div className="px-1 py-2 text-right">
                      <span className={`text-sm font-bold font-mono ${hasQty ? 'text-green-700' : 'text-gray-300'}`}>
                        {hasQty ? fmtCurrency(amt) : '—'}
                      </span>
                    </div>

                    {/* Free qty */}
                    <div className="px-1 py-1.5">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={free}
                        onChange={e => setFree(p.id, e.target.value)}
                        placeholder="0"
                        className="w-full h-9 text-center text-xs font-medium rounded-lg border border-gray-200 bg-white text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Order summary */}
          {lines.length > 0 && (
            <div className="px-4 py-3 bg-primary-50 border-t border-primary-100 space-y-1">
              {lines.map(l => (
                <div key={l.product.id} className="flex items-center justify-between text-xs text-gray-700">
                  <span className="truncate flex-1 mr-2">{l.product.name} × {l.qty}{l.free > 0 ? ` (+${l.free} free)` : ''}</span>
                  <span className="font-bold font-mono flex-shrink-0">{fmtCurrency(l.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Order-level discount & total */}
        {lines.length > 0 && (
          <div className="card p-4 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Order Discount</h2>
            <div className="flex gap-2 items-center">
              {/* Type toggle */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                <button type="button"
                  onClick={() => setOrderDiscType('pct')}
                  className={`px-3 py-2 text-sm font-semibold transition-colors ${orderDiscType === 'pct' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>%</button>
                <button type="button"
                  onClick={() => setOrderDiscType('amt')}
                  className={`px-3 py-2 text-sm font-semibold transition-colors ${orderDiscType === 'amt' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>LKR</button>
              </div>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={orderDisc}
                onChange={e => setOrderDisc(e.target.value)}
                placeholder={orderDiscType === 'pct' ? 'Discount %' : 'Discount amount'}
                className="input flex-1 text-right font-semibold text-lg"
              />
            </div>
            {/* Totals breakdown */}
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
      </form>

      {/* Sticky submit */}
      <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3">
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading || lines.length === 0}
          className="w-full py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-base transition-colors disabled:opacity-40"
        >
          {isLoading
            ? 'Creating…'
            : lines.length === 0
            ? 'Enter quantities to continue'
            : !isOnline
            ? `Save Offline · ${fmtCurrency(orderTotal)}`
            : `Create Order · ${fmtCurrency(orderTotal)}`}
        </button>
      </div>
    </div>
  );
}
