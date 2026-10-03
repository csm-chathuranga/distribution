import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Plus, Trash2, MapPin, MapPinOff, Loader, ArrowLeft, Truck, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateInvoiceMutation, useGetVanStockQuery, useGetActiveSheetQuery } from '../../api/salesApi';
import { useGetCustomersQuery, useCreateCustomerMutation } from '../../api/customersApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';
import { usePermission } from '../../hooks/usePermission';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { today, fmtCurrency } from '../../utils/format';

const lineSchema = yup.object({
  product_id:      yup.number().required('Product required').typeError('Select product'),
  quantity:        yup.number().positive('Must be > 0').required('Qty required').typeError('Enter qty'),
  unit_price:      yup.number().min(0).required('Price required').typeError('Enter price'),
  vat_rate:        yup.number().min(0).max(100).default(0).typeError('Enter %'),
  discount_amount: yup.number().min(0).default(0).typeError('Enter discount'),
});

const schema = yup.object({
  customer_id:  yup.number().required('Customer is required').typeError('Select customer'),
  warehouse_id: yup.number().required('Warehouse is required').typeError('Select warehouse'),
  invoice_date: yup.string().required('Date required'),
  due_date:     yup.string().nullable(),
  payment_terms:yup.string().nullable(),
  notes:        yup.string().nullable(),
  lines:        yup.array().of(lineSchema).min(1, 'Add at least one item'),
});

async function getLocation() {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    await Geolocation.requestPermissions();
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return new Promise((resolve, reject) =>
      navigator.geolocation
        ? navigator.geolocation.getCurrentPosition(
            p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
            () => reject(new Error('Location denied')),
            { enableHighAccuracy: true, timeout: 10000 }
          )
        : reject(new Error('Geolocation not supported'))
    );
  }
}

