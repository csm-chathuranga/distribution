import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Pencil, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetRoutesQuery, useCreateRouteMutation, useUpdateRouteMutation } from '../../api/customersApi';
import { useGetUsersForSelectQuery } from '../../api/settingsApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { TextField, TextareaField, SelectField } from '../../components/ui/FormField';

const toNum = (val, orig) => (orig === '' || orig == null) ? null : val;

const schema = yup.object({
  name:         yup.string().required('Route name is required').max(255),
  code:         yup.string().nullable().max(50),
  area:         yup.string().nullable().max(100),
  description:  yup.string().nullable(),
  sales_rep_id: yup.number().nullable().transform(toNum),
  driver_id:    yup.number().nullable().transform(toNum),
});

function RouteForm({ onClose, editing }) {
  const [create, { isLoading: c }] = useCreateRouteMutation();
  const [update, { isLoading: u }] = useUpdateRouteMutation();
  const { data: salesReps = [] }   = useGetUsersForSelectQuery('sales_rep');
  const { data: drivers = [] }     = useGetUsersForSelectQuery('delivery');

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: editing ? {
      name:         editing.name || '',
      code:         editing.code || '',
      area:         editing.area || '',
      description:  editing.description || '',
      sales_rep_id: editing.sales_rep_id || '',
      driver_id:    editing.driver_id || '',
    } : { name: '', code: '', area: '', description: '', sales_rep_id: '', driver_id: '' },
  });

  const repOptions    = salesReps.map(u => ({ value: u.id, label: u.name }));
  const driverOptions = drivers.map(u => ({ value: u.id, label: u.name }));

  const onSubmit = async (data) => {
    try {
      if (editing) await update({ id: editing.id, ...data }).unwrap();
      else await create(data).unwrap();
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
        <Controller control={control} name="sales_rep_id" render={({ field, fieldState }) => (
          <SelectField label="Sales Rep" options={repOptions}
            value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur}
            error={fieldState.error?.message} placeholder="Select sales rep…" />
        )} />
        <Controller control={control} name="driver_id" render={({ field, fieldState }) => (
          <SelectField label="Default Driver" options={driverOptions}
            value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur}
            error={fieldState.error?.message} placeholder="Select driver…" />
        )} />
        <TextareaField label="Description" rows={2} error={errors.description?.message} {...register('description')} />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={c || u} className="btn-primary">
            {c || u ? 'Saving...' : editing ? 'Update Route' : 'Create Route'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function RouteList() {
  const canCreate  = usePermission('sales.create');
  const canViewAll = usePermission('sales.view_all');
  const [formKey,    setFormKey]    = useState(0);
  const [search,     setSearch]     = useState('');
  const [repFilter,  setRepFilter]  = useState('');
  const [formOpen,   setFormOpen]   = useState(false);
  const [editing,    setEditing]    = useState(null);
  const { data: salesReps = [] }    = useGetUsersForSelectQuery('sales_rep');
  const skipQuery = canViewAll && !repFilter && !search;
  const { data, isLoading } = useGetRoutesQuery(
    { search, ...(repFilter ? { sales_rep_id: repFilter } : {}) },
    { skip: skipQuery }
  );

  const openEdit = (r) => { setEditing(r); setFormKey(k => k + 1); setFormOpen(true); };
  const openNew  = () => { setEditing(null); setFormKey(k => k + 1); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const columns = [
    { key: 'code',  header: 'Code',   cell: r => <span className="font-mono text-xs">{r.code || '-'}</span> },
    { key: 'name',  header: 'Route',  cell: r => <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /><span className="font-medium">{r.name}</span></div> },
    { key: 'area',  header: 'Area',   cell: r => r.area || '-' },
    { key: 'rep',   header: 'Sales Rep', cell: r => r.SalesRep?.name || <span className="text-gray-300">—</span> },
    { key: 'driver',header: 'Driver', cell: r => r.Driver?.name || <span className="text-gray-300">—</span> },
    { key: 'customers', header: 'Customers', cell: r => r.Customers?.length || 0, className: 'text-center' },
    { key: 'actions', header: '', className: 'text-right', cell: r => canCreate && (
      <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
        <Pencil size={14} />
      </button>
    )},
  ];

  const repOptions = [{ value: '', label: 'All Reps' }, ...salesReps.map(u => ({ value: u.id, label: u.name }))];

  return (
    <div className="card">
      <PageHeader title="Sales Routes" onNew={openNew} canCreate={canCreate} search={search} onSearch={setSearch}>
        {canViewAll && (
          <select
            className="input text-sm w-44"
            value={repFilter}
            onChange={e => setRepFilter(e.target.value)}
          >
            <option value="">— Select Rep —</option>
            {salesReps.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
      </PageHeader>
      <Table columns={columns} data={data?.data} loading={isLoading} />
      {formOpen && <RouteForm key={formKey} onClose={closeForm} editing={editing} />}
    </div>
  );
}
