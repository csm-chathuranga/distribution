import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Plus, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetJournalsQuery, useCreateJournalMutation } from '../../api/financeApi';
import { useGetAccountsQuery } from '../../api/financeApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
import { fmtCurrency, fmtDate, today } from '../../utils/format';

const lineSchema = yup.object({
  account_id: yup.number().required('Account required').typeError('Select account'),
  debit_amount: yup.number().min(0).default(0).typeError('Enter amount'),
  credit_amount: yup.number().min(0).default(0).typeError('Enter amount'),
  narration: yup.string().nullable(),
});

const schema = yup.object({
  entry_date: yup.string().required('Date required'),
  description: yup.string().required('Description required').max(500),
  lines: yup.array().of(lineSchema).min(2, 'At least 2 lines required'),
});

function JournalForm({ open, onClose, accounts }) {
  const [create, { isLoading }] = useCreateJournalMutation();
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { entry_date: today(), lines: [{ account_id: '', debit_amount: 0, credit_amount: 0 }, { account_id: '', debit_amount: 0, credit_amount: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines') || [];

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit_amount) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit_amount) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const accountOpts = accounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }));

  const onSubmit = async (data) => {
    if (!balanced) { toast.error('Debits must equal credits'); return; }
    try {
      await create({ ...data, company_id: 1, branch_id: 1 }).unwrap();
      toast.success('Journal entry posted');
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Journal Entry" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Entry Date" required type="date" error={errors.entry_date?.message} {...register('entry_date')} />
        </div>
        <TextareaField label="Description / Narration" required rows={2} error={errors.description?.message} {...register('description')} />

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-700">Journal Lines</h3>
            <button type="button" onClick={() => append({ account_id: '', debit_amount: 0, credit_amount: 0 })} className="btn-secondary text-sm flex items-center gap-1"><Plus size={14} /> Add Line</button>
          </div>
          {errors.lines?.message && <p className="text-sm text-red-600 mb-2">{errors.lines.message}</p>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-2 font-medium text-gray-600">Account</th>
                <th className="text-right p-2 font-medium text-gray-600 w-36">Debit (LKR)</th>
                <th className="text-right p-2 font-medium text-gray-600 w-36">Credit (LKR)</th>
                <th className="text-left p-2 font-medium text-gray-600">Narration</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fields.map((field, i) => (
                <tr key={field.id}>
                  <td className="p-1"><SelectField options={accountOpts} error={errors.lines?.[i]?.account_id?.message} {...register(`lines.${i}.account_id`)} /></td>
                  <td className="p-1"><TextField type="number" step="0.01" error={errors.lines?.[i]?.debit_amount?.message} {...register(`lines.${i}.debit_amount`)} /></td>
                  <td className="p-1"><TextField type="number" step="0.01" error={errors.lines?.[i]?.credit_amount?.message} {...register(`lines.${i}.credit_amount`)} /></td>
                  <td className="p-1"><TextField placeholder="Optional" error={errors.lines?.[i]?.narration?.message} {...register(`lines.${i}.narration`)} /></td>
                  <td className="p-1">{fields.length > 2 && <button type="button" onClick={() => remove(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 font-semibold">
              <tr>
                <td className="p-2 text-right">Totals:</td>
                <td className="p-2 text-right">{fmtCurrency(totalDebit)}</td>
                <td className="p-2 text-right">{fmtCurrency(totalCredit)}</td>
                <td colSpan={2} className={`p-2 text-sm ${balanced ? 'text-green-600' : 'text-red-600'}`}>{balanced ? 'Balanced' : `Difference: ${fmtCurrency(Math.abs(totalDebit - totalCredit))}`}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading || !balanced} className="btn-primary disabled:opacity-50">{isLoading ? 'Posting...' : 'Post Journal Entry'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function JournalList() {
  const canCreate = usePermission('finance.journals');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [viewEntry, setViewEntry] = useState(null);
  const { data, isLoading } = useGetJournalsQuery({ search, page, limit: 20 });
  const { data: accountData } = useGetAccountsQuery({});
  const accounts = accountData?.data || [];

  const SOURCE_COLORS = { MANUAL: 'bg-gray-100 text-gray-700', INVOICE: 'bg-blue-100 text-blue-700', RECEIPT: 'bg-green-100 text-green-700', PAYMENT: 'bg-red-100 text-red-700', GRN: 'bg-amber-100 text-amber-700' };

  const columns = [
    { key: 'entry_number', header: 'Entry #', cell: r => <span className="font-mono font-medium text-primary-700">{r.entry_number}</span> },
    { key: 'entry_date', header: 'Date', cell: r => fmtDate(r.entry_date) },
    { key: 'description', header: 'Description', cell: r => <span className="text-sm">{r.description}</span> },
    { key: 'source_type', header: 'Source', cell: r => <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SOURCE_COLORS[r.source_type] || 'bg-gray-100 text-gray-700'}`}>{r.source_type}</span> },
    { key: 'total_debit', header: 'Debit', cell: r => fmtCurrency(r.JournalLines?.reduce((s, l) => s + parseFloat(l.debit_amount || 0), 0)), className: 'text-right' },
    {
      key: 'actions', header: '', className: 'text-right',
      cell: r => <button onClick={() => setViewEntry(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={14} /></button>,
    },
  ];

  return (
    <div className="card">
      <PageHeader title="Journal Entries" onNew={() => setFormOpen(true)} canCreate={canCreate} search={search} onSearch={setSearch} />
      <Table columns={columns} data={data?.data} loading={isLoading} />
      <Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} />
      <JournalForm open={formOpen} onClose={() => setFormOpen(false)} accounts={accounts} />
      {viewEntry && (
        <Modal open={true} onClose={() => setViewEntry(null)} title={`Journal Entry — ${viewEntry.entry_number}`} size="lg">
          <p className="text-sm text-gray-600 mb-3">{viewEntry.description}</p>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left p-2 text-gray-600">Account</th><th className="text-right p-2 text-gray-600">Debit</th><th className="text-right p-2 text-gray-600">Credit</th></tr></thead>
            <tbody className="divide-y">
              {viewEntry.JournalLines?.map((l, i) => (
                <tr key={i}><td className="p-2">{l.Account?.code} — {l.Account?.name}</td><td className="p-2 text-right">{parseFloat(l.debit_amount) > 0 ? fmtCurrency(l.debit_amount) : ''}</td><td className="p-2 text-right">{parseFloat(l.credit_amount) > 0 ? fmtCurrency(l.credit_amount) : ''}</td></tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}
