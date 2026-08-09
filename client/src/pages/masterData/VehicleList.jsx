import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Pencil, Car } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetVehiclesQuery, useCreateVehicleMutation, useUpdateVehicleMutation } from '../../api/vehiclesApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';

const STATUS_OPTS = [
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Under Maintenance' },
  { value: 'retired', label: 'Retired' },
];

const schema = yup.object({
  registration_number: yup.string().required('Registration number is required').max(20),
  make:         yup.string().nullable().max(100),
  model:        yup.string().nullable().max(100),
  year:         yup.number().nullable().integer().min(1900).max(2100).typeError('Enter a valid year'),
  capacity_kg:  yup.number().nullable().min(0).typeError('Enter a valid capacity'),
  status:       yup.string().oneOf(['active', 'maintenance', 'retired']),
  notes:        yup.string().nullable(),
});

function VehicleForm({ onClose, editing }) {
  const [create, { isLoading: c }] = useCreateVehicleMutation();
  const [update, { isLoading: u }] = useUpdateVehicleMutation();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: editing ? {
      registration_number: editing.registration_number || '',
      make:        editing.make || '',
      model:       editing.model || '',
      year:        editing.year || '',
      capacity_kg: editing.capacity_kg || '',
      status:      editing.status || 'active',
      notes:       editing.notes || '',
    } : { status: 'active' },
  });

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, company_id: 1 };
      if (editing) await update({ id: editing.id, ...payload }).unwrap();
      else await create(payload).unwrap();
      toast.success(editing ? 'Vehicle updated' : 'Vehicle added');
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <Modal open={true} onClose={onClose} title={editing ? 'Edit Vehicle' : 'New Vehicle'} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <TextField label="Registration Number" required error={errors.registration_number?.message} {...register('registration_number')} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Make" placeholder="e.g. Toyota" error={errors.make?.message} {...register('make')} />
          <TextField label="Model" placeholder="e.g. Dyna" error={errors.model?.message} {...register('model')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Year" type="number" placeholder="e.g. 2020" error={errors.year?.message} {...register('year')} />
          <TextField label="Capacity (kg)" type="number" step="0.01" error={errors.capacity_kg?.message} {...register('capacity_kg')} />
        </div>
        <SelectField label="Status" options={STATUS_OPTS} error={errors.status?.message} {...register('status')} />
        <TextareaField label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={c || u} className="btn-primary">
            {c || u ? 'Saving...' : editing ? 'Update Vehicle' : 'Add Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const STATUS_BADGE = {
  active:      'bg-green-100 text-green-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  retired:     'bg-gray-100 text-gray-500',
};

export default function VehicleList() {
  const canManage = usePermission('settings.company');
  const [formKey, setFormKey] = useState(0);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data, isLoading } = useGetVehiclesQuery({ search });

  const openEdit = (v) => { setEditing(v); setFormKey(k => k + 1); setFormOpen(true); };
  const openNew  = () => { setEditing(null); setFormKey(k => k + 1); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const columns = [
    { key: 'reg',    header: 'Registration', cell: v => (
      <div className="flex items-center gap-2">
        <Car size={14} className="text-gray-400" />
        <span className="font-mono font-medium">{v.registration_number}</span>
      </div>
    )},
    { key: 'make',   header: 'Make / Model', cell: v => [v.make, v.model].filter(Boolean).join(' ') || '-' },
    { key: 'year',   header: 'Year',         cell: v => v.year || '-', className: 'text-center' },
    { key: 'cap',    header: 'Capacity (kg)', cell: v => v.capacity_kg ? Number(v.capacity_kg).toLocaleString() : '-', className: 'text-right' },
    { key: 'status', header: 'Status',        cell: v => (
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[v.status] || ''}`}>
        {v.status}
      </span>
    )},
    { key: 'actions', header: '', className: 'text-right', cell: v => canManage && (
      <button onClick={() => openEdit(v)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
        <Pencil size={14} />
      </button>
    )},
  ];

  return (
    <div className="card">
      <PageHeader title="Vehicles" onNew={openNew} canCreate={canManage} search={search} onSearch={setSearch} />
      <Table columns={columns} data={data?.data} loading={isLoading} />
      {formOpen && <VehicleForm key={formKey} onClose={closeForm} editing={editing} />}
    </div>
  );
}
