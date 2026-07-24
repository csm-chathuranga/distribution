import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateStockTransferMutation } from '../../api/inventoryApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
import { today } from '../../utils/format';

const lineSchema = yup.object({
  product_id: yup.number().required('Required').typeError('Select product'),
  requested_quantity: yup.number().positive('Must be > 0').required('Required').typeError('Enter qty'),
});

const schema = yup.object({
  from_warehouse_id: yup.number().required('Source warehouse required').typeError('Select warehouse'),
  to_warehouse_id: yup.number().required('Destination warehouse required').typeError('Select warehouse')
    .test('different', 'Source and destination must differ', function (val) {
      return val !== this.parent.from_warehouse_id;
    }),
  transfer_date: yup.string().required('Date required'),
  notes: yup.string().nullable(),
  lines: yup.array().of(lineSchema).min(1, 'Add at least one item'),
});

export default function StockTransferCreate() {
  const navigate = useNavigate();
  const [create, { isLoading }] = useCreateStockTransferMutation();
  const { data: warehouses } = useGetWarehousesQuery({});
  const { data: products } = useGetProductsQuery({ limit: 500, is_active: true });

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      transfer_date: today(),
      lines: [{ product_id: '', requested_quantity: 1 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const warehouseOpts = warehouses?.data?.map(w => ({ value: w.id, label: w.name })) || [];
  const productOpts = products?.data?.map(p => ({ value: p.id, label: `${p.sku} — ${p.name}` })) || [];

  const onSubmit = async (data) => {
    try {
      await create(data).unwrap();
      toast.success('Stock transfer created');
      navigate('/stock-transfers');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Stock Transfer</h1>
        <button onClick={() => navigate('/stock-transfers')} className="btn btn-ghost">Cancel</button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 border-b pb-2">Transfer Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="From Warehouse" required options={warehouseOpts} error={errors.from_warehouse_id?.message} {...register('from_warehouse_id')} />
            <SelectField label="To Warehouse" required options={warehouseOpts} error={errors.to_warehouse_id?.message} {...register('to_warehouse_id')} />
          </div>
          <TextField label="Transfer Date" required type="date" error={errors.transfer_date?.message} {...register('transfer_date')} />
          <TextareaField label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-semibold text-gray-700">Items to Transfer</h2>
            <button type="button" onClick={() => append({ product_id: '', requested_quantity: 1 })} className="btn btn-ghost btn-sm gap-1"><Plus size={14} /> Add Item</button>
          </div>
          {errors.lines?.message && <p className="text-sm text-red-600">{errors.lines.message}</p>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-gray-600">Product</th>
                <th className="text-right py-2 font-medium text-gray-600 w-36">Quantity</th>
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
                    <TextField type="number" step="0.01" error={errors.lines?.[i]?.requested_quantity?.message} {...register(`lines.${i}.requested_quantity`)} />
                  </td>
                  <td className="py-2 pl-2">
                    {fields.length > 1 && <button type="button" onClick={() => remove(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/stock-transfers')} className="btn btn-ghost">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn btn-primary">{isLoading ? 'Creating…' : 'Create Transfer'}</button>
        </div>
      </form>
    </div>
  );
}
