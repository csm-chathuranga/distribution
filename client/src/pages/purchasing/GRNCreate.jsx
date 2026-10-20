import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateGRNMutation, useGetPOsQuery } from '../../api/purchasingApi';
import { useGetSuppliersQuery } from '../../api/suppliersApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';
import { useGetUsersForSelectQuery } from '../../api/settingsApi';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { today, fmtCurrency } from '../../utils/format';

const lineSchema = yup.object({
  product_id: yup.number().required('Product required').typeError('Select product'),
  quantity_received: yup.number().positive('Must be > 0').required('Qty required').typeError('Enter qty'),
  unit_cost: yup.number().min(0).required('Cost required').typeError('Enter cost'),
  free_issue_qty: yup.number().min(0).default(0).typeError('Enter qty'),
});

const schema = yup.object({
  supplier_id: yup.number().required('Supplier is required').typeError('Select supplier'),
  warehouse_id: yup.number().required('Warehouse is required').typeError('Select warehouse'),
  purchase_order_id: yup.number().nullable().transform((_, orig) => orig === '' || orig == null ? null : Number(orig)),
  free_sales_rep_id: yup.number().nullable().transform((_, orig) => orig === '' || orig == null ? null : Number(orig)),
  grn_date: yup.string().required('Date required'),
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
  const { data: usersData } = useGetUsersForSelectQuery('sales_rep');

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      grn_date: today(),
      free_sales_rep_id: '',
      lines: [{ product_id: '', quantity_received: 1, unit_cost: 0, free_issue_qty: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines') || [];
  const freeRepId = watch('free_sales_rep_id');

  const supplierOpts = suppliers?.data?.map(s => ({ value: s.id, label: s.name })) || [];
  const poOpts = approvedPOs?.data?.map(p => ({ value: p.id, label: `${p.po_number} — ${p.Supplier?.name}` })) || [];
  const warehouseOpts = warehouses?.data?.map(w => ({ value: w.id, label: w.name })) || [];
  const repOpts = [{ value: '', label: '— No free issue —' }, ...(usersData || []).map(u => ({ value: u.id, label: u.name }))];

  const productCostMap = {};
  const productOpts = (products?.data || []).map(p => {
    const cost = parseFloat(p.cost_price || 0);
    productCostMap[p.id] = cost > 0 ? cost : parseFloat(p.selling_price || 0);
    return { value: p.id, label: `${p.sku} — ${p.name}` };
  });

  const handleProductChange = (idx, productId) => {
    const cost = productCostMap[Number(productId)];
    if (cost !== undefined) setValue(`lines.${idx}.unit_cost`, cost);
  };

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
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 border-b pb-2">Receipt Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Supplier" required options={supplierOpts} error={errors.supplier_id?.message} {...register('supplier_id')} />
            <SelectField label="Receiving Warehouse" required options={warehouseOpts} error={errors.warehouse_id?.message} {...register('warehouse_id')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Against PO (optional)" options={[{ value: '', label: '— No PO —' }, ...poOpts]} error={errors.purchase_order_id?.message} {...register('purchase_order_id')} />
            <TextField label="Supplier Invoice No." error={errors.invoice_number?.message} {...register('invoice_number')} />
          </div>
          <TextField label="Received Date" required type="date" error={errors.grn_date?.message} {...register('grn_date')} />
          <TextareaField label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
          <SelectField
            label="Free Issue Sales Rep (optional)"
            options={repOpts}
            error={errors.free_sales_rep_id?.message}
            {...register('free_sales_rep_id')}
          />
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-semibold text-gray-700">Items Received</h2>
            <button type="button" onClick={() => append({ product_id: '', quantity_received: 1, unit_cost: 0, free_issue_qty: 0 })} className="btn-secondary text-sm flex items-center gap-1"><Plus size={14} /> Add Item</button>
          </div>
          {errors.lines?.message && <p className="text-sm text-red-600">{errors.lines.message}</p>}

          <div className="space-y-3">
            {fields.map((field, i) => {
              const amt = (Number(lines[i]?.quantity_received) || 0) * (Number(lines[i]?.unit_cost) || 0);
              return (
                <div key={field.id} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
                  {/* Product search — full width */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <label className="label">Product</label>
                      <Controller
                        control={control}
                        name={`lines.${i}.product_id`}
                        render={({ field }) => (
                          <SearchableSelect
                            value={field.value}
                            onChange={val => { field.onChange(val); handleProductChange(i, val); }}
                            options={productOpts}
                            placeholder="Search product…"
                            error={errors.lines?.[i]?.product_id?.message}
                          />
                        )}
                      />
                    </div>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(i)} className="mt-6 p-2 text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Qty / Cost / Free Qty / Amount */}
                  <div className={`grid gap-3 ${freeRepId ? 'grid-cols-4' : 'grid-cols-3'}`}>
                    <TextField label="Qty Received" type="number" step="1"
                      error={errors.lines?.[i]?.quantity_received?.message}
                      {...register(`lines.${i}.quantity_received`)} />
                    <Controller
                      control={control}
                      name={`lines.${i}.unit_cost`}
                      render={({ field: costField }) => (
                        <TextField
                          label="Unit Cost (LKR)"
                          type="number"
                          step="0.01"
                          value={costField.value ?? ''}
                          onChange={e => costField.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          onBlur={costField.onBlur}
                          error={errors.lines?.[i]?.unit_cost?.message}
                        />
                      )}
                    />
                    {freeRepId && (
                      <TextField label="Free Issue Qty" type="number" step="1" min="0" placeholder="0"
                        error={errors.lines?.[i]?.free_issue_qty?.message}
                        {...register(`lines.${i}.free_issue_qty`)} />
                    )}
                    <div>
                      <label className="label">Amount</label>
                      <div className="input bg-gray-100 font-semibold text-gray-800">{fmtCurrency(amt)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-semibold text-gray-500">Total</span>
            <span className="text-lg font-bold text-gray-900">{fmtCurrency(subtotal)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/grn')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary">{isLoading ? 'Creating...' : 'Create GRN'}</button>
        </div>
      </form>
    </div>
  );
}
