import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useCreateSupplierReturnMutation } from '../../api/purchasingApi';
import { useGetSuppliersQuery } from '../../api/suppliersApi';
import { useGetGRNsQuery } from '../../api/purchasingApi';
import { useGetProductsQuery } from '../../api/productsApi';
import FormField from '../../components/ui/FormField';
import { today, fmtCurrency } from '../../utils/format';

const schema = yup.object({
  supplier_id: yup.number().required('Supplier is required').typeError('Select a supplier'),
  return_date: yup.string().required('Date is required'),
  goods_received_id: yup.number().nullable().typeError(''),
  notes: yup.string().nullable(),
  lines: yup.array().of(yup.object({
    product_id: yup.number().required().typeError('Select a product'),
    quantity: yup.number().positive('Must be > 0').required(),
    unit_cost: yup.number().min(0).required(),
  })).min(1, 'Add at least one return line'),
});

export default function SupplierReturnCreate() {
  const navigate = useNavigate();
  const [create, { isLoading }] = useCreateSupplierReturnMutation();
  const { data: suppliersData } = useGetSuppliersQuery({ limit: 500 });
  const { data: grnsData } = useGetGRNsQuery({ status: 'POSTED', limit: 200 });
  const { data: productsData } = useGetProductsQuery({ limit: 500 });

  const suppliers = suppliersData?.data || [];
  const grns = grnsData?.data || [];
  const products = productsData?.data || [];

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { return_date: today(), lines: [{ product_id: '', quantity: 1, unit_cost: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines');

  const handleProductChange = (index, productId) => {
    const product = products.find(p => p.id === Number(productId));
    if (product) {
      setValue(`lines.${index}.unit_cost`, parseFloat(product.cost_price) || 0);
    }
  };

  const total = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_cost) || 0), 0);

  const onSubmit = async (values) => {
    const payload = { ...values, goods_received_id: values.goods_received_id || null };
    await create(payload).unwrap();
    navigate('/supplier-returns');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">New Supplier Return</h1>
        <p className="text-sm text-gray-500 mt-0.5">Return goods to a supplier and credit their account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="card">
          <div className="card-body grid grid-cols-2 gap-4">
            <FormField label="Supplier" error={errors.supplier_id?.message} required>
              <select {...register('supplier_id')} className="input">
                <option value="">-- Select Supplier --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormField>

            <FormField label="Return Date" error={errors.return_date?.message} required>
              <input type="date" {...register('return_date')} className="input" />
            </FormField>

            <FormField label="GRN Reference (optional)" error={errors.goods_received_id?.message}>
              <select {...register('goods_received_id')} className="input">
                <option value="">-- None --</option>
                {grns.map(g => <option key={g.id} value={g.id}>{g.grn_number}</option>)}
              </select>
            </FormField>

            <FormField label="Notes" error={errors.notes?.message}>
              <input {...register('notes')} className="input" placeholder="Reason for return..." />
            </FormField>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-800">Return Lines</h3>
            <button type="button" onClick={() => append({ product_id: '', quantity: 1, unit_cost: 0 })} className="btn btn-sm btn-secondary">
              <Plus size={14} /> Add Line
            </button>
          </div>
          <div className="card-body">
            {errors.lines && <p className="text-sm text-red-600 mb-3">{errors.lines.message}</p>}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th">Product</th>
                  <th className="table-th text-right">Qty</th>
                  <th className="table-th text-right">Unit Cost</th>
                  <th className="table-th text-right">Total</th>
                  <th className="table-th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fields.map((field, i) => {
                  const lineTotal = (parseFloat(lines[i]?.quantity) || 0) * (parseFloat(lines[i]?.unit_cost) || 0);
                  return (
                    <tr key={field.id}>
                      <td className="table-td">
                        <select
                          {...register(`lines.${i}.product_id`)}
                          className="input-sm w-52"
                          onChange={e => {
                            register(`lines.${i}.product_id`).onChange(e);
                            handleProductChange(i, e.target.value);
                          }}
                        >
                          <option value="">-- Product --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="table-td">
                        <input type="number" step="0.001" {...register(`lines.${i}.quantity`)} className="input-sm w-24 text-right" />
                      </td>
                      <td className="table-td">
                        <input type="number" step="0.01" {...register(`lines.${i}.unit_cost`)} className="input-sm w-28 text-right" />
                      </td>
                      <td className="table-td text-right font-semibold">{fmtCurrency(lineTotal)}</td>
                      <td className="table-td">
                        <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={3} className="table-td text-right font-semibold text-gray-700">Total Return Amount</td>
                  <td className="table-td text-right font-bold text-red-600 text-base">{fmtCurrency(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/supplier-returns')} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn btn-primary">
            {isLoading ? 'Saving...' : 'Create Supplier Return'}
          </button>
        </div>
      </form>
    </div>
  );
}
