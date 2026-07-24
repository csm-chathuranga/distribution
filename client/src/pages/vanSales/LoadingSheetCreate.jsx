import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useCreateLoadingSheetMutation } from '../../api/salesApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';
import { useGetRoutesQuery } from '../../api/customersApi';
import { useGetUsersQuery } from '../../api/settingsApi';
import FormField from '../../components/ui/FormField';
import { today, fmtCurrency } from '../../utils/format';

const schema = yup.object({
  sheet_date: yup.string().required('Date is required'),
  route_id: yup.number().required('Route is required').typeError('Select a route'),
  warehouse_id: yup.number().required('Warehouse is required').typeError('Select a warehouse'),
  sales_rep_id: yup.number().required('Sales rep is required').typeError('Select a sales rep'),
  vehicle_number: yup.string().required('Vehicle number is required'),
  lines: yup.array().of(yup.object({
    product_id: yup.number().required().typeError('Select a product'),
    loaded_quantity: yup.number().positive('Must be > 0').required(),
    unit_cost: yup.number().min(0).required(),
  })).min(1, 'Add at least one product'),
});

export default function LoadingSheetCreate() {
  const navigate = useNavigate();
  const [create, { isLoading }] = useCreateLoadingSheetMutation();
  const { data: productsData } = useGetProductsQuery({ limit: 500 });
  const { data: warehousesData } = useGetWarehousesQuery({});
  const { data: routesData } = useGetRoutesQuery({});
  const { data: usersData } = useGetUsersQuery({ limit: 200 });

  const products = productsData?.data || [];
  const warehouses = warehousesData?.data || [];
  const routes = routesData?.data || [];
  const users = usersData?.data || [];

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { sheet_date: today(), lines: [{ product_id: '', loaded_quantity: 1, unit_cost: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines');

  const handleProductChange = (index, productId) => {
    const product = products.find(p => p.id === Number(productId));
    if (product) {
      setValue(`lines.${index}.unit_cost`, parseFloat(product.cost_price) || 0);
    }
  };

  const totalValue = lines.reduce((s, l) => s + (parseFloat(l.loaded_quantity) || 0) * (parseFloat(l.unit_cost) || 0), 0);

  const onSubmit = async (values) => {
    await create(values).unwrap();
    navigate('/loading-sheets');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">New Loading Sheet</h1>
        <p className="text-sm text-gray-500 mt-0.5">Load a van with stock for delivery</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Header info */}
        <div className="card">
          <div className="card-body grid grid-cols-2 gap-4">
            <FormField label="Date" error={errors.sheet_date?.message} required>
              <input type="date" {...register('sheet_date')} className="input" />
            </FormField>
            <FormField label="Vehicle Number" error={errors.vehicle_number?.message} required>
              <input {...register('vehicle_number')} className="input" placeholder="ABC-1234" />
            </FormField>
            <FormField label="Route" error={errors.route_id?.message} required>
              <select {...register('route_id')} className="input">
                <option value="">-- Select Route --</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </FormField>
            <FormField label="Warehouse" error={errors.warehouse_id?.message} required>
              <select {...register('warehouse_id')} className="input">
                <option value="">-- Select Warehouse --</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </FormField>
            <FormField label="Sales Rep" error={errors.sales_rep_id?.message} required>
              <select {...register('sales_rep_id')} className="input">
                <option value="">-- Select Sales Rep --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </FormField>
          </div>
        </div>

        {/* Products */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-800">Products to Load</h3>
            <button type="button" onClick={() => append({ product_id: '', loaded_quantity: 1, unit_cost: 0 })} className="btn btn-sm btn-secondary">
              <Plus size={14} /> Add Line
            </button>
          </div>
          <div className="card-body">
            {errors.lines && <p className="text-sm text-red-600 mb-3">{errors.lines.message}</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-th">Product</th>
                    <th className="table-th text-right">Qty</th>
                    <th className="table-th text-right">Unit Cost (LKR)</th>
                    <th className="table-th text-right">Total</th>
                    <th className="table-th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {fields.map((field, i) => {
                    const lineTotal = (parseFloat(lines[i]?.loaded_quantity) || 0) * (parseFloat(lines[i]?.unit_cost) || 0);
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
                          <input type="number" step="0.001" {...register(`lines.${i}.loaded_quantity`)} className="input-sm w-24 text-right" />
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
                    <td colSpan={3} className="table-td text-right font-semibold text-gray-700">Total Loaded Value</td>
                    <td className="table-td text-right font-bold text-primary-700 text-base">{fmtCurrency(totalValue)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/loading-sheets')} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn btn-primary">
            {isLoading ? 'Creating...' : 'Create Loading Sheet'}
          </button>
        </div>
      </form>
    </div>
  );
}
