import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Pencil, Plus, Search, Phone, User, MapPin, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetCustomersQuery, useCreateCustomerMutation, useUpdateCustomerMutation, useGetRoutesQuery } from '../../api/customersApi';
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
  WHOLESALER:  'bg-blue-100 text-blue-700',
  RETAILER:    'bg-emerald-100 text-emerald-700',
  DIRECT:      'bg-violet-100 text-violet-700',
  INSTITUTION: 'bg-amber-100 text-amber-700',
};

const NAME_GRADIENTS = [
  'linear-gradient(135deg,#f97316,#ef4444)',
  'linear-gradient(135deg,#8b5cf6,#6366f1)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#3b82f6,#1d4ed8)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#ec4899,#be185d)',
  'linear-gradient(135deg,#06b6d4,#0284c7)',
  'linear-gradient(135deg,#84cc16,#16a34a)',
  'linear-gradient(135deg,#f43f5e,#e11d48)',
  'linear-gradient(135deg,#a855f7,#7c3aed)',
];

function nameGradient(name = '') {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return NAME_GRADIENTS[hash % NAME_GRADIENTS.length];
}

const CARD_TINTS = [
  'rgba(249,115,22,0.07)',
  'rgba(139,92,246,0.07)',
  'rgba(16,185,129,0.07)',
  'rgba(59,130,246,0.07)',
  'rgba(245,158,11,0.07)',
  'rgba(236,72,153,0.07)',
  'rgba(6,182,212,0.07)',
  'rgba(132,204,22,0.07)',
  'rgba(244,63,94,0.07)',
  'rgba(168,85,247,0.07)',
];

function cardGradient(name = '') {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const tint = CARD_TINTS[hash % CARD_TINTS.length];
  return `linear-gradient(135deg, ${tint} 0%, #ffffff 50%)`;
}

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
  account_id:     yup.number().nullable().transform((val, orig) => (orig === '' || orig == null) ? null : val),
  route_id:       yup.number().required('Route is required').typeError('Select a route'),
});

