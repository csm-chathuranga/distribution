import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { useCreateSalesOrderMutation } from '../../api/salesApi';
import { useGetCustomersQuery, useGetRoutesQuery } from '../../api/customersApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';
import { useGetUsersQuery } from '../../api/settingsApi';
import { selectCurrentUser } from '../../store/authSlice';
import { usePermission } from '../../hooks/usePermission';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
import { today, fmtCurrency } from '../../utils/format';

const lineSchema = yup.object({
  product_id:    yup.number().required('Required').typeError('Select product'),
  quantity:      yup.number().positive('Must be > 0').required('Required').typeError('Enter qty'),
  free_quantity: yup.number().min(0).nullable().transform(v => v === '' ? 0 : Number(v)),
  unit_price:    yup.number().min(0).required('Required').typeError('Enter price'),
  discount:      yup.number().min(0).max(100).nullable().transform(v => v === '' ? 0 : Number(v)),
});

const schema = yup.object({
  customer_id:  yup.number().required('Customer required').typeError('Select customer'),
  warehouse_id: yup.number().required('Warehouse required').typeError('Select warehouse'),
  route_id:     yup.number().nullable().transform(v => v === '' ? null : Number(v)),
  sales_rep_id: yup.number().nullable().transform(v => v === '' ? null : Number(v)),
  order_date:   yup.string().required('Date required'),
  notes:        yup.string().nullable(),
  lines:        yup.array().of(lineSchema).min(1, 'Add at least one item'),
});

const BLANK_LINE = { product_id: '', quantity: 1, free_quantity: 0, unit_price: 0, discount: 0 };