const BLANK_LINE = { product_id: '', quantity: 1, unit_price: 0, vat_rate: 0, discount_amount: 0 };

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sheetId = searchParams.get('sheet');
  const preCustomerId = searchParams.get('customer_id') ? Number(searchParams.get('customer_id')) : null;

  const canViewAll = usePermission('sales.view_all');
  const canViewOwn = usePermission('sales.view_own');
  const isOwnOnly  = canViewOwn && !canViewAll;

  // For sales reps (own-only), auto-detect their active LOADED loading sheet
  const { data: activeSheet, isLoading: activeSheetLoading, isError: noActiveSheet } =
    useGetActiveSheetQuery(undefined, { skip: Boolean(sheetId) || !isOwnOnly });

  const effectiveSheetId = sheetId || activeSheet?.id?.toString() || null;
  const isVanMode = Boolean(effectiveSheetId);

  const [createInvoice, { isLoading }] = useCreateInvoiceMutation();
  const [createCustomer, { isLoading: creatingCustomer }] = useCreateCustomerMutation();
  const [location,  setLocation]  = useState(null);
  const [locStatus, setLocStatus] = useState('fetching');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName]   = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustType, setNewCustType]   = useState('RETAILER');

  useEffect(() => {
    getLocation()
      .then(loc => { setLocation(loc); setLocStatus('ok'); })
      .catch(() => setLocStatus('denied'));
  }, []);

  const { data: vanStock, isLoading: vanLoading } = useGetVanStockQuery(effectiveSheetId, { skip: !effectiveSheetId });
  const { data: customers }  = useGetCustomersQuery({ limit: 500 });
  const { data: products }   = useGetProductsQuery({ limit: 500, is_active: true }, { skip: isVanMode });
  const { data: warehouses } = useGetWarehousesQuery({}, { skip: isVanMode });

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { invoice_date: today(), lines: [{ ...BLANK_LINE }], ...(preCustomerId ? { customer_id: preCustomerId } : {}) },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines') || [];

  // Auto-set warehouse when van stock loads
  useEffect(() => {
    if (vanStock?.warehouse_id) setValue('warehouse_id', vanStock.warehouse_id);
  }, [vanStock, setValue]);

  // Product options + map
  const productMap = {};
  const productOpts = isVanMode
    ? (vanStock?.lines || []).map(l => {
        productMap[l.product_id] = l.product;
        return { value: l.product_id, label: `${l.product.sku} — ${l.product.name}`, remaining: l.remaining };
      })
    : (products?.data || []).map(p => {
        productMap[p.id] = p;
        return { value: p.id, label: `${p.sku} — ${p.name}` };
      });

  const vanStockMap = {};
  if (isVanMode && vanStock) vanStock.lines.forEach(l => { vanStockMap[l.product_id] = l; });

  const customerOpts  = customers?.data?.map(c => ({ value: c.id, label: c.name })) || [];
  const warehouseOpts = warehouses?.data?.map(w => ({ value: w.id, label: w.name })) || [];

  const handleAddCustomer = async () => {
    if (!newCustName.trim()) return;
    try {
      const result = await createCustomer({ name: newCustName.trim(), phone: newCustPhone.trim() || undefined, customer_type: newCustType }).unwrap();
      setValue('customer_id', result.id);
      toast.success(`${result.name} added`);
      setShowAddCustomer(false);
      setNewCustName(''); setNewCustPhone(''); setNewCustType('RETAILER');
    } catch (e) { toast.error(e.data?.message || 'Failed to add customer'); }
  };

  const handleProductChange = (idx, productId) => {
    const product = productMap[Number(productId)];
    if (product) {
      setValue(`lines.${idx}.unit_price`, product.selling_price);
      setValue(`lines.${idx}.vat_rate`,   product.vat_rate || 0);
    }
  };

  const lineTotal = (l) => {
    const qty  = Number(l.quantity) || 0;
    const price= Number(l.unit_price) || 0;
    const disc = Number(l.discount_amount) || 0;
    const vat  = Number(l.vat_rate) || 0;
    const sub  = qty * price - disc;
    return sub + (sub * vat / 100);
  };

  const subtotalSum = lines.reduce((s, l) =>
    s + (Number(l.quantity)||0) * (Number(l.unit_price)||0) - (Number(l.discount_amount)||0), 0);
  const vatSum = lines.reduce((s, l) => {
    const st = (Number(l.quantity)||0) * (Number(l.unit_price)||0) - (Number(l.discount_amount)||0);
    return s + st * (Number(l.vat_rate)||0) / 100;
  }, 0);
  const grandTotal = subtotalSum + vatSum;

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data, company_id: 1, branch_id: 1,
        latitude:  location?.latitude  ?? null,
        longitude: location?.longitude ?? null,
      };
      if (isVanMode) payload.loading_sheet_id = parseInt(effectiveSheetId);
      const inv = await createInvoice(payload).unwrap();
      if (inv.__queued) {
        toast.success('Saved offline — will sync when connected');
        navigate(isVanMode ? `/loading-sheets/${effectiveSheetId}` : '/invoices');
        return;
      }
      toast.success('Invoice created');
      navigate(`/invoices/${inv.id}`);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  // Sales rep waiting for active-sheet lookup
  if (isOwnOnly && !sheetId && activeSheetLoading) {
    return <div className="text-center py-20 text-gray-400">Finding your loading sheet…</div>;
  }

  // Sales rep has no active (LOADED) loading sheet — cannot invoice without van stock
  if (isOwnOnly && !sheetId && noActiveSheet) {
    return (
      <div className="max-w-sm mx-auto mt-16 card p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <Truck size={28} className="text-amber-500" />
        </div>
        <h2 className="font-bold text-gray-900 text-lg">No Active Loading Sheet</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          You don't have a loaded van for today. Ask your manager to create and load a loading sheet before invoicing.
        </p>
        <button onClick={() => navigate(-1)} className="btn-secondary w-full">Go Back</button>
      </div>
    );
  }

  if (isVanMode && vanLoading) {
    return <div className="text-center py-20 text-gray-400">Loading van stock…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto md:max-w-5xl space-y-4 pb-40 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(isVanMode ? `/loading-sheets/${effectiveSheetId}` : '/invoices')} className="p-2 text-gray-500 hover:text-gray-900 active:opacity-70">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">New Invoice</h1>
          {isVanMode && vanStock && (
            <p className="text-xs text-blue-600 font-medium">Van Sales · {vanStock.sheet_number} · {vanStock.warehouse?.name}</p>
          )}
        </div>
        {/* Van mode badge */}
        {isVanMode && (
          <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
            <Truck size={11} /> Van Mode
          </span>
        )}
        {/* Location pill */}
        {locStatus === 'fetching' && (
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            <Loader size={11} className="animate-spin" /> GPS…
          </span>
        )}
        {locStatus === 'denied' && (
          <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
            <MapPinOff size={11} /> No GPS
          </span>
        )}
        {locStatus === 'ok' && (
          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
            <MapPin size={11} /> GPS OK
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Invoice Details */}
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Invoice Details</h2>

          {/* Customer — searchable + quick-add */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-500">Customer <span className="text-red-500">*</span></p>
              <button type="button" onClick={() => setShowAddCustomer(v => !v)}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors">
                {showAddCustomer ? <><X size={12} /> Cancel</> : <><UserPlus size={12} /> New Customer</>}
              </button>
            </div>
            <Controller name="customer_id" control={control} render={({ field }) => (
              <SearchableSelect
                value={field.value} onChange={field.onChange}
                options={customerOpts} placeholder="Search customer…"
                error={errors.customer_id?.message}
              />
            )} />
            {showAddCustomer && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-blue-700">Quick Add Customer</p>
                <input value={newCustName} onChange={e => setNewCustName(e.target.value)}
                  placeholder="Name *" className="input text-sm py-1.5 w-full" autoFocus />
                <div className="flex gap-2">
                  <input value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)}
                    placeholder="Phone" className="input text-sm py-1.5 flex-1" />
                  <select value={newCustType} onChange={e => setNewCustType(e.target.value)} className="input text-sm py-1.5 flex-1">
                    <option value="RETAILER">Retailer</option>
                    <option value="WHOLESALER">Wholesaler</option>
                    <option value="DIRECT">Direct</option>
                    <option value="INSTITUTION">Institution</option>
                  </select>
                </div>
                <button type="button" onClick={handleAddCustomer} disabled={!newCustName.trim() || creatingCustomer}
                  className="w-full py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                  {creatingCustomer ? 'Adding…' : 'Add & Select'}
                </button>
              </div>
            )}
          </div>

          {/* In van mode the warehouse is fixed — show as read-only text */}
          {isVanMode ? (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Dispatch Warehouse</p>
              <p className="text-sm font-semibold text-gray-800 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                {vanStock?.warehouse?.name || '—'}
              </p>
              <input type="hidden" {...register('warehouse_id')} />
            </div>
          ) : (
            <SelectField
              label="Dispatch Warehouse" required
              options={warehouseOpts}
              error={errors.warehouse_id?.message}
              {...register('warehouse_id')}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Invoice Date" required type="date" error={errors.invoice_date?.message} {...register('invoice_date')} />
            <TextField label="Due Date" type="date" error={errors.due_date?.message} {...register('due_date')} />
          </div>

          <TextField label="Payment Terms" placeholder="e.g. Net 30" error={errors.payment_terms?.message} {...register('payment_terms')} />
          <TextareaField label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
        </div>

        {/* Line Items */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Items</h2>
            <button type="button" onClick={() => append({ ...BLANK_LINE })}
              className="flex items-center gap-1 text-sm text-primary-600 font-semibold hover:text-primary-800">
              <Plus size={16} /> Add item
            </button>
          </div>

          {errors.lines?.message && (
            <p className="text-sm text-red-600 bg-red-50 mx-4 mt-3 px-3 py-2 rounded-lg">{errors.lines.message}</p>
          )}

          {/* ── Desktop Table ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-[35%]">
                    Product {isVanMode && <span className="text-blue-500 normal-case">(van stock)</span>}
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Qty</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Unit Price</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">VAT %</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Discount</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right w-28">Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fields.map((field, i) => {
                  const selProductId = Number(lines[i]?.product_id);
                  const vanLine = vanStockMap[selProductId];
                  return (
                    <tr key={field.id}>
                      <td className="px-4 py-2">
                        <Controller
                          control={control}
                          name={`lines.${i}.product_id`}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value}
                              onChange={val => {
                                field.onChange(val);
                                handleProductChange(i, val);
                              }}
                              options={productOpts.map(o => ({
                                value: o.value,
                                label: o.label + (isVanMode && o.remaining !== undefined ? ` · ${o.remaining} left` : ''),
                              }))}
                              placeholder="Search product…"
                            />
                          )}
                        />
                        {isVanMode && vanLine && (
                          <p className="text-xs text-blue-500 mt-0.5">{vanLine.remaining} available in van</p>
                        )}
                        {errors.lines?.[i]?.product_id && <p className="text-xs text-red-500 mt-0.5">{errors.lines[i].product_id.message}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button type="button"
                            onClick={() => { const v = Math.max(1, (parseFloat(lines[i]?.quantity) || 1) - 1); setValue(`lines.${i}.quantity`, v); }}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">−</button>
                          <input type="number" step="1" min="1"
                            max={isVanMode && vanLine ? vanLine.remaining : undefined}
                            className={`input text-sm py-1.5 text-center w-16 ${isVanMode && vanLine && parseFloat(lines[i]?.quantity) > vanLine.remaining ? 'border-red-400' : ''}`}
                            onFocus={e => e.target.select()} {...register(`lines.${i}.quantity`)} />
                          <button type="button"
                            onClick={() => { const max = isVanMode && vanLine ? vanLine.remaining : 9999; const v = Math.min(max, (parseFloat(lines[i]?.quantity) || 0) + 1); setValue(`lines.${i}.quantity`, v); }}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">+</button>
                        </div>
                        {isVanMode && vanLine !== undefined && (
                          <p className={`text-xs mt-0.5 text-right ${parseFloat(lines[i]?.quantity) > vanLine.remaining ? 'text-red-500 font-semibold' : 'text-blue-400'}`}>
                            avail: {vanLine.remaining}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" className="input text-sm py-1.5 w-full" onFocus={e => e.target.select()} {...register(`lines.${i}.unit_price`)} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" className="input text-sm py-1.5 w-full" onFocus={e => e.target.select()} {...register(`lines.${i}.vat_rate`)} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" className="input text-sm py-1.5 w-full" onFocus={e => e.target.select()} {...register(`lines.${i}.discount_amount`)} />
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900 whitespace-nowrap">
                        {fmtCurrency(lineTotal(lines[i] || {}))}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 size={15} />
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
          <div className="md:hidden p-4 space-y-3">
            {fields.map((field, i) => {
              const selProductId = Number(lines[i]?.product_id);
              const vanLine = vanStockMap[selProductId];
              const qty = parseFloat(lines[i]?.quantity) || 0;
              const overStock = isVanMode && vanLine !== undefined && qty > vanLine.remaining;
              return (
                <div key={field.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  {/* Header bar */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Item {i + 1}</span>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(i)}
                        className="flex items-center gap-1 text-xs text-red-500 font-semibold hover:text-red-700 transition-colors">
                        <Trash2 size={13} /> Remove
                      </button>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Product — full width, overflow contained */}
                    <div className="min-w-0">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Product {isVanMode && <span className="text-blue-500 normal-case font-medium">(van stock)</span>}
                      </label>
                      <div className="w-full overflow-hidden">
                        <Controller
                          control={control}
                          name={`lines.${i}.product_id`}
                          render={({ field }) => (
                            <SearchableSelect
                              value={field.value}
                              onChange={val => { field.onChange(val); handleProductChange(i, val); }}
                              options={productOpts.map(o => ({
                                value: o.value,
                                label: o.label + (isVanMode && o.remaining !== undefined ? ` · ${o.remaining} left` : ''),
                              }))}
                              placeholder="Search product…"
                            />
                          )}
                        />
                      </div>
                      {errors.lines?.[i]?.product_id && <p className="text-xs text-red-500 mt-1">{errors.lines[i].product_id.message}</p>}
                      {isVanMode && vanLine && (
                        <p className="text-xs text-blue-500 mt-1 font-medium">{vanLine.remaining} available in van</p>
                      )}
                    </div>

                    {/* Qty stepper + Unit Price */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Qty</label>
                        <div className="flex items-center">
                          <button type="button"
                            onClick={() => { const v = Math.max(1, qty - 1); setValue(`lines.${i}.quantity`, v); }}
                            className="w-10 h-12 flex items-center justify-center rounded-l-xl border border-gray-300 bg-gray-100 text-gray-700 text-lg font-bold active:bg-gray-200 flex-shrink-0">−</button>
                          <input type="number" step="1" min="1"
                            max={isVanMode && vanLine ? vanLine.remaining : undefined}
                            className={`h-12 flex-1 border-y border-gray-300 text-center font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:z-10 w-0 ${overStock ? 'border-red-400 text-red-600' : ''}`}
                            style={{ fontSize: 16 }}
                            onFocus={e => e.target.select()} {...register(`lines.${i}.quantity`)} />
                          <button type="button"
                            onClick={() => { const max = isVanMode && vanLine ? vanLine.remaining : 9999; setValue(`lines.${i}.quantity`, Math.min(max, qty + 1)); }}
                            className="w-10 h-12 flex items-center justify-center rounded-r-xl border border-gray-300 bg-gray-100 text-gray-700 text-lg font-bold active:bg-gray-200 flex-shrink-0">+</button>
                        </div>
                        {overStock && <p className="text-xs text-red-500 font-semibold mt-1">Exceeds van stock</p>}
                      </div>
                      <TextField label="Unit Price" type="number" step="0.01" inputMode="decimal"
                        error={errors.lines?.[i]?.unit_price?.message} {...register(`lines.${i}.unit_price`)} />
                    </div>

                    {/* VAT + Discount */}
                    <div className="grid grid-cols-2 gap-3">
                      <TextField label="VAT %" type="number" step="0.01" inputMode="decimal"
                        error={errors.lines?.[i]?.vat_rate?.message} {...register(`lines.${i}.vat_rate`)} />
                      <TextField label="Discount (LKR)" type="number" step="0.01" inputMode="decimal"
                        error={errors.lines?.[i]?.discount_amount?.message} {...register(`lines.${i}.discount_amount`)} />
                    </div>
                  </div>

                  {/* Line total footer */}
                  <div className="flex items-center justify-between px-4 py-3 bg-primary-50 border-t border-primary-100">
                    <span className="text-xs font-semibold text-primary-600 uppercase tracking-wide">Line Total</span>
                    <span className="font-extrabold text-primary-700 font-mono text-base">{fmtCurrency(lineTotal(lines[i] || {}))}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals summary */}
        <div className="card p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span className="font-mono">{fmtCurrency(subtotalSum)}</span>
          </div>
          {vatSum > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>VAT</span>
              <span className="font-mono">{fmtCurrency(vatSum)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
            <span>Grand Total</span>
            <span className="font-mono text-primary-700">{fmtCurrency(grandTotal)}</span>
          </div>
        </div>

      </form>

      {/* Desktop submit button */}
      <div className="hidden md:flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => navigate(isVanMode ? `/loading-sheets/${effectiveSheetId}` : '/invoices')} className="btn-secondary px-6">
          Cancel
        </button>
        <button type="button" onClick={handleSubmit(onSubmit)} disabled={isLoading}
          className="btn btn-primary px-8 disabled:opacity-50">
          {isLoading ? 'Creating…' : `Create Invoice · ${fmtCurrency(grandTotal)}`}
        </button>
      </div>

      {/* Mobile sticky submit bar */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3">
        <button type="button" onClick={handleSubmit(onSubmit)} disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-base transition-colors disabled:opacity-50">
          {isLoading ? 'Creating…' : `Create Invoice · ${fmtCurrency(grandTotal)}`}
        </button>
      </div>
    </div>
  );
}
