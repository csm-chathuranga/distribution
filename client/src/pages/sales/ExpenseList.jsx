import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetExpensesQuery, useCreateExpenseMutation } from '../../api/salesApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
import { fmtCurrency, fmtDate, today } from '../../utils/format';

const EXPENSE_CATS = [
  { value: 'TRANSPORT', label: 'Transport' }, { value: 'FUEL', label: 'Fuel' },
  { value: 'UTILITIES', label: 'Utilities' }, { value: 'SALARY', label: 'Salary' },
  { value: 'MAINTENANCE', label: 'Maintenance' }, { value: 'OFFICE', label: 'Office' },
  { value: 'OTHER', label: 'Other' },
];

const schema = yup.object({
  description: yup.string().required('Description is required').max(255),
  category: yup.string().required('Category required'),
  amount: yup.number().positive('Must be > 0').required('Amount required').typeError('Enter amount'),
  expense_date: yup.string().required('Date required'),
  reference: yup.string().nullable().max(100),
  notes: yup.string().nullable(),
});

function ExpenseForm({ open, onClose }) {
  const [create, { isLoading }] = useCreateExpenseMutation();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { expense_date: today() },
  });

  const onSubmit = async (data) => {
    try {
      await create({ ...data, company_id: 1, branch_id: 1 }).unwrap();
      toast.success('Expense recorded');
      reset();
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record Expense" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <TextField label="Description" required error={errors.description?.message} {...register('description')} />
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Category" required options={EXPENSE_CATS} error={errors.category?.message} {...register('category')} />
          <TextField label="Amount (LKR)" required type="number" step="0.01" error={errors.amount?.message} {...register('amount')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Date" required type="date" error={errors.expense_date?.message} {...register('expense_date')} />
          <TextField label="Reference" error={errors.reference?.message} {...register('reference')} />
        </div>
        <TextareaField label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary">{isLoading ? 'Saving...' : 'Record Expense'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function ExpenseList() {
  const canCreate = usePermission('finance.payments');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const { data, isLoading } = useGetExpensesQuery({ search, page, limit: 20 });

  const columns = [
    { key: 'expense_date', header: 'Date', cell: r => fmtDate(r.expense_date) },
    { key: 'description', header: 'Description', cell: r => <span className="font-medium">{r.description}</span> },
    { key: 'category', header: 'Category', cell: r => <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{r.category}</span> },
    { key: 'reference', header: 'Reference', cell: r => r.reference || '-' },
    { key: 'amount', header: 'Amount', cell: r => <span className="font-semibold text-red-600">{fmtCurrency(r.amount)}</span>, className: 'text-right' },
  ];

  return (
    <div className="card">
      <PageHeader title="Expenses" onNew={() => setFormOpen(true)} canCreate={canCreate} search={search} onSearch={setSearch} />
      <Table columns={columns} data={data?.data} loading={isLoading} />
      <Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} />
      <ExpenseForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