export default function SalesOrderCreate() {
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();
  const preCustomerId = searchParams.get('customer_id') ? Number(searchParams.get('customer_id')) : undefined;
  const currentUser  = useSelector(selectCurrentUser);
  const canManageUsers = usePermission('settings.users');
  const [create, { isLoading }] = useCreateSalesOrderMutation();

  const { data: customers }  = useGetCustomersQuery({ limit: 500 });
  const { data: warehouses } = useGetWarehousesQuery({});
  const { data: routes }     = useGetRoutesQuery({ limit: 200 });
  const { data: users }      = useGetUsersQuery({ limit: 200 }, { skip: !canManageUsers });
  const { data: products }   = useGetProductsQuery({ limit: 500, is_active: true });

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      order_date:   today(),
      sales_rep_id: currentUser?.id || '',
      lines: [{ ...BLANK_LINE }],
      ...(preCustomerId ? { customer_id: preCustomerId } : {}),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines') || [];
  const selectedCustomerId = watch('customer_id');

  const selectedCustomer = customers?.data?.find(c => String(c.id) === String(selectedCustomerId));
  const creditLimit = parseFloat(selectedCustomer?.credit_limit || 0);
  const outstanding = parseFloat(selectedCustomer?.outstanding_balance || 0);
  const overLimit   = creditLimit > 0 && outstanding >= creditLimit;
  const nearLimit   = creditLimit > 0 && !overLimit && outstanding >= creditLimit * 0.8;

  const customerOpts  = customers?.data?.map(c => ({ value: c.id, label: c.name })) || [];
  const warehouseOpts = warehouses?.data?.map(w => ({ value: w.id, label: w.name })) || [];
  const routeOpts     = [{ value: '', label: '— No route —' }, ...(routes?.data?.map(r => ({ value: r.id, label: r.name })) || [])];
  const userOpts      = [{ value: '', label: '— No rep —' }, ...(users?.data?.map(u => ({ value: u.id, label: u.name })) || [])];
  const productOpts   = products?.data?.map(p => ({ value: p.id, label: `${p.sku} — ${p.name}` })) || [];

  const handleProductChange = (index, productId) => {
    const product = products?.data?.find(p => String(p.id) === String(productId));
    if (product) setValue(`lines.${index}.unit_price`, product.selling_price || 0);
  };

  const lineAmt = (l) => {
    const amt = (Number(l.quantity)||0) * (Number(l.unit_price)||0);
    return amt * (1 - (Number(l.discount)||0) / 100);
  };
  const total = lines.reduce((s, l) => s + lineAmt(l), 0);

  const onSubmit = async (data) => {
    try {
      const linesWithTotal = data.lines.map(l => ({
        ...l,
        free_quantity: Number(l.free_quantity) || 0,
        discount_rate: Number(l.discount) || 0,
        line_total: lineAmt(l),
      }));
      await create({ ...data, lines: linesWithTotal, total_amount: total }).unwrap();
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Order Details */}
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Order Details</h2>

          <SelectField
            label="Customer" required
            options={customerOpts}
            error={errors.customer_id?.message}
            {...register('customer_id')}
          />
          {overLimit && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 font-medium">
              ⛔ Credit limit exceeded — Outstanding: {fmtCurrency(outstanding)} / Limit: {fmtCurrency(creditLimit)}. Order may be rejected.
            </div>
          )}
          {nearLimit && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
              ⚠ Near credit limit — Outstanding: {fmtCurrency(outstanding)} / Limit: {fmtCurrency(creditLimit)}
            </div>
          )}
          <SelectField
            label="Warehouse" required
            options={warehouseOpts}
            error={errors.warehouse_id?.message}
            {...register('warehouse_id')}
          />

          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Route" options={routeOpts} error={errors.route_id?.message} {...register('route_id')} />
            {canManageUsers ? (
              <SelectField label="Sales Rep" options={userOpts} error={errors.sales_rep_id?.message} {...register('sales_rep_id')} />
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sales Rep</label>
                <div className="input bg-gray-50 text-gray-700 cursor-default">{currentUser?.name}</div>
                <input type="hidden" {...register('sales_rep_id')} value={currentUser?.id} />
              </div>
            )}
          </div>

          <TextField label="Order Date" required type="date" error={errors.order_date?.message} {...register('order_date')} />
          <TextareaField label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
        </div>

        {/* Line Items */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Items</h2>
            <button
              type="button"
              onClick={() => append({ ...BLANK_LINE })}
              className="flex items-center gap-1 text-sm text-primary-600 font-semibold hover:text-primary-800"
            >
              <Plus size={16} /> Add item
            </button>
          </div>

          {errors.lines?.message && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{errors.lines.message}</p>
          )}

          <div className="space-y-3">
            {fields.map((field, i) => {
              const amt = lineAmt(lines[i] || {});
              const reg = register;
              return (
                <div key={field.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  {/* Item header bar */}
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
                    {/* Product select */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Product</label>
                      <SelectField
                        options={productOpts}
                        error={errors.lines?.[i]?.product_id?.message}
                        {...reg(`lines.${i}.product_id`, { onChange: e => handleProductChange(i, e.target.value) })}
                      />
                    </div>

                    {/* Qty stepper + Unit Price */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Qty</label>
                        <div className="flex items-center gap-0">
                          <button type="button"
                            onClick={() => { const v = parseInt(lines[i]?.quantity || 1); if (v > 1) setValue(`lines.${i}.quantity`, v - 1); }}
                            className="w-10 h-12 flex items-center justify-center rounded-l-xl border border-gray-300 bg-gray-100 text-gray-700 text-lg font-bold active:bg-gray-200 transition-colors flex-shrink-0">−</button>
                          <input
                            type="number" step="1" inputMode="numeric"
                            className="h-12 flex-1 border-y border-gray-300 text-center font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-0"
                            style={{ fontSize: 16 }}
                            {...reg(`lines.${i}.quantity`)}
                          />
                          <button type="button"
                            onClick={() => { const v = parseInt(lines[i]?.quantity || 1); setValue(`lines.${i}.quantity`, v + 1); }}
                            className="w-10 h-12 flex items-center justify-center rounded-r-xl border border-gray-300 bg-gray-100 text-gray-700 text-lg font-bold active:bg-gray-200 transition-colors flex-shrink-0">+</button>
                        </div>
                        {errors.lines?.[i]?.quantity && <p className="text-red-500 text-xs mt-1">{errors.lines[i].quantity.message}</p>}
                      </div>
                      <TextField
                        label="Unit Price"
                        type="number" step="0.01" inputMode="decimal"
                        error={errors.lines?.[i]?.unit_price?.message}
                        {...reg(`lines.${i}.unit_price`)}
                      />
                    </div>

                    {/* Free Qty + Discount */}
                    <div className="grid grid-cols-2 gap-3">
                      <TextField
                        label="Free Qty (FOC)"
                        type="number" step="1" inputMode="numeric"
                        error={errors.lines?.[i]?.free_quantity?.message}
                        {...reg(`lines.${i}.free_quantity`)}
                      />
                      <TextField
                        label="Discount %"
                        type="number" step="0.01" inputMode="decimal"
                        error={errors.lines?.[i]?.discount?.message}
                        {...reg(`lines.${i}.discount`)}
                      />
                    </div>
                  </div>

                  {/* Line total footer */}
                  <div className="flex items-center justify-between px-4 py-3 bg-primary-50 border-t border-primary-100">
                    <span className="text-xs font-semibold text-primary-600 uppercase tracking-wide">Line Total</span>
                    <span className="font-extrabold text-primary-700 font-mono text-base">{fmtCurrency(amt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Total */}
        <div className="card p-4">
          <div className="flex justify-between font-bold text-base">
            <span>Order Total</span>
            <span className="font-mono text-primary-700">{fmtCurrency(total)}</span>
          </div>
        </div>

      </form>

      {/* Sticky submit */}
      <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3">
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-base transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Creating…' : `Create Order · ${fmtCurrency(total)}`}
        </button>
      </div>
    </div>
  );
}
