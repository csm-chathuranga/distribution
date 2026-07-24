import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateStockAdjustmentMutation } from '../../api/inventoryApi';
import { useGetWarehousesQuery, useGetWarehouseStockQuery } from '../../api/warehousesApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
import { today } from '../../utils/format';

const lineSchema = yup.object({
  product_id: yup.number().required('Required').typeError('Select product'),
  system_quantity: yup.number().min(0).required('Required').typeError('Enter system qty'),
  actual_quantity: yup.number().min(0).required('Required').typeError('Enter actual qty'),
  unit_cost: yup.number().min(0).required('Required').typeError('Enter cost'),
});

const schema = yup.object({
  warehouse_id: yup.number().required('Warehouse required').typeError('Select warehouse'),
  adjustment_date: yup.string().required('Date required'),
  reason: yup.string().required('Reason required'),
  notes: yup.string().nullable(),
  lines: yup.array().of(lineSchema).min(1, 'Add at least one item'),
});

const REASONS = [
  { value: 'COUNT', label: 'Stock Count' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'EXPIRY', label: 'Expiry' },
  { value: 'OTHER', label: 'Other' },
];

export default function StockAdjustmentCreate() {
  const navigate = useNavigate();
  const [create, { isLoading }] = useCreateStockAdjustmentMutation();
  const { data: warehouses } = useGetWarehousesQuery({});
  const { data: products } = useGetProductsQuery({ limit: 500, is_active: true });

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      adjustment_date: today(),
      reason: 'COUNT',
      lines: [{ product_id: '', system_quantity: 0, actual_quantity: 0, unit_cost: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines') || [];

  const warehouseId = watch('warehouse_id');
  const { data: warehouseStock } = useGetWarehouseStockQuery(warehouseId, { skip: !warehouseId });

  const warehouseOpts = warehouses?.data?.map(w => ({ value: w.id, label: w.name })) || [];
  const productOpts = products?.data?.map(p => ({ value: p.id, label: `${p.sku} — ${p.name}` })) || [];

  const onSubmit = async (data) => {
    try {
      await create(data).unwrap();
      toast.success('Stock adjustment created');
      navigate('/stock-adjustments');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Stock Adjustment</h1>
        <button onClick={() => navigate('/stock-adjustments')} className="btn btn-ghost">Cancel</button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 border-b pb-2">Adjustment Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Warehouse" required options={warehouseOpts} error={errors.warehouse_id?.message} {...register('warehouse_id')} />
            <TextField label="Adjustment Date" required type="date" error={errors.adjustment_date?.message} {...register('adjustment_date')} />
          </div>
          <SelectField label="Reason" required options={REASONS} error={errors.reason?.message} {...register('reason')} />
          <TextareaField label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-semibold text-gray-700">Items</h2>
            <button type="button" onClick={() => append({ product_id: '', system_quantity: 0, actual_quantity: 0, unit_cost: 0 })} className="btn btn-ghost btn-sm gap-1"><Plus size={14} /> Add Item</button>
          </div>
          {errors.lines?.message && <p className="text-sm text-red-600">{errors.lines.message}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-600">Product</th>
                  <th className="text-right py-2 font-medium text-gray-600 w-28">System Qty</th>
                  <th className="text-right py-2 font-medium text-gray-600 w-28">Actual Qty</th>
                  <th className="text-right py-2 font-medium text-gray-600 w-24">Variance</th>
                  <th className="text-right py-2 font-medium text-gray-600 w-32">Unit Cost</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fields.map((field, i) => {
                  const variance = (Number(lines[i]?.actual_quantity) || 0) - (Number(lines[i]?.system_quantity) || 0);
                  return (
                    <tr key={field.id}>
                      <td className="py-2 pr-2">
                        <SelectField options={productOpts} error={errors.lines?.[i]?.product_id?.message} {...register(`lines.${i}.product_id`)} />
                      </td>
                      <td className="py-2 px-2">
                        <TextField type="number" step="0.01" error={errors.lines?.[i]?.system_quantity?.message} {...register(`lines.${i}.system_quantity`)} />
                      </td>
                      <td className="py-2 px-2">
                        <TextField type="number" step="0.01" error={errors.lines?.[i]?.actual_quantity?.message} {...register(`lines.${i}.actual_quantity`)} />
                      </td>
                      <td className="py-2 px-2 text-right font-medium">
                        <span className={variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : 'text-gray-400'}>
                          {variance > 0 ? '+' : ''}{variance.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <TextField type="number" step="0.01" error={errors.lines?.[i]?.unit_cost?.message} {...register(`lines.${i}.unit_cost`)} />
                      </td>
                      <td className="py-2 pl-2">
                        {fields.length > 1 && <button type="button" onClick={() => remove(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/stock-adjustments')} className="btn btn-ghost">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn btn-primary">{isLoading ? 'Creating…' : 'Create Adjustment'}</button>
        </div>
      </form>
    </div>
  );
}
