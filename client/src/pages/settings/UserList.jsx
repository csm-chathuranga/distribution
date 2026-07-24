import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Pencil, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetUsersQuery, useCreateUserMutation, useUpdateUserMutation, useGetRolesQuery } from '../../api/settingsApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import { TextField, SelectField } from '../../components/ui/FormField';

const createSchema = yup.object({
  name: yup.string().required('Name is required').max(255),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(8, 'Min 8 characters').required('Password required'),
  role_id: yup.number().required('Role is required').typeError('Select role'),
});

const editSchema = yup.object({
  name: yup.string().required('Name is required').max(255),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().nullable().transform(v => v === '' ? null : v).min(8, 'Min 8 characters').optional(),
  role_id: yup.number().required('Role is required').typeError('Select role'),
});

function UserForm({ onClose, editing, roles }) {
  const [create, { isLoading: c }] = useCreateUserMutation();
  const [update, { isLoading: u }] = useUpdateUserMutation();
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(editing ? editSchema : createSchema),
    defaultValues: editing ? {
      name: editing.name || '',
      email: editing.email || '',
      role_id: editing.role_id || '',
      password: '',
    } : {},
  });
  const roleOpts = roles?.map(r => ({ value: r.id, label: r.display_name })) || [];

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, company_id: 1 };
      if (!data.password) delete payload.password;
      if (editing) await update({ id: editing.id, ...payload }).unwrap();
      else await create(payload).unwrap();
      toast.success(editing ? 'User updated' : 'User created');
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <Modal open={true} onClose={onClose} title={editing ? 'Edit User' : 'New User'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <TextField label="Full Name" required error={errors.name?.message} {...register('name')} />
        <TextField label="Email" required type="email" error={errors.email?.message} {...register('email')} />
        <TextField label={editing ? 'New Password (leave blank to keep)' : 'Password'} required={!editing} type="password" error={errors.password?.message} {...register('password')} />
        <Controller
          control={control}
          name="role_id"
          render={({ field, fieldState }) => (
            <SelectField
              label="Role"
              required
              options={roleOpts}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={c || u} className="btn-primary">{c || u ? 'Saving...' : editing ? 'Update User' : 'Create User'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function UserList() {
  const canCreate = usePermission('settings.users');
  const [formKey, setFormKey] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data, isLoading } = useGetUsersQuery({ search, page, limit: 20 });
  const { data: rolesData } = useGetRolesQuery({});
  const roles = rolesData?.data || [];

  const openEdit = (r) => { setEditing(r); setFormKey(k => k + 1); setFormOpen(true); };
  const openNew = () => { setEditing(null); setFormKey(k => k + 1); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const columns = [
    { key: 'name', header: 'Name', cell: r => <span className="font-medium">{r.name}</span> },
    { key: 'email', header: 'Email', cell: r => <span className="text-sm text-gray-600">{r.email}</span> },
    { key: 'role', header: 'Role', cell: r => <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"><Shield size={11} />{r.Role?.display_name}</span> },
    { key: 'status', header: 'Status', cell: r => <StatusBadge status={r.is_active} /> },
    { key: 'actions', header: '', className: 'text-right', cell: r => canCreate && (
      <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Pencil size={14} /></button>
    )},
  ];

  return (
    <div className="card">
      <PageHeader title="Users" onNew={openNew} canCreate={canCreate} search={search} onSearch={setSearch} />
      <Table columns={columns} data={data?.data} loading={isLoading} />
      <Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} />
      {formOpen && <UserForm key={formKey} onClose={closeForm} editing={editing} roles={roles} />}
    </div>
  );
}
