import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Pencil, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetRoutesQuery, useCreateRouteMutation, useUpdateRouteMutation } from '../../api/customersApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { TextField, TextareaField } from '../../components/ui/FormField';

const schema = yup.object({
  name: yup.string().required('Route name is required').max(255),
  code: yup.string().nullable().max(50),
  area: yup.string().nullable().max(100),
  description: yup.string().nullable(),
});

function RouteForm({ onClose, editing }) {
  const [create, { isLoading: c }] = useCreateRouteMutation();
  const [update, { isLoading: u }] = useUpdateRouteMutation();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: editing ? {
      name: editing.name || '',
      code: editing.code || '',
      area: editing.area || '',
      description: editing.description || '',
    } : {},
  });

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, company_id: 1 };
      if (editing) await update({ id: editing.id, ...payload }).unwrap();
      else await create(payload).unwrap();
      toast.success(editing ? 'Route updated' : 'Route created');
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <Modal open={true} onClose={onClose} title={editing ? 'Edit Route' : 'New Route'} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <TextField label="Route Name" required error={errors.name?.message} {...register('name')} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Code" error={errors.code?.message} {...register('code')} />
          <TextField label="Area / District" error={errors.area?.message} {...register('area')} />
        </div>
        <TextareaField label="Description" rows={2} error={errors.description?.message} {...register('description')} />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={c || u} className="btn-primary">{c || u ? 'Saving...' : editing ? 'Update Route' : 'Create Route'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function RouteList() {
  const canCreate = usePermission('sales.create');
  const [formKey, setFormKey] = useState(0);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data, isLoading } = useGetRoutesQuery({ search });

  const openEdit = (r) => { setEditing(r); setFormKey(k => k + 1); setFormOpen(true); };
  const openNew = () => { setEditing(null); setFormKey(k => k + 1); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const columns = [
    { key: 'code', header: 'Code', cell: r => <span className="font-mono text-xs">{r.code || '-'}</span> },
    { key: 'name', header: 'Route', cell: r => <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /><span className="font-medium">{r.name}</span></div> },
    { key: 'area', header: 'Area / District', cell: r => r.area || '-' },
    { key: 'customers', header: 'Customers', cell: r => r.Customers?.length || 0, className: 'text-center' },
    { key: 'actions', header: '', className: 'text-right', cell: r => canCreate && (
      <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Pencil size={14} /></button>
    )},
  ];

  return (
    <div className="card">
      <PageHeader title="Sales Routes" onNew={openNew} canCreate={canCreate} search={search} onSearch={setSearch} />
      <Table columns={columns} data={data?.data} loading={isLoading} />
      {formOpen && <RouteForm key={formKey} onClose={closeForm} editing={editing} />}
    </div>
  );
}
