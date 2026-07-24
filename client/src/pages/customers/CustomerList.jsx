import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Pencil, Plus, Search, Phone, User, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetCustomersQuery, useCreateCustomerMutation, useUpdateCustomerMutation } from '../../api/customersApi';
import { useGetAccountsQuery } from '../../api/financeApi';
import { usePermission } from '../../hooks/usePermission';
import Modal from '../../components/ui/Modal';
import { TextField, TextareaField, SelectField } from '../../components/ui/FormField';
import { fmtCurrency } from '../../utils/format';

const CUSTOMER_TYPES = [
  { value: 'WHOLESALER', label: 'Wholesaler' },
  { value: 'RETAILER',   label: 'Retailer'   },
  { value: 'DIRECT',     label: 'Direct'      },
  { value: 'INSTITUTION',label: 'Institution' },
];

const TYPE_COLORS = {
  WHOLESALER:  'bg-blue-100 text-blue-800',
  RETAILER:    'bg-green-100 text-green-800',
  DIRECT:      'bg-purple-100 text-purple-800',
  INSTITUTION: 'bg-amber-100 text-amber-800',
};

const schema = yup.object({
  name:           yup.string().required('Customer name is required').max(255),
  code:           yup.string().nullable().max(50),
  customer_type:  yup.string().oneOf(['WHOLESALER','RETAILER','DIRECT','INSTITUTION']).default('RETAILER'),
  contact_person: yup.string().nullable().max(100),
  phone:          yup.string().nullable().max(20),
  email:          yup.string().email('Invalid email').nullable(),
  address:        yup.string().nullable(),
  tax_number:     yup.string().nullable().max(50),
  credit_days:    yup.number().integer().min(0).default(0).typeError('Enter days'),
  credit_limit:   yup.number().min(0).default(0).typeError('Enter amount'),
  account_id:     yup.number().nullable().transform((val, orig) => (orig === '' || orig === null) ? null : val),
});

function CustomerForm({ onClose, editing }) {
  const [create, { isLoading: c }] = useCreateCustomerMutation();
  const [update, { isLoading: u }] = useUpdateCustomerMutation();
  const { data: accountsData } = useGetAccountsQuery({ type: 'ASSET', is_active: 'true' });

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: editing ? {
      name: editing.name || '', code: editing.code || '',
      customer_type: editing.customer_type || 'RETAILER',
      contact_person: editing.contact_person || '', phone: editing.phone || '',
      email: editing.email || '', address: editing.address || '',
      tax_number: editing.tax_number || '',
      credit_days: editing.credit_days ?? 0, credit_limit: editing.credit_limit ?? 0,
      account_id: editing.account_id || '',
    } : { customer_type: 'RETAILER', credit_days: 0, credit_limit: 0, account_id: '' },
  });

  const receivableAccounts = (Array.isArray(accountsData) ? accountsData : (accountsData?.data || []))
    .map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }));

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, company_id: 1 };
      if (editing) await update({ id: editing.id, ...payload }).unwrap();
      else await create(payload).unwrap();
      toast.success(editing ? 'Customer updated' : 'Customer created');
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <Modal open onClose={onClose} title={editing ? 'Edit Customer' : 'New Customer'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Customer Name" required error={errors.name?.message} {...register('name')} />
          <TextField label="Code" error={errors.code?.message} {...register('code')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Customer Type" options={CUSTOMER_TYPES} error={errors.customer_type?.message} {...register('customer_type')} />
          <TextField label="Tax Number" error={errors.tax_number?.message} {...register('tax_number')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Contact Person" error={errors.contact_person?.message} {...register('contact_person')} />
          <TextField label="Phone" type="tel" error={errors.phone?.message} {...register('phone')} />
        </div>
        <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <TextareaField label="Address" rows={2} error={errors.address?.message} {...register('address')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Credit Days" type="number" error={errors.credit_days?.message} {...register('credit_days')} />
          <TextField label="Credit Limit (LKR)" type="number" error={errors.credit_limit?.message} {...register('credit_limit')} />
        </div>
        <Controller
          control={control} name="account_id"
          render={({ field, fieldState }) => (
            <SelectField
              label="Receivable Account (optional)"
              placeholder="Link to accounts receivable..."
              options={receivableAccounts}
              value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={c || u} className="btn-primary">
            {c || u ? 'Saving...' : editing ? 'Update Customer' : 'Create Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function CustomerList() {
  const canCreate = usePermission('sales.create');
  const [formKey,  setFormKey]  = useState(0);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState(null);

  const { data, isLoading } = useGetCustomersQuery({ search, page, limit: 20 });
  const customers = data?.data || [];
  const total     = data?.total || 0;

  const openEdit = (r) => { setEditing(r); setFormKey(k => k + 1); setFormOpen(true); };
  const openNew  = ()  => { setEditing(null); setFormKey(k => k + 1); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Customers</h1>
        {canCreate && (
          <button onClick={openNew} className="btn btn-primary flex items-center gap-1.5">
            <Plus size={16} /> New
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search customers…"
          className="input pl-9 w-full"
        />
      </div>

      {/* Card list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="card animate-pulse p-4 space-y-2">
              <div className="flex justify-between">
                <div className="skeleton h-5 w-44" />
                <div className="skeleton h-5 w-16" />
              </div>
              <div className="skeleton h-4 w-32" />
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="card p-10 text-center">
          <User size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No customers found</p>
          {search && <p className="text-sm text-gray-400 mt-1">Try a different search</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map(c => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900 leading-snug">{c.name}</p>
                    {c.customer_type && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[c.customer_type] || 'bg-gray-100 text-gray-600'}`}>
                        {c.customer_type}
                      </span>
                    )}
                  </div>
                  {c.code && <p className="text-xs font-mono text-gray-400 mt-0.5">{c.code}</p>}
                </div>
                {canCreate && (
                  <button onClick={() => openEdit(c)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg flex-shrink-0">
                    <Pencil size={15} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-primary-600">
                    <Phone size={13} /> {c.phone}
                  </a>
                )}
                {c.contact_person && <span>{c.contact_person}</span>}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Credit limit: <span className="font-semibold text-gray-700">{fmtCurrency(c.credit_limit)}</span>
                  {c.credit_days > 0 && <span className="ml-2">· {c.credit_days} days</span>}
                </div>
                {parseFloat(c.outstanding_balance || 0) > 0 && (
                  <span className="text-xs font-semibold text-red-600">
                    Due: {fmtCurrency(c.outstanding_balance)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-3 py-1.5 disabled:opacity-40">Prev</button>
            <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="btn-secondary px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {formOpen && <CustomerForm key={formKey} onClose={closeForm} editing={editing} />}
    </div>
  );
}
