import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useCreateReceiptMutation, useGetInvoicesQuery } from '../../api/salesApi';
import { useGetCustomersQuery } from '../../api/customersApi';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
import { today, fmtCurrency } from '../../utils/format';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD', label: 'Card' },
];

const allocationSchema = yup.object({
  invoice_id: yup.number().required('Invoice required').typeError('Select invoice'),
  amount: yup.number().positive('Must be > 0').required('Amount required').typeError('Enter amount'),
});

const schema = yup.object({
  customer_id: yup.number().required('Customer is required').typeError('Select customer'),
  payment_method: yup.string().required('Payment method required'),
  receipt_date: yup.string().required('Date required'),
  amount: yup.number().positive('Must be > 0').required('Amount required').typeError('Enter amount'),
  reference: yup.string().nullable().max(100),
  notes: yup.string().nullable(),
  cheque_number: yup.string().nullable().when('payment_method', { is: 'CHEQUE', then: s => s.required('Cheque number required') }),
  cheque_date: yup.string().nullable().when('payment_method', { is: 'CHEQUE', then: s => s.required('Cheque date required') }),
  bank_name: yup.string().nullable(),
  allocations: yup.array().of(allocationSchema).min(1, 'Allocate to at least one invoice'),
});

export default function ReceiptCreate() {
  const navigate = useNavigate();
  const [createReceipt, { isLoading }] = useCreateReceiptMutation();
  const { data: customers } = useGetCustomersQuery({ limit: 500 });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const { data: invoices } = useGetInvoicesQuery({ customer_id: selectedCustomer, status: 'POSTED,PARTIAL,OVERDUE', limit: 50 }, { skip: !selectedCustomer });

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { receipt_date: today(), payment_method: 'CASH', allocations: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'allocations' });
  const paymentMethod = watch('payment_method');
  const allocations = watch('allocations') || [];
  const totalAllocated = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);

  const customerOpts = customers?.data?.map(c => ({ value: c.id, label: `${c.name} (Bal: ${fmtCurrency(c.outstanding_balance)})` })) || [];
  const invoiceOpts = invoices?.data?.map(i => ({ value: i.id, label: `${i.invoice_number} — Due: ${fmtCurrency(i.balance_due)}` })) || [];

  useEffect(() => {
    const totalAmt = totalAllocated;
    if (totalAmt > 0) setValue('amount', totalAmt);
  }, [totalAllocated]);

  const onSubmit = async (data) => {
    try {
      await createReceipt({ ...data, company_id: 1, branch_id: 1 }).unwrap();
      toast.success('Receipt created');
      navigate('/receipts');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Receipt</h1>
        <button onClick={() => navigate('/receipts')} className="btn-secondary">Cancel</button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700 border-b pb-2">Payment Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Customer" required options={customerOpts} error={errors.customer_id?.message}
              {...register('customer_id', { onChange: e => setSelectedCustomer(e.target.value) })} />
            <SelectField label="Payment Method" required options={PAYMENT_METHODS} error={errors.payment_method?.message} {...register('payment_method')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Receipt Date" required type="date" error={errors.receipt_date?.message} {...register('receipt_date')} />
            <TextField label="Amount (LKR)" required type="number" step="0.01" error={errors.amount?.message} {...register('amount')} />
          </div>
          <TextField label="Reference" placeholder="Bank ref / voucher number" error={errors.reference?.message} {...register('reference')} />
          {paymentMethod === 'CHEQUE' && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <TextField label="Cheque Number" required error={errors.cheque_number?.message} {...register('cheque_number')} />
              <TextField label="Cheque Date" required type="date" error={errors.cheque_date?.message} {...register('cheque_date')} />
              <TextField label="Bank Name" error={errors.bank_name?.message} {...register('bank_name')} />
            </div>
          )}
          <TextareaField label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-semibold text-gray-700">Invoice Allocations</h2>
            <button type="button" disabled={!selectedCustomer} onClick={() => append({ invoice_id: '', amount: 0 })} className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-50"><Plus size={14} /> Add Invoice</button>
          </div>
          {errors.allocations?.message && <p className="text-sm text-red-600">{errors.allocations.message}</p>}
          {!selectedCustomer && <p className="text-sm text-gray-500">Select a customer first to load open invoices.</p>}
          {fields.map((field, i) => (
            <div key={field.id} className="flex items-end gap-3">
              <div className="flex-1">
                <SelectField label={i === 0 ? 'Invoice' : undefined} options={invoiceOpts} error={errors.allocations?.[i]?.invoice_id?.message} {...register(`allocations.${i}.invoice_id`)} />
              </div>
              <div className="w-40">
                <TextField label={i === 0 ? 'Amount (LKR)' : undefined} type="number" step="0.01" error={errors.allocations?.[i]?.amount?.message} {...register(`allocations.${i}.amount`)} />
              </div>
              <button type="button" onClick={() => remove(i)} className="mb-0.5 p-2 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          ))}
          {fields.length > 0 && (
            <div className="flex justify-end border-t pt-3">
              <span className="font-semibold text-gray-700">Total Allocated: <span className="text-primary-700">{fmtCurrency(totalAllocated)}</span></span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/receipts')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary">{isLoading ? 'Saving...' : 'Create Receipt'}</button>
        </div>
      </form>
    </div>
  );
}
