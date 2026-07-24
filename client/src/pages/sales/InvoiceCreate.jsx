import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Plus, Trash2, MapPin, MapPinOff, Loader, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateInvoiceMutation } from '../../api/salesApi';
import { useGetCustomersQuery } from '../../api/customersApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
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
  const [createInvoice, { isLoading }] = useCreateInvoiceMutation();
  const [location,  setLocation]  = useState(null);
  const [locStatus, setLocStatus] = useState('fetching');

  useEffect(() => {
    getLocation()
      .then(loc => { setLocation(loc); setLocStatus('ok'); })
      .catch(() => setLocStatus('denied'));
  }, []);

  const { data: customers }  = useGetCustomersQuery({ limit: 500 });
  const { data: products }   = useGetProductsQuery({ limit: 500, is_active: true });
  const { data: warehouses } = useGetWarehousesQuery({});

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { invoice_date: today(), lines: [{ ...BLANK_LINE }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines') || [];

  const customerOpts  = customers?.data?.map(c => ({ value: c.id, label: c.name })) || [];
  const productOpts   = products?.data?.map(p => ({ value: p.id, label: `${p.sku} — ${p.name}` })) || [];
  const warehouseOpts = warehouses?.data?.map(w => ({ value: w.id, label: w.name })) || [];
  const productMap    = {};
  products?.data?.forEach(p => { productMap[p.id] = p; });

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
      await createInvoice({
        ...data, company_id: 1, branch_id: 1,
        latitude:  location?.latitude  ?? null,
        longitude: location?.longitude ?? null,
      }).unwrap();
      toast.success('Invoice created');
      navigate('/invoices');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices')} className="p-2 text-gray-500 hover:text-gray-900 active:opacity-70">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">New Invoice</h1>
        </div>
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

          <SelectField
            label="Customer" required
            options={customerOpts}
            error={errors.customer_id?.message}
            {...register('customer_id')}
          />
          <SelectField
            label="Dispatch Warehouse" required
            options={warehouseOpts}
            error={errors.warehouse_id?.message}
            {...register('warehouse_id')}
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Invoice Date" required type="date" error={errors.invoice_date?.message} {...register('invoice_date')} />
            <TextField label="Due Date" type="date" error={errors.due_date?.message} {...register('due_date')} />
          </div>

          <TextField label="Payment Terms" placeholder="e.g. Net 30" error={errors.payment_terms?.message} {...register('payment_terms')} />
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
            {fields.map((field, i) => (
              <div key={field.id} className="bg-gray-50 rounded-xl p-3 space-y-2.5 border border-gray-200">
                {/* Product + remove */}
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <SelectField
                      options={productOpts}
                      error={errors.lines?.[i]?.product_id?.message}
                      {...register(`lines.${i}.product_id`, {
                        onChange: e => handleProductChange(i, e.target.value),
                      })}
                    />
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="p-2 text-red-400 hover:text-red-600 mt-1 flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Qty + Price */}
                <div className="grid grid-cols-2 gap-2">
                  <TextField
                    label="Qty"
                    type="number" step="1" inputMode="numeric"
                    error={errors.lines?.[i]?.quantity?.message}
                    {...register(`lines.${i}.quantity`)}
                  />
                  <TextField
                    label="Unit Price"
                    type="number" step="0.01" inputMode="decimal"
                    error={errors.lines?.[i]?.unit_price?.message}
                    {...register(`lines.${i}.unit_price`)}
                  />
                </div>

                {/* VAT + Discount */}
                <div className="grid grid-cols-2 gap-2">
                  <TextField
                    label="VAT %"
                    type="number" step="0.01" inputMode="decimal"
                    error={errors.lines?.[i]?.vat_rate?.message}
                    {...register(`lines.${i}.vat_rate`)}
                  />
                  <TextField
                    label="Discount (LKR)"
                    type="number" step="0.01" inputMode="decimal"
                    error={errors.lines?.[i]?.discount_amount?.message}
                    {...register(`lines.${i}.discount_amount`)}
                  />
                </div>

                {/* Line total */}
                <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Line Total</span>
                  <span className="font-bold text-gray-900 font-mono">
                    {fmtCurrency(lineTotal(lines[i] || {}))}
                  </span>
                </div>
              </div>
            ))}
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

      {/* Sticky submit bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3 pb-safe">
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-base transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Creating…' : `Create Invoice · ${fmtCurrency(grandTotal)}`}
        </button>
      </div>
    </div>
  );
}
