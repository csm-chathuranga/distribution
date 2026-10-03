import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { useCreateCustomerReturnMutation } from '../../api/salesApi';
import { useGetCustomersQuery } from '../../api/customersApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';
import { useGetInvoicesQuery } from '../../api/salesApi';
import { selectCurrentUser } from '../../store/authSlice';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
import { today } from '../../utils/format';

const lineSchema = yup.object({
  product_id: yup.number().required('Required').typeError('Select product'),
  quantity:   yup.number().positive('Must be > 0').required('Required').typeError('Enter qty'),
  unit_price: yup.number().min(0).required('Required').typeError('Enter price'),
  reason:     yup.string().nullable(),
});

const schema = yup.object({
  customer_id:  yup.number().required('Customer required').typeError('Select customer'),
  warehouse_id: yup.number().required('Warehouse required').typeError('Select warehouse'),
  invoice_id:   yup.number().nullable().transform(v => v === '' ? null : Number(v)),
  return_date:  yup.string().required('Date required'),
  notes:        yup.string().nullable(),
  lines:        yup.array().of(lineSchema).min(1, 'Add at least one item'),
});

const BLANK_LINE = { product_id: '', quantity: 1, unit_price: 0, reason: '' };

export default function CustomerReturnCreate() {
  const navigate    = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const [create, { isLoading }] = useCreateCustomerReturnMutation();

  const { data: customers }  = useGetCustomersQuery({ limit: 500 });
  const { data: warehouses } = useGetWarehousesQuery({});
  const { data: products }   = useGetProductsQuery({ limit: 500, is_active: true });
  const { data: invoices }   = useGetInvoicesQuery({ status: 'POSTED', limit: 300 });

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      return_date:  today(),
      sales_rep_id: currentUser?.id || '',
      lines: [{ ...BLANK_LINE }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const customerOpts  = customers?.data?.map(c => ({ value: c.id, label: c.name })) || [];
  const warehouseOpts = warehouses?.data?.map(w => ({ value: w.id, label: w.name })) || [];
  const productOpts   = products?.data?.map(p => ({ value: p.id, label: `${p.sku} — ${p.name}` })) || [];
  const invoiceOpts   = [
    { value: '', label: '— No linked invoice —' },
    ...(invoices?.data?.map(inv => ({ value: inv.id, label: `${inv.invoice_number} — ${inv.Customer?.name || ''}` })) || []),
  ];

  const handleProductChange = (index, productId) => {
    const product = products?.data?.find(p => String(p.id) === String(productId));
    if (product) setValue(`lines.${index}.unit_price`, product.selling_price || 0);
  };

  const onSubmit = async (data) => {
    try {
      const ret = await create({
        ...data,
        sales_rep_id: currentUser?.id,
        lines: data.lines,
      }).unwrap();
      if (ret.__queued) {
        toast.success('Return note saved offline — will sync when connected');
        navigate('/customer-returns');
        return;
      }
      toast.success('Return note created');
      navigate(`/customer-returns/${ret.id}`);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-28">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/customer-returns')} className="p-2 text-gray-500 hover:text-gray-900">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">New Return Note</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Return Details</h2>

          <SelectField label="Customer" required options={customerOpts} error={errors.customer_id?.message} {...register('customer_id')} />
          <SelectField label="Warehouse" required options={warehouseOpts} error={errors.warehouse_id?.message} {...register('warehouse_id')} />
          <SelectField label="Linked Invoice (optional)" options={invoiceOpts} error={errors.invoice_id?.message} {...register('invoice_id')} />
          <TextField label="Return Date" required type="date" error={errors.return_date?.message} {...register('return_date')} />
          <TextareaField label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
        </div>

        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Returned Items</h2>
            <button type="button" onClick={() => append({ ...BLANK_LINE })}
              className="flex items-center gap-1 text-sm text-primary-600 font-semibold hover:text-primary-800">
              <Plus size={16} /> Add item
            </button>
          </div>

          {errors.lines?.message && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{errors.lines.message}</p>
          )}

          <div className="space-y-3">
            {fields.map((field, i) => (
              <div key={field.id} className="bg-gray-50 rounded-xl p-3 space-y-2.5 border border-gray-200">
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
                    <button type="button" onClick={() => remove(i)}
                      className="p-2 text-red-400 hover:text-red-600 mt-1 flex-shrink-0">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <TextField label="Qty Returned" type="number" step="1" inputMode="numeric"
                    error={errors.lines?.[i]?.quantity?.message} {...register(`lines.${i}.quantity`)} />
                  <TextField label="Unit Price" type="number" step="0.01" inputMode="decimal"
                    error={errors.lines?.[i]?.unit_price?.message} {...register(`lines.${i}.unit_price`)} />
                </div>

                <TextField label="Reason (damaged / wrong item / etc.)"
                  error={errors.lines?.[i]?.reason?.message} {...register(`lines.${i}.reason`)} />
              </div>
            ))}
          </div>
        </div>
      </form>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3 pb-safe">
        <button type="button" onClick={handleSubmit(onSubmit)} disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-base transition-colors disabled:opacity-50">
          {isLoading ? 'Creating…' : 'Create Return Note'}
        </button>
      </div>
    </div>
  );
}
