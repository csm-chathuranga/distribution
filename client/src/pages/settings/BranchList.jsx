import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetBranchesQuery, useCreateBranchMutation, useUpdateBranchMutation } from '../../api/settingsApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { TextField, TextareaField } from '../../components/ui/FormField';
import StatusBadge from '../../components/ui/StatusBadge';

const schema = yup.object({
  name: yup.string().required('Branch name is required').max(255),
  code: yup.string().required('Code is required').max(20),
  address: yup.string().nullable(),
  phone: yup.string().nullable().max(20),
  email: yup.string().email('Invalid email').nullable(),
});

function BranchForm({ onClose, editing }) {
  const [create, { isLoading: c }] = useCreateBranchMutation();
  const [update, { isLoading: u }] = useUpdateBranchMutation();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: editing ? {
      name: editing.name || '',
      code: editing.code || '',
      address: editing.address || '',
      phone: editing.phone || '',
      email: editing.email || '',
    } : {},
  });

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, company_id: 1 };
      if (editing) await update({ id: editing.id, ...payload }).unwrap();
      else await create(payload).unwrap();
      toast.success(editing ? 'Branch updated' : 'Branch created');
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <Modal open={true} onClose={onClose} title={editing ? 'Edit Branch' : 'New Branch'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Branch Name" required error={errors.name?.message} {...register('name')} />
          <TextField label="Code" required error={errors.code?.message} {...register('code')} />
        </div>
        <TextareaField label="Address" rows={2} error={errors.address?.message} {...register('address')} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Phone" type="tel" error={errors.phone?.message} {...register('phone')} />
          <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={c || u} className="btn-primary">{c || u ? 'Saving...' : editing ? 'Update Branch' : 'Create Branch'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function BranchList() {
  const canCreate = usePermission('settings.company');
  const [formKey, setFormKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data, isLoading } = useGetBranchesQuery({});

  const openEdit = (r) => { setEditing(r); setFormKey(k => k + 1); setFormOpen(true); };
  const openNew = () => { setEditing(null); setFormKey(k => k + 1); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const columns = [
    { key: 'code', header: 'Code', cell: r => <span className="font-mono text-sm font-medium">{r.code}</span> },
    { key: 'name', header: 'Branch Name', cell: r => <span className="font-medium">{r.name}</span> },
    { key: 'phone', header: 'Phone', cell: r => r.phone || '-' },
    { key: 'email', header: 'Email', cell: r => r.email || '-' },
    { key: 'status', header: 'Status', cell: r => <StatusBadge status={r.is_active} /> },
    { key: 'actions', header: '', className: 'text-right', cell: r => canCreate && (
      <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Pencil size={14} /></button>
    )},
  ];

  return (
    <div className="card">
      <PageHeader title="Branches" onNew={openNew} canCreate={canCreate} />
      <Table columns={columns} data={data?.data} loading={isLoading} />
      {formOpen && <BranchForm key={formKey} onClose={closeForm} editing={editing} />}
    </div>
  );
}
