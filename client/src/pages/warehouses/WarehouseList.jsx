import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Pencil, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetWarehousesQuery, useCreateWarehouseMutation, useUpdateWarehouseMutation, useGetWarehouseStockQuery } from '../../api/warehousesApi';
import { useGetBranchesQuery } from '../../api/settingsApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
import { fmtCurrency, fmtNumber } from '../../utils/format';

const schema = yup.object({
  name: yup.string().required('Warehouse name is required').max(255),
  code: yup.string().nullable().max(50),
  branch_id: yup.number().required('Branch is required').typeError('Select a branch'),
  address: yup.string().nullable(),
});

function StockView({ warehouseId, name, onClose }) {
  const { data, isLoading } = useGetWarehouseStockQuery(warehouseId);
  const stockColumns = [
    { key: 'sku', header: 'SKU', cell: r => <span className="font-mono text-xs">{r.Product?.sku}</span> },
    { key: 'name', header: 'Product', cell: r => r.Product?.name },
    { key: 'quantity', header: 'Qty', cell: r => fmtNumber(r.quantity, 0), className: 'text-right' },
    { key: 'reserved', header: 'Reserved', cell: r => fmtNumber(r.reserved_quantity, 0), className: 'text-right' },
    { key: 'available', header: 'Available', cell: r => <span className={`font-semibold ${parseFloat(r.quantity) <= (r.Product?.reorder_point || 0) ? 'text-red-600' : 'text-green-600'}`}>{fmtNumber(parseFloat(r.quantity) - parseFloat(r.reserved_quantity), 0)}</span>, className: 'text-right' },
    { key: 'value', header: 'Value', cell: r => fmtCurrency(parseFloat(r.quantity) * (r.Product?.cost_price || 0)), className: 'text-right' },
  ];
  return (
    <Modal open={true} onClose={onClose} title={`Stock — ${name}`} size="xl">
      <Table columns={stockColumns} data={data || []} loading={isLoading} />
    </Modal>
  );
}

function WarehouseForm({ onClose, editing, branches }) {
  const [create, { isLoading: c }] = useCreateWarehouseMutation();
  const [update, { isLoading: u }] = useUpdateWarehouseMutation();
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: editing ? {
      name: editing.name || '',
      code: editing.code || '',
      branch_id: editing.branch_id || '',
      address: editing.address || '',
    } : {},
  });
  const branchOpts = branches?.map(b => ({ value: b.id, label: b.name })) || [];

  const onSubmit = async (data) => {
    try {
      if (editing) await update({ id: editing.id, ...data }).unwrap();
      else await create(data).unwrap();
      toast.success(editing ? 'Warehouse updated' : 'Warehouse created');
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <Modal open={true} onClose={onClose} title={editing ? 'Edit Warehouse' : 'New Warehouse'} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <TextField label="Warehouse Name" required error={errors.name?.message} {...register('name')} />
        <TextField label="Code" error={errors.code?.message} {...register('code')} />
        <Controller
          control={control}
          name="branch_id"
          render={({ field, fieldState }) => (
            <SelectField
              label="Branch"
              required
              options={branchOpts}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <TextareaField label="Address" rows={2} error={errors.address?.message} {...register('address')} />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={c || u} className="btn-primary">{c || u ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function WarehouseList() {
  const canCreate = usePermission('inventory.create');
  const [formKey, setFormKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [stockWh, setStockWh] = useState(null);
  const { data, isLoading } = useGetWarehousesQuery({});
  const { data: branches } = useGetBranchesQuery({});

  const openEdit = (r) => { setEditing(r); setFormKey(k => k + 1); setFormOpen(true); };
  const openNew = () => { setEditing(null); setFormKey(k => k + 1); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const columns = [
    { key: 'code', header: 'Code', cell: r => <span className="font-mono text-xs">{r.code || '-'}</span> },
    { key: 'name', header: 'Warehouse', cell: r => <span className="font-medium">{r.name}</span> },
    { key: 'branch', header: 'Branch', cell: r => r.Branch?.name },
    { key: 'actions', header: '', className: 'text-right', cell: r => (
      <div className="flex items-center justify-end gap-1">
        <button onClick={() => setStockWh(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Stock"><Package size={14} /></button>
        {canCreate && <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Pencil size={14} /></button>}
      </div>
    )},
  ];

  return (
    <div className="card">
      <PageHeader title="Warehouses" onNew={openNew} canCreate={canCreate} />
      <Table columns={columns} data={data?.data} loading={isLoading} />
      {formOpen && <WarehouseForm key={formKey} onClose={closeForm} editing={editing} branches={branches?.data || []} />}
      {stockWh && <StockView warehouseId={stockWh.id} name={stockWh.name} onClose={() => setStockWh(null)} />}
    </div>
  );
}
