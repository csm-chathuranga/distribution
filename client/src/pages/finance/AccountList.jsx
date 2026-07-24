import React, { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Pencil, BookOpen, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetAccountsQuery, useCreateAccountMutation, useUpdateAccountMutation, useGetAccountLedgerQuery } from '../../api/financeApi';
import { usePermission } from '../../hooks/usePermission';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { TextField, SelectField } from '../../components/ui/FormField';
import { fmtCurrency, fmtDate } from '../../utils/format';

const ACCOUNT_TYPES = [
  { value: 'ASSET', label: 'Asset' }, { value: 'LIABILITY', label: 'Liability' },
  { value: 'EQUITY', label: 'Equity' }, { value: 'REVENUE', label: 'Revenue' },
  { value: 'EXPENSE', label: 'Expense' }, { value: 'COGS', label: 'COGS' },
];

const schema = yup.object({
  code: yup.string().required('Code is required').max(20),
  name: yup.string().required('Name is required').max(255),
  type: yup.string().required('Type is required'),
  parent_id: yup.number().nullable().transform(v => v === '' ? null : Number(v)),
});

function AccountForm({ onClose, editing, accounts }) {
  const [create, { isLoading: c }] = useCreateAccountMutation();
  const [update, { isLoading: u }] = useUpdateAccountMutation();
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: editing ? {
      code: editing.code || '',
      name: editing.name || '',
      type: editing.type || '',
      parent_id: editing.parent_id || '',
    } : { code: '', name: '', type: '', parent_id: '' },
  });

  const parentOpts = accounts?.filter(a => !editing || a.id !== editing.id).map(a => ({ value: a.id, label: `${a.code} — ${a.name}` })) || [];

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, company_id: 1 };
      if (editing) await update({ id: editing.id, ...payload }).unwrap();
      else await create(payload).unwrap();
      toast.success(editing ? 'Account updated' : 'Account created');
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <Modal open={true} onClose={onClose} title={editing ? 'Edit Account' : 'New Account'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Account Code" required error={errors.code?.message} {...register('code')} />
          <Controller
            control={control}
            name="type"
            render={({ field, fieldState }) => (
              <SelectField
                label="Account Type"
                required
                options={ACCOUNT_TYPES}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </div>
        <TextField label="Account Name" required error={errors.name?.message} {...register('name')} />
        <Controller
          control={control}
          name="parent_id"
          render={({ field, fieldState }) => (
            <SelectField
              label="Parent Account"
              options={[{ value: '', label: '— None (top level) —' }, ...parentOpts]}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={c || u} className="btn-primary">{c || u ? 'Saving...' : editing ? 'Update' : 'Create Account'}</button>
        </div>
      </form>
    </Modal>
  );
}

function LedgerView({ account, onClose }) {
  const { data, isLoading } = useGetAccountLedgerQuery({ id: account.id });
  let runningBalance = 0;
  const rows = (data || []).map(entry => {
    runningBalance += (Number(entry.debit_amount) || 0) - (Number(entry.credit_amount) || 0);
    return { ...entry, runningBalance };
  });
  return (
    <Modal open={true} onClose={onClose} title={`Ledger — ${account.code} ${account.name}`} size="xl">
      {isLoading ? <div className="py-8 text-center text-gray-500">Loading...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-2 font-medium text-gray-600">Date</th>
                <th className="text-left p-2 font-medium text-gray-600">Description</th>
                <th className="text-right p-2 font-medium text-gray-600">Debit</th>
                <th className="text-right p-2 font-medium text-gray-600">Credit</th>
                <th className="text-right p-2 font-medium text-gray-600">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-2">{fmtDate(r.entry_date)}</td>
                  <td className="p-2">{r.description}</td>
                  <td className="p-2 text-right">{r.debit_amount > 0 ? fmtCurrency(r.debit_amount) : ''}</td>
                  <td className="p-2 text-right">{r.credit_amount > 0 ? fmtCurrency(r.credit_amount) : ''}</td>
                  <td className={`p-2 text-right font-medium ${r.runningBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{fmtCurrency(Math.abs(r.runningBalance))}{r.runningBalance < 0 ? ' Cr' : ' Dr'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

const TYPE_ORDER = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
const TYPE_LABELS = { ASSET: 'Assets', LIABILITY: 'Liabilities', EQUITY: 'Equity', REVENUE: 'Revenue', EXPENSE: 'Expenses' };
const TYPE_BG = { ASSET: 'bg-blue-50 border-blue-200 text-blue-900', LIABILITY: 'bg-red-50 border-red-200 text-red-900', EQUITY: 'bg-purple-50 border-purple-200 text-purple-900', REVENUE: 'bg-green-50 border-green-200 text-green-900', EXPENSE: 'bg-amber-50 border-amber-200 text-amber-900' };

function AccountNode({ account, depth, canCreate, onEdit, onLedger, expandedIds, onToggle }) {
  const hasChildren = account._children && account._children.length > 0;
  const isExpanded = expandedIds.has(account.id);
  const indent = depth * 20;

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 group">
        <td className="py-2 pr-2" style={{ paddingLeft: `${12 + indent}px`, width: '160px' }}>
          <div className="flex items-center gap-1">
            {hasChildren ? (
              <button onClick={() => onToggle(account.id)} className="text-gray-400 hover:text-gray-700 flex-shrink-0">
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            ) : (
              <span className="w-3.5 flex-shrink-0" />
            )}
            <span className="font-mono text-xs text-gray-500">{account.code}</span>
          </div>
        </td>
        <td className="py-2 pr-2">
          <span className={depth === 0 ? 'font-semibold text-gray-900' : depth === 1 ? 'font-medium text-gray-800' : 'text-gray-600 text-sm'}>
            {account.name}
          </span>
        </td>
        <td className="py-2 pr-2 text-right text-sm text-gray-500 w-32">
          {parseFloat(account.balance) !== 0 ? fmtCurrency(account.balance) : ''}
        </td>
        <td className="py-2 text-right w-20">
          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onLedger(account)} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="View ledger">
              <BookOpen size={13} />
            </button>
            {canCreate && (
              <button onClick={() => onEdit(account)} className="p-1 text-gray-400 hover:text-primary-600 rounded">
                <Pencil size={13} />
              </button>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && hasChildren && account._children.map(child => (
        <AccountNode
          key={child.id}
          account={child}
          depth={depth + 1}
          canCreate={canCreate}
          onEdit={onEdit}
          onLedger={onLedger}
          expandedIds={expandedIds}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

export default function AccountList() {
  const canCreate = usePermission('finance.journals');
  const [formKey, setFormKey] = useState(0);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [ledgerAccount, setLedgerAccount] = useState(null);
  const [expandedTypes, setExpandedTypes] = useState(new Set(TYPE_ORDER));
  const [expandedIds, setExpandedIds] = useState(new Set());
  const { data, isLoading } = useGetAccountsQuery({ search });

  const allAccounts = Array.isArray(data) ? data : (data?.data || []);

  const treeByType = useMemo(() => {
    const byId = {};
    allAccounts.forEach(a => { byId[a.id] = { ...a, _children: [] }; });
    allAccounts.forEach(a => {
      if (a.parent_id && byId[a.parent_id]) {
        byId[a.parent_id]._children.push(byId[a.id]);
      }
    });
    const result = {};
    TYPE_ORDER.forEach(t => { result[t] = []; });
    allAccounts.forEach(a => {
      if (!a.parent_id && result[a.type]) result[a.type].push(byId[a.id]);
    });
    return result;
  }, [allAccounts]);

  const openEdit = (r) => { setEditing(r); setFormKey(k => k + 1); setFormOpen(true); };
  const openNew = () => { setEditing(null); setFormKey(k => k + 1); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const toggleType = (type) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const toggleAccount = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isLoading) return (
    <div className="card p-8 flex items-center justify-center text-gray-400">
      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-3" /> Loading...
    </div>
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">Chart of Accounts</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            className="input w-56 py-1.5 text-sm"
            placeholder="Search accounts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {canCreate && (
            <button onClick={openNew} className="btn-primary flex items-center gap-1.5 py-1.5 text-sm">
              <Plus size={15} /> New Account
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="table-th text-left w-40">Code</th>
              <th className="table-th text-left">Account Name</th>
              <th className="table-th text-right w-32">Balance</th>
              <th className="table-th w-20" />
            </tr>
          </thead>
          <tbody>
            {allAccounts.length === 0 ? (
              <tr><td colSpan={4} className="py-12 text-center text-gray-400 text-sm">No accounts found.</td></tr>
            ) : TYPE_ORDER.map(type => {
              const roots = treeByType[type] || [];
              if (roots.length === 0) return null;
              const isOpen = expandedTypes.has(type);
              return (
                <React.Fragment key={type}>
                  {/* Type section header */}
                  <tr
                    className={`border-b cursor-pointer select-none ${TYPE_BG[type] || 'bg-gray-100'}`}
                    onClick={() => toggleType(type)}
                  >
                    <td colSpan={4} className="py-2.5 px-3">
                      <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wide">
                        {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        {TYPE_LABELS[type]}
                        <span className="ml-auto font-normal text-xs opacity-60 normal-case tracking-normal">
                          {roots.reduce((s, r) => s + 1 + countDescendants(r), 0)} accounts
                        </span>
                      </div>
                    </td>
                  </tr>
                  {/* Accounts under this type */}
                  {isOpen && roots.map(root => (
                    <AccountNode
                      key={root.id}
                      account={root}
                      depth={0}
                      canCreate={canCreate}
                      onEdit={openEdit}
                      onLedger={setLedgerAccount}
                      expandedIds={expandedIds}
                      onToggle={toggleAccount}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {formOpen && <AccountForm key={formKey} onClose={closeForm} editing={editing} accounts={allAccounts} />}
      {ledgerAccount && <LedgerView account={ledgerAccount} onClose={() => setLedgerAccount(null)} />}
    </div>
  );
}

function countDescendants(node) {
  if (!node._children || node._children.length === 0) return 0;
  return node._children.reduce((s, c) => s + 1 + countDescendants(c), 0);
}