function CustomerForm({ onClose, editing }) {
  const [create, { isLoading: c }] = useCreateCustomerMutation();
  const [update, { isLoading: u }] = useUpdateCustomerMutation();
  const { data: accountsData }     = useGetAccountsQuery({ type: 'ASSET', is_active: 'true' });
  const { data: routesData }       = useGetRoutesQuery({ limit: 200 });

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
      route_id: editing.route_id || '',
    } : { customer_type: 'RETAILER', credit_days: 0, credit_limit: 0, account_id: '', route_id: '' },
  });

  const receivableAccounts = (Array.isArray(accountsData) ? accountsData : (accountsData?.data || []))
    .map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }));
  const routeOptions = (routesData?.data || []).map(r => ({ value: r.id, label: r.name }));

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };
      if (editing) await update({ id: editing.id, ...payload }).unwrap();
      else await create(payload).unwrap();
      toast.success(editing ? 'Customer updated' : 'Customer created');
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const formId = 'customer-form';

  return (
    <Modal
      open onClose={onClose}
      title={editing ? 'Edit Customer' : 'New Customer'}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" form={formId} disabled={c || u} className="btn-primary">
            {c || u ? 'Saving...' : editing ? 'Update Customer' : 'Create Customer'}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          control={control} name="route_id"
          render={({ field, fieldState }) => (
            <SelectField
              label="Route"
              required
              placeholder="Select route…"
              options={routeOptions}
              value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
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
      </form>
    </Modal>
  );
}

export default function CustomerList() {
  const canCreate  = usePermission('sales.create');
  const canViewAll = usePermission('sales.view_all');
  const navigate = useNavigate();
  const [formKey,    setFormKey]    = useState(0);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [routeFilter,setRouteFilter]= useState('');
  const [formOpen,   setFormOpen]   = useState(false);
  const [editing,    setEditing]    = useState(null);

  const { data: routesData } = useGetRoutesQuery({ limit: 200 });
  const routeOptions = routesData?.data || [];

  const queryParams = { search, page, limit: 20 };
  if (routeFilter) queryParams.route_id = routeFilter;
  const { data, isLoading } = useGetCustomersQuery(queryParams);
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

      {/* Search + Route filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search customers…"
            className="w-full pl-10 pr-4 font-medium text-gray-800 placeholder-gray-400 bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all"
            style={{ height: 52, borderRadius: 16, fontSize: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          />
        </div>
        <select
          value={routeFilter}
          onChange={e => { setRouteFilter(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all flex-shrink-0"
          style={{ height: 52, borderRadius: 16, fontSize: 16, paddingLeft: 14, paddingRight: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', minWidth: 130 }}
        >
          {canViewAll && <option value="">All Routes</option>}
          {routeOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {/* Card list */}
      {isLoading ? (
        <>
          {/* Desktop skeleton */}
          <div className="hidden md:block space-y-2">
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
          {/* Mobile skeleton */}
          <div className="md:hidden space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-1.5 bg-gray-200 w-full" />
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-40" />
                      <div className="skeleton h-3 w-24" />
                    </div>
                  </div>
                  <div className="skeleton h-3 w-32" />
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <div className="flex justify-between">
                      <div className="skeleton h-3 w-36" />
                      <div className="skeleton h-5 w-24 rounded-full" />
                    </div>
                    <div className="skeleton h-1.5 w-full rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : customers.length === 0 ? (
        <div className="card p-10 text-center">
          <User size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No customers found</p>
          {search && <p className="text-sm text-gray-400 mt-1">Try a different search</p>}
        </div>
      ) : (
        <>
          {/* ── Desktop: original card design ── */}
          <div className="hidden md:block space-y-2">
            {customers.map(c => {
              const routeName = c.route_id ? routeOptions.find(r => String(r.id) === String(c.route_id))?.name : null;
              const desktopInitials = c.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
              return (
              <div key={c.id} className="card p-4 cursor-pointer active:opacity-80" onClick={() => navigate(`/customers/${c.id}`)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm"
                      style={{ background: nameGradient(c.name) }}>
                      <span className="text-white font-bold text-sm">{desktopInitials}</span>
                    </div>
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
                  </div>
                  {canCreate && (
                    <button onClick={e => { e.stopPropagation(); openEdit(c); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors flex-shrink-0">
                      <Pencil size={14} /> Edit
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-primary-600">
                      <Phone size={13} /> {c.phone}
                    </a>
                  )}
                  {c.contact_person && <span>{c.contact_person}</span>}
                  {routeName && (
                    <span className="flex items-center gap-1 text-violet-600 font-medium">
                      <MapPin size={12} /> {routeName}
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                  {parseFloat(c.outstanding_balance || 0) > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-red-500 font-medium">Outstanding</span>
                      <span className="font-bold text-red-600">{fmtCurrency(c.outstanding_balance)}</span>
                    </div>
                  )}
                  {parseFloat(c.total_collected || 0) > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-600 font-medium">Collected</span>
                      <span className="font-bold text-green-700">{fmtCurrency(c.total_collected)}</span>
                    </div>
                  )}
                </div>
              </div>
            ); })}
          </div>

          {/* ── Mobile: new colorful card design ── */}
          <div className="md:hidden space-y-3">
            {customers.map(c => {
              const outstanding = parseFloat(c.outstanding_balance || 0);
              const creditLimit = parseFloat(c.credit_limit || 0);
              const utilPct     = creditLimit > 0 ? Math.min(100, Math.round((outstanding / creditLimit) * 100)) : 0;
              const initials    = c.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
              const routeName   = c.route_id ? routeOptions.find(r => String(r.id) === String(c.route_id))?.name : null;

              return (
                <div key={c.id}
                  className="rounded-2xl shadow-md border border-gray-100 overflow-hidden cursor-pointer active:opacity-75 transition-opacity"
                  style={{ background: cardGradient(c.name) }}
                  onClick={() => navigate(`/customers/${c.id}`)}>

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-md"
                        style={{ background: nameGradient(c.name) }}>
                        <span className="text-white font-extrabold text-xl leading-none">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 leading-snug">{c.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {c.code && <span className="text-xs font-mono text-gray-400">{c.code}</span>}
                          {c.customer_type && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${TYPE_COLORS[c.customer_type] || 'bg-gray-100 text-gray-600'}`}>
                              {c.customer_type}
                            </span>
                          )}
                        </div>
                      </div>
                      {canCreate && (
                        <button onClick={e => { e.stopPropagation(); openEdit(c); }}
                          className="p-1.5 -mt-0.5 -mr-1 text-gray-300 hover:text-primary-600 hover:bg-primary-50 rounded-lg flex-shrink-0 transition-colors">
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>

                    {(c.phone || c.contact_person || routeName) && (
                      <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                        {c.phone && (
                          <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                            <Phone size={12} /> {c.phone}
                          </a>
                        )}
                        {c.contact_person && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <User size={11} className="text-gray-400" /> {c.contact_person}
                          </span>
                        )}
                        {routeName && (
                          <span className="flex items-center gap-1 text-xs text-violet-600 font-medium">
                            <MapPin size={11} /> {routeName}
                          </span>
                        )}
                      </div>
                    )}

                    {c.last_latitude && c.last_longitude && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${c.last_latitude},${c.last_longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="mt-2.5 flex items-center gap-2 rounded-xl font-semibold transition-colors active:opacity-70 ml-auto"
                        style={{ padding: '9px 16px', background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', fontSize: 14, display: 'flex', width: 'fit-content' }}
                      >
                        <Navigation size={14} strokeWidth={2.5} />
                        Get Directions
                      </a>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
<div className="flex items-center justify-between gap-2">
                        {outstanding > 0 ? (
                          <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full flex-shrink-0">
                            Due {fmtCurrency(outstanding)}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex-shrink-0">
                            Clear
                          </span>
                        )}
                      </div>
                      {parseFloat(c.total_collected || 0) > 0 && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-green-600 font-medium">Collected</span>
                          <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full flex-shrink-0">
                            {fmtCurrency(c.total_collected)}
                          </span>
                        </div>
                      )}
                      {creditLimit > 0 && (
                        <div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${
                              utilPct > 90 ? 'bg-red-500' : utilPct > 70 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`} style={{ width: `${utilPct}%` }} />
                          </div>
                          {utilPct > 0 && (
                            <p className="text-[10px] text-gray-400 mt-0.5 text-right">{utilPct}% credit used</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
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
