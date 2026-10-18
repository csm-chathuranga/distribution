import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Pencil, Package, Users, X, UserPlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetWarehousesQuery, useCreateWarehouseMutation, useUpdateWarehouseMutation, useDeleteWarehouseMutation, useGetWarehouseStockQuery, useGetWarehouseUsersQuery, useAssignWarehouseUserMutation, useRemoveWarehouseUserMutation } from '../../api/warehousesApi';
import { useGetBranchesQuery, useGetUsersForSelectQuery } from '../../api/settingsApi';
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

const ROLE_LABEL = { sales_rep: 'Sales Rep', driver: 'Driver' };
const ROLE_COLOR = { sales_rep: 'bg-blue-100 text-blue-700', driver: 'bg-amber-100 text-amber-700' };

function AssignmentsModal({ warehouse, onClose }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const { data: assigned = [], isLoading } = useGetWarehouseUsersQuery(warehouse.id);
  const { data: allUsers = [] } = useGetUsersForSelectQuery();
  const [assign, { isLoading: assigning }] = useAssignWarehouseUserMutation();
  const [remove] = useRemoveWarehouseUserMutation();

  // Only sales_rep and driver roles can be assigned
  const eligible = allUsers.filter(u => ['sales_rep', 'driver'].includes(u.Role?.name || u.role));
  const assignedIds = new Set(assigned.map(u => u.id));
  const available = eligible.filter(u => !assignedIds.has(u.id));

  const handleAssign = async () => {
    if (!selectedUserId) return;
    try {
      await assign({ warehouseId: warehouse.id, userId: Number(selectedUserId) }).unwrap();
      toast.success('User assigned');
      setSelectedUserId('');
    } catch (e) { toast.error(e.data?.message || 'Failed to assign'); }
  };

  const handleRemove = async (userId) => {
    try {
      await remove({ warehouseId: warehouse.id, userId }).unwrap();
      toast.success('Assignment removed');
    } catch (e) { toast.error(e.data?.message || 'Failed to remove'); }
  };

  return (
    <Modal open={true} onClose={onClose} title={`Staff — ${warehouse.name}`} size="sm">
      <div className="space-y-4">
        {/* Current assignments */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned Staff</p>
          {isLoading && <p className="text-sm text-gray-400 py-2">Loading…</p>}
          {!isLoading && assigned.length === 0 && (
            <p className="text-sm text-gray-400 py-2">No staff assigned yet</p>
          )}
          <div className="space-y-1.5">
            {assigned.map(u => (
              <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${ROLE_COLOR[u.Role?.name] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABEL[u.Role?.name] || u.Role?.display_name}
                  </span>
                </div>
                <button onClick={() => handleRemove(u.id)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add user */}
        {available.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add Staff</p>
            <div className="flex gap-2">
              <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
                className="input flex-1 text-sm">
                <option value="">Select sales rep or driver…</option>
                {available.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({ROLE_LABEL[u.Role?.name || u.role] || u.role})
                  </option>
                ))}
              </select>
              <button onClick={handleAssign} disabled={!selectedUserId || assigning}
                className="btn btn-primary px-3 disabled:opacity-50">
                <UserPlus size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function WarehouseList() {
  const canCreate = usePermission('inventory.create');
  const [formKey, setFormKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [stockWh, setStockWh] = useState(null);
  const [staffWh, setStaffWh] = useState(null);
  const { data, isLoading } = useGetWarehousesQuery({});
  const { data: branches } = useGetBranchesQuery({});
  const [deleteWarehouse] = useDeleteWarehouseMutation();

  const handleDelete = async (r) => {
    if (!window.confirm(`Delete warehouse "${r.name}"? This cannot be undone.`)) return;
    try {
      await deleteWarehouse(r.id).unwrap();
      toast.success('Warehouse deleted');
    } catch (e) { toast.error(e.data?.message || 'Failed to delete'); }
  };

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
        {canCreate && (
          <>
            <button onClick={() => setStaffWh(r)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Manage Staff"><Users size={14} /></button>
            <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Pencil size={14} /></button>
            <button onClick={() => handleDelete(r)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={14} /></button>
          </>
        )}
      </div>
    )},
  ];

  return (
    <div className="card">
      <PageHeader title="Warehouses" onNew={openNew} canCreate={canCreate} />
      <Table columns={columns} data={data?.data} loading={isLoading} />
      {formOpen && <WarehouseForm key={formKey} onClose={closeForm} editing={editing} branches={branches?.data || []} />}
      {stockWh && <StockView warehouseId={stockWh.id} name={stockWh.name} onClose={() => setStockWh(null)} />}
      {staffWh && <AssignmentsModal warehouse={staffWh} onClose={() => setStaffWh(null)} />}
    </div>
  );
}
