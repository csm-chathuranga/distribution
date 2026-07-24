import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetCategoriesQuery, useCreateCategoryMutation, useUpdateCategoryMutation } from '../../api/productsApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import { TextField, SelectField } from '../../components/ui/FormField';

const schema = yup.object({
  name: yup.string().required('Category name is required').max(255),
  code: yup.string().nullable().max(50),
  parent_id: yup.number().nullable().transform(v => v === '' ? null : Number(v)),
});

function CategoryForm({ onClose, editing, categories }) {
  const [create, { isLoading: creating }] = useCreateCategoryMutation();
  const [update, { isLoading: updating }] = useUpdateCategoryMutation();
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: editing ? {
      name: editing.name || '',
      code: editing.code || '',
      parent_id: editing.parent_id || '',
    } : { name: '', code: '', parent_id: '' },
  });

  const parentOptions = categories
    .filter(c => !editing || c.id !== editing.id)
    .map(c => ({ value: c.id, label: c.name }));

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, company_id: 1 };
      if (editing) await update({ id: editing.id, ...payload }).unwrap();
      else await create(payload).unwrap();
      toast.success(editing ? 'Category updated' : 'Category created');
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <Modal open={true} onClose={onClose} title={editing ? 'Edit Category' : 'New Category'} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <TextField label="Category Name" required error={errors.name?.message} {...register('name')} />
        <TextField label="Code" error={errors.code?.message} {...register('code')} />
        <Controller
          control={control}
          name="parent_id"
          render={({ field, fieldState }) => (
            <SelectField
              label="Parent Category"
              options={parentOptions}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={creating || updating} className="btn-primary">
            {creating || updating ? 'Saving...' : editing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function CategoryList() {
  const canCreate = usePermission('inventory.create');
  const [formKey, setFormKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetCategoriesQuery({ search });

  const categories = data?.data || [];

  const openEdit = (r) => { setEditing(r); setFormKey(k => k + 1); setFormOpen(true); };
  const openNew = () => { setEditing(null); setFormKey(k => k + 1); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const columns = [
    { key: 'code', header: 'Code', cell: r => <span className="font-mono text-xs">{r.code || '-'}</span> },
    { key: 'name', header: 'Name', cell: r => <span className="font-medium">{r.name}</span> },
    { key: 'parent', header: 'Parent', cell: r => r.ParentCategory?.name || '-' },
    { key: 'products', header: 'Products', cell: r => r.Products?.length || 0, className: 'text-center' },
    {
      key: 'actions', header: '', className: 'text-right',
      cell: r => canCreate && <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Pencil size={14} /></button>,
    },
  ];

  return (
    <div className="card">
      <PageHeader title="Categories" onNew={openNew} canCreate={canCreate} search={search} onSearch={setSearch} />
      <Table columns={columns} data={categories} loading={isLoading} />
      {formOpen && <CategoryForm key={formKey} onClose={closeForm} editing={editing} categories={categories} />}
    </div>
  );
}
