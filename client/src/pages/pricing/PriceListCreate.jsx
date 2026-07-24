import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreatePriceListMutation } from '../../api/productsApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { TextField, SelectField } from '../../components/ui/FormField';
import { fmtCurrency } from '../../utils/format';

const itemSchema = yup.object({
  product_id: yup.number().required('Required').typeError('Select product'),
  price: yup.number().positive('Must be > 0').required('Required').typeError('Enter price'),
});

const schema = yup.object({
  name: yup.string().required('Name required'),
  type: yup.string().required('Type required'),
  valid_from: yup.string().nullable(),
  valid_to: yup.string().nullable(),
  is_active: yup.boolean(),
  items: yup.array().of(itemSchema).min(1, 'Add at least one product'),
});

const TYPE_OPTS = [
  { value: 'RETAIL', label: 'Retail' },
  { value: 'WHOLESALE', label: 'Wholesale' },
  { value: 'SPECIAL', label: 'Special' },
];

export default function PriceListCreate() {
  const navigate = useNavigate();
  const [create, { isLoading }] = useCreatePriceListMutation();
  const { data: products } = useGetProductsQuery({ limit: 500, is_active: true });

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      type: 'RETAIL',
      is_active: true,
      items: [{ product_id: '', price: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items') || [];

  const productOpts = products?.data?.map(p => ({ value: p.id, label: `${p.sku} — ${p.name}`, cost: p.selling_price })) || [];

  const onSubmit = async (data) => {
    try {
      await create(data).unwrap();
      toast.success('Price list created');
      navigate('/price-lists');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Price List</h1>
        <button onClick={() => navigate('/price-lists')} className="btn btn-ghost">Cancel</button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 border-b pb-2">Price List Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Name" required error={errors.name?.message} {...register('name')} placeholder="e.g. Retail 2026" />
            <SelectField label="Type" required options={TYPE_OPTS} error={errors.type?.message} {...register('type')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Valid From" type="date" error={errors.valid_from?.message} {...register('valid_from')} />
            <TextField label="Valid To" type="date" error={errors.valid_to?.message} {...register('valid_to')} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('is_active')} className="rounded border-gray-300" />
            <span className="font-medium text-gray-700">Active</span>
          </label>
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-semibold text-gray-700">Products & Prices</h2>
            <button type="button" onClick={() => append({ product_id: '', price: 0 })} className="btn btn-ghost btn-sm gap-1"><Plus size={14} /> Add Product</button>
          </div>
          {errors.items?.message && <p className="text-sm text-red-600">{errors.items.message}</p>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-gray-600">Product</th>
                <th className="text-right py-2 font-medium text-gray-600 w-40">Price (LKR)</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fields.map((field, i) => (
                <tr key={field.id}>
                  <td className="py-2 pr-2">
                    <SelectField options={productOpts} error={errors.items?.[i]?.product_id?.message} {...register(`items.${i}.product_id`)} />
                  </td>
                  <td className="py-2 px-2">
                    <TextField type="number" step="0.01" error={errors.items?.[i]?.price?.message} {...register(`items.${i}.price`)} />
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
          <button type="button" onClick={() => navigate('/price-lists')} className="btn btn-ghost">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn btn-primary">{isLoading ? 'Creating…' : 'Create Price List'}</button>
        </div>
      </form>
    </div>
  );
}
