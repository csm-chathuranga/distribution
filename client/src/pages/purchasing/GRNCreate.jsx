import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateGRNMutation, useGetPOsQuery } from '../../api/purchasingApi';
import { useGetSuppliersQuery } from '../../api/suppliersApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
import { today, fmtCurrency } from '../../utils/format';

const lineSchema = yup.object({
  product_id: yup.number().required('Product required').typeError('Select product'),
  quantity_received: yup.number().positive('Must be > 0').required('Qty required').typeError('Enter qty'),
  unit_cost: yup.number().min(0).required('Cost required').typeError('Enter cost'),
});

const schema = yup.object({
  supplier_id: yup.number().required('Supplier is required').typeError('Select supplier'),
  warehouse_id: yup.number().required('Warehouse is required').typeError('Select warehouse'),
  purchase_order_id: yup.number().nullable().transform(v => v === '' ? null : Number(v)),
  received_date: yup.string().required('Date required'),
  invoice_number: yup.string().nullable().max(100),
  notes: yup.string().nullable(),
  lines: yup.array().of(lineSchema).min(1, 'Add at least one item'),
});

export default function GRNCreate() {
  const navigate = useNavigate();
  const [createGRN, { isLoading }] = useCreateGRNMutation();
  const { data: suppliers } = useGetSuppliersQuery({ limit: 200 });
  const { data: approvedPOs } = useGetPOsQuery({ status: 'APPROVED', limit: 200 });
  const { data: products } = useGetProductsQuery({ limit: 500, is_active: true });
  const { data: warehouses } = useGetWarehousesQuery({});

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { received_date: today(), lines: [{ product_id: '', quantity_received: 1, unit_cost: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines') || [];

  const supplierOpts = suppliers?.data?.map(s => ({ value: s.id, label: s.name })) || [];
  const poOpts = approvedPOs?.data?.map(p => ({ value: p.id, label: `${p.po_number} — ${p.Supplier?.name}` })) || [];
  const productOpts = products?.data?.map(p => ({ value: p.id, label: `${p.sku} — ${p.name}` })) || [];
  const warehouseOpts = warehouses?.data?.map(w => ({ value: w.id, label: w.name })) || [];

  const subtotal = lines.reduce((s, l) => s + (Number(l.quantity_received) || 0) * (Number(l.unit_cost) || 0), 0);

  const onSubmit = async (data) => {
    try {
      await createGRN({ ...data, company_id: 1, branch_id: 1 }).unwrap();
      toast.success('GRN created');
      navigate('/grn');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New GRN</h1>
        <button onClick={() => navigate('/grn')} className="btn-secondary">Cancel</button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700 border-b pb-2">Receipt Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Supplier" required options={supplierOpts} error={errors.supplier_id?.message} {...register('supplier_id')} />
            <SelectField label="Receiving Warehouse" required options={warehouseOpts} error={errors.warehouse_id?.message} {...register('warehouse_id')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Against PO (optional)" options={[{ value: '', label: '— No PO —' }, ...poOpts]} error={errors.purchase_order_id?.message} {...register('purchase_order_id')} />
            <TextField label="Supplier Invoice No." error={errors.invoice_number?.message} {...register('invoice_number')} />
          </div>
          <TextField label="Received Date" required type="date" error={errors.received_date?.message} {...register('received_date')} />
          <TextareaField label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-semibold text-gray-700">Items Received</h2>
            <button type="button" onClick={() => append({ product_id: '', quantity_received: 1, unit_cost: 0 })} className="btn-secondary text-sm flex items-center gap-1"><Plus size={14} /> Add Item</button>
          </div>
          {errors.lines?.message && <p className="text-sm text-red-600">{errors.lines.message}</p>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-gray-600">Product</th>
                <th className="text-right py-2 font-medium text-gray-600 w-28">Qty Received</th>
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
                    <TextField type="number" step="1" error={errors.lines?.[i]?.quantity_received?.message} {...register(`lines.${i}.quantity_received`)} />
                  </td>
                  <td className="py-2 px-2">
                    <TextField type="number" step="0.01" error={errors.lines?.[i]?.unit_cost?.message} {...register(`lines.${i}.unit_cost`)} />
                  </td>
                  <td className="py-2 pl-2 text-right font-medium">
                    {fmtCurrency((Number(lines[i]?.quantity_received) || 0) * (Number(lines[i]?.unit_cost) || 0))}
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

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/grn')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary">{isLoading ? 'Creating...' : 'Create GRN'}</button>
        </div>
      </form>
    </div>
  );
}
