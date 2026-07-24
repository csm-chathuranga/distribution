import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreatePOMutation } from '../../api/purchasingApi';
import { useGetSuppliersQuery } from '../../api/suppliersApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
import { today, fmtCurrency } from '../../utils/format';

const lineSchema = yup.object({
  product_id: yup.number().required('Product required').typeError('Select product'),
  quantity: yup.number().positive('Must be > 0').required('Quantity required').typeError('Enter qty'),
  unit_cost: yup.number().min(0).required('Cost required').typeError('Enter cost'),
  notes: yup.string().nullable(),
});

const schema = yup.object({
  supplier_id: yup.number().required('Supplier is required').typeError('Select supplier'),
  warehouse_id: yup.number().required('Warehouse is required').typeError('Select warehouse'),
  order_date: yup.string().required('Date required'),
  expected_date: yup.string().nullable(),
  notes: yup.string().nullable(),
  lines: yup.array().of(lineSchema).min(1, 'Add at least one item'),
});

export default function PurchaseOrderCreate() {
  const navigate = useNavigate();
  const [createPO, { isLoading }] = useCreatePOMutation();
  const { data: suppliers } = useGetSuppliersQuery({ limit: 200 });
  const { data: products } = useGetProductsQuery({ limit: 500, is_active: true });
  const { data: warehouses } = useGetWarehousesQuery({});

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { order_date: today(), lines: [{ product_id: '', quantity: 1, unit_cost: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines') || [];

  const supplierOpts = suppliers?.data?.map(s => ({ value: s.id, label: s.name })) || [];
  const productOpts = products?.data?.map(p => ({ value: p.id, label: `${p.sku} — ${p.name}` })) || [];
  const warehouseOpts = warehouses?.data?.map(w => ({ value: w.id, label: w.name })) || [];

  const subtotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0);

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        company_id: 1,
        branch_id: 1,
        lines: data.lines.map(l => ({ ...l, product_id: Number(l.product_id) })),
      };
      await createPO(payload).unwrap();
      toast.success('Purchase order created');
      navigate('/purchase-orders');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Purchase Order</h1>
        <button onClick={() => navigate('/purchase-orders')} className="btn-secondary">Cancel</button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700 border-b pb-2">Order Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Supplier" required options={supplierOpts} error={errors.supplier_id?.message} {...register('supplier_id')} />
            <SelectField label="Receiving Warehouse" required options={warehouseOpts} error={errors.warehouse_id?.message} {...register('warehouse_id')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Order Date" required type="date" error={errors.order_date?.message} {...register('order_date')} />
            <TextField label="Expected Delivery" type="date" error={errors.expected_date?.message} {...register('expected_date')} />
          </div>
          <TextareaField label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-semibold text-gray-700">Order Lines</h2>
            <button type="button" onClick={() => append({ product_id: '', quantity: 1, unit_cost: 0 })} className="btn-secondary text-sm flex items-center gap-1"><Plus size={14} /> Add Item</button>
          </div>
          {errors.lines?.message && <p className="text-sm text-red-600">{errors.lines.message}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-600">Product</th>
                  <th className="text-right py-2 font-medium text-gray-600 w-28">Qty</th>
                  <th className="text-right py-2 font-medium text-gray-600 w-36">Unit Cost (LKR)</th>
                  <th className="text-right py-2 font-medium text-gray-600 w-36">Amount</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fields.map((field, i) => (
                  <tr key={field.id}>
                    <td className="py-2 pr-2">
                      <SelectField options={productOpts} error={errors.lines?.[i]?.product_id?.message} {...register(`lines.${i}.product_id`)} />
                    </td>
                    <td className="py-2 px-2">
                      <TextField type="number" step="1" className="text-right" error={errors.lines?.[i]?.quantity?.message} {...register(`lines.${i}.quantity`)} />
                    </td>
                    <td className="py-2 px-2">
                      <TextField type="number" step="0.01" className="text-right" error={errors.lines?.[i]?.unit_cost?.message} {...register(`lines.${i}.unit_cost`)} />
                    </td>
                    <td className="py-2 pl-2 text-right font-medium">
                      {fmtCurrency((Number(lines[i]?.quantity) || 0) * (Number(lines[i]?.unit_cost) || 0))}
                    </td>
                    <td className="py-2 pl-2">
                      {fields.length > 1 && <button type="button" onClick={() => remove(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td colSpan={3} className="py-3 text-right font-semibold">Total:</td>
                  <td className="py-3 text-right font-bold text-lg">{fmtCurrency(subtotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/purchase-orders')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary">{isLoading ? 'Creating...' : 'Create Purchase Order'}</button>
        </div>
      </form>
    </div>
  );
}
