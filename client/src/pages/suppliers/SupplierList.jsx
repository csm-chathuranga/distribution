import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetSuppliersQuery, useCreateSupplierMutation, useUpdateSupplierMutation } from '../../api/suppliersApi';
import { useGetAccountsQuery } from '../../api/financeApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import { TextField, TextareaField, SelectField } from '../../components/ui/FormField';
import { fmtCurrency } from '../../utils/format';

const schema = yup.object({
  name: yup.string().required('Supplier name is required').max(255),
  code: yup.string().nullable().max(50),
  contact_person: yup.string().nullable().max(100),
  phone: yup.string().nullable().max(20),
  email: yup.string().email('Invalid email').nullable(),
  address: yup.string().nullable(),
  tin_number: yup.string().nullable().max(50),
  vat_number: yup.string().nullable().max(50),
  credit_days: yup.number().integer().min(0).default(30).typeError('Enter days'),
  credit_limit: yup.number().min(0).default(0).typeError('Enter amount'),
  payment_terms: yup.string().nullable(),
  account_id: yup.number().nullable().transform((val, orig) => orig === '' || orig === null ? null : val),
});

function SupplierForm({ onClose, editing }) {
  const [create, { isLoading: c }] = useCreateSupplierMutation();
  const [update, { isLoading: u }] = useUpdateSupplierMutation();
  const { data: accountsData } = useGetAccountsQuery({ type: 'LIABILITY', is_active: 'true' });
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: editing ? {
      name: editing.name || '',
      code: editing.code || '',
      contact_person: editing.contact_person || '',
      phone: editing.phone || '',
      email: editing.email || '',
      address: editing.address || '',
      tin_number: editing.tin_number || '',
      vat_number: editing.vat_number || '',
      credit_days: editing.credit_days ?? 30,
      credit_limit: editing.credit_limit ?? 0,
      payment_terms: editing.payment_terms || '',
      account_id: editing.account_id || '',
    } : { credit_days: 30, credit_limit: 0, account_id: '' },
  });

  const payableAccounts = (Array.isArray(accountsData) ? accountsData : (accountsData?.data || [])).map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }));

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, company_id: 1 };
      if (editing) await update({ id: editing.id, ...payload }).unwrap();
      else await create(payload).unwrap();
      toast.success(editing ? 'Supplier updated' : 'Supplier created');
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <Modal open={true} onClose={onClose} title={editing ? 'Edit Supplier' : 'New Supplier'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Supplier Name" required error={errors.name?.message} {...register('name')} />
          <TextField label="Code" error={errors.code?.message} {...register('code')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Contact Person" error={errors.contact_person?.message} {...register('contact_person')} />
          <TextField label="Phone" type="tel" error={errors.phone?.message} {...register('phone')} />
        </div>
        <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <TextareaField label="Address" rows={2} error={errors.address?.message} {...register('address')} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="TIN Number" error={errors.tin_number?.message} {...register('tin_number')} />
          <TextField label="VAT Number" error={errors.vat_number?.message} {...register('vat_number')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Credit Days" type="number" error={errors.credit_days?.message} {...register('credit_days')} />
          <TextField label="Credit Limit (LKR)" type="number" error={errors.credit_limit?.message} {...register('credit_limit')} />
        </div>
        <TextareaField label="Payment Terms" rows={2} error={errors.payment_terms?.message} {...register('payment_terms')} />
        <Controller
          control={control}
          name="account_id"
          render={({ field, fieldState }) => (
            <SelectField
              label="Payable Account (optional)"
              placeholder="Link to accounts payable..."
              options={payableAccounts}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={c || u} className="btn-primary">{c || u ? 'Saving...' : editing ? 'Update Supplier' : 'Create Supplier'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function SupplierList() {
  const canCreate = usePermission('purchase.create');
  const [formKey, setFormKey] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data, isLoading } = useGetSuppliersQuery({ search, page, limit: 20 });

  const openEdit = (r) => { setEditing(r); setFormKey(k => k + 1); setFormOpen(true); };
  const openNew = () => { setEditing(null); setFormKey(k => k + 1); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const columns = [
    { key: 'code', header: 'Code', cell: r => <span className="font-mono text-xs">{r.code || '-'}</span> },
    { key: 'name', header: 'Supplier', cell: r => <span className="font-medium">{r.name}</span> },
    { key: 'contact_person', header: 'Contact' },
    { key: 'phone', header: 'Phone' },
    { key: 'account', header: 'Payable Account', cell: r => r.Account ? <span className="font-mono text-xs">{r.Account.code} — {r.Account.name}</span> : <span className="text-gray-400">—</span> },
    { key: 'credit_days', header: 'Credit Days', className: 'text-center', cell: r => `${r.credit_days} days` },
    { key: 'credit_limit', header: 'Credit Limit', cell: r => fmtCurrency(r.credit_limit), className: 'text-right' },
    { key: 'actions', header: '', className: 'text-right', cell: r => canCreate && (
      <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Pencil size={14} /></button>
    )},
  ];

  return (
    <div className="card">
      <PageHeader title="Suppliers" onNew={openNew} canCreate={canCreate} search={search} onSearch={setSearch} />
      <Table columns={columns} data={data?.data} loading={isLoading} />
      <Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} />
      {formOpen && <SupplierForm key={formKey} onClose={closeForm} editing={editing} />}
    </div>
  );
}
