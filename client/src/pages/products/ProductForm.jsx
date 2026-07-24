import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
import { useCreateProductMutation, useUpdateProductMutation, useGetCategoriesQuery } from '../../api/productsApi';

const schema = yup.object({
  sku: yup.string().required('SKU is required').max(100, 'Max 100 chars'),
  name: yup.string().required('Product name is required').max(255),
  category_id: yup.number().nullable().transform(v => v === '' ? null : Number(v)),
  base_unit_id: yup.number().nullable().transform(v => v === '' ? null : Number(v)),
  barcode: yup.string().nullable().max(100),
  cost_price: yup.number().min(0, 'Must be ≥ 0').required('Cost price is required').typeError('Enter a number'),
  selling_price: yup.number().min(0).required('Selling price is required').typeError('Enter a number'),
  wholesale_price: yup.number().min(0).nullable().typeError('Enter a number'),
  vat_rate: yup.number().min(0).max(100).typeError('Enter percentage').default(0),
  reorder_point: yup.number().integer().min(0).typeError('Enter a number').default(0),
  description: yup.string().nullable().max(1000),
});

const UNIT_OPTIONS = [
  { value: 1, label: 'Piece (Pcs)' }, { value: 2, label: 'Dozen (Doz)' },
  { value: 3, label: 'Case (Cs)' }, { value: 4, label: 'Kilogram (Kg)' },
  { value: 5, label: 'Litre (Ltr)' }, { value: 6, label: 'Packet (Pkt)' },
  { value: 7, label: 'Bottle (Btl)' }, { value: 8, label: 'Box' },
];

export default function ProductForm({ onClose, editing, companyId }) {
  const { data: cats } = useGetCategoriesQuery({});
  const [create, { isLoading: creating }] = useCreateProductMutation();
  const [update, { isLoading: updating }] = useUpdateProductMutation();

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: editing ? {
      sku: editing.sku || '',
      name: editing.name || '',
      barcode: editing.barcode || '',
      category_id: editing.category_id || '',
      base_unit_id: editing.base_unit_id || '',
      cost_price: editing.cost_price ?? 0,
      selling_price: editing.selling_price ?? 0,
      wholesale_price: editing.wholesale_price ?? '',
      vat_rate: editing.vat_rate ?? 0,
      reorder_point: editing.reorder_point ?? 0,
      description: editing.description || '',
    } : { vat_rate: 0, reorder_point: 0, cost_price: 0, selling_price: 0 },
  });

  const onSubmit = async (data) => {
    try {
      if (editing) await update({ id: editing.id, ...data, company_id: companyId }).unwrap();
      else await create({ ...data, company_id: companyId }).unwrap();
      toast.success(editing ? 'Product updated' : 'Product created');
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed to save'); }
  };

  const loading = creating || updating;
  const catOptions = cats?.data?.map(c => ({ value: c.id, label: c.name })) || [];

  return (
    <Modal open={true} onClose={onClose} title={editing ? 'Edit Product' : 'New Product'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="SKU" required placeholder="e.g. PROD-001" error={errors.sku?.message} {...register('sku')} />
          <TextField label="Barcode" placeholder="Scan or type" error={errors.barcode?.message} {...register('barcode')} />
        </div>

        <TextField label="Product Name" required placeholder="Product name" error={errors.name?.message} {...register('name')} />

        <div className="grid grid-cols-2 gap-4">
          <Controller
            control={control}
            name="category_id"
            render={({ field, fieldState }) => (
              <SelectField
                label="Category"
                options={catOptions}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="base_unit_id"
            render={({ field, fieldState }) => (
              <SelectField
                label="Unit of Measure"
                options={UNIT_OPTIONS}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <TextField label="Cost Price (LKR)" required type="number" step="0.01" error={errors.cost_price?.message} {...register('cost_price')} />
          <TextField label="Selling Price (LKR)" required type="number" step="0.01" error={errors.selling_price?.message} {...register('selling_price')} />
          <TextField label="Wholesale Price (LKR)" type="number" step="0.01" error={errors.wholesale_price?.message} {...register('wholesale_price')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TextField label="VAT Rate (%)" type="number" step="0.01" hint="e.g. 18 for 18%" error={errors.vat_rate?.message} {...register('vat_rate')} />
          <TextField label="Reorder Point" type="number" hint="Min stock before alert" error={errors.reorder_point?.message} {...register('reorder_point')} />
        </div>

        <TextareaField label="Description" rows={2} error={errors.description?.message} {...register('description')} />

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : editing ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
