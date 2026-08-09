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
  { value: 'CASH',          label: 'Cash' },
  { value: 'CHEQUE',        label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD',          label: 'Card' },
];

const allocationSchema = yup.object({
  invoice_id: yup.number().required('Invoice required').typeError('Select invoice'),
  amount:     yup.number().positive('Must be > 0').required('Amount required').typeError('Enter amount'),
});

const makeSchema = (isAdvance) => yup.object({
  customer_id:    yup.number().required('Customer is required').typeError('Select customer'),
  payment_method: yup.string().required('Payment method required'),
  receipt_date:   yup.string().required('Date required'),
  amount:         yup.number().positive('Must be > 0').required('Amount required').typeError('Enter amount'),
  reference:      yup.string().nullable().max(100),
  notes:          yup.string().nullable(),
  cheque_number:  yup.string().nullable().when('payment_method', { is: 'CHEQUE', then: s => s.required('Cheque number required') }),
  cheque_date:    yup.string().nullable().when('payment_method', { is: 'CHEQUE', then: s => s.required('Cheque date required') }),
  bank_name:      yup.string().nullable(),
  allocations:    isAdvance
    ? yup.array().of(allocationSchema)
    : yup.array().of(allocationSchema).min(1, 'Allocate to at least one invoice'),
});

export default function ReceiptCreate() {
  const navigate = useNavigate();
  const [createReceipt, { isLoading }] = useCreateReceiptMutation();
  const { data: customers } = useGetCustomersQuery({ limit: 500 });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isAdvance, setIsAdvance] = useState(false);

  const { data: invoices } = useGetInvoicesQuery(
    { customer_id: selectedCustomer, status: 'POSTED,PARTIAL,OVERDUE', limit: 50 },
    { skip: !selectedCustomer },
  );

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    resolver: yupResolver(makeSchema(isAdvance)),
    defaultValues: { receipt_date: today(), payment_method: 'CASH', allocations: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'allocations' });
  const paymentMethod  = watch('payment_method');
  const allocations    = watch('allocations') || [];
  const totalAllocated = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);

  useEffect(() => {
    if (!isAdvance && totalAllocated > 0) setValue('amount', totalAllocated);
  }, [totalAllocated, isAdvance]);

  // Reset allocations when toggling advance mode
  const handleToggleAdvance = (val) => {
    setIsAdvance(val);
    reset(v => ({ ...v, allocations: [] }));
  };

  const customerOpts = customers?.data?.map(c => ({
    value: c.id,
    label: `${c.name} (Bal: ${fmtCurrency(c.outstanding_balance)})`,
  })) || [];
  const invoiceOpts = invoices?.data?.map(i => ({
    value: i.id,
    label: `${i.invoice_number} — Due: ${fmtCurrency(i.balance_due)}`,
  })) || [];

  const onSubmit = async (data) => {
    try {
      await createReceipt({ ...data, company_id: 1, branch_id: 1 }).unwrap();
      toast.success(isAdvance ? 'Advance payment recorded' : 'Receipt created');
      navigate('/receipts');
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Receipt</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record a customer payment</p>
        </div>
        <button onClick={() => navigate('/receipts')} className="btn-secondary">Cancel</button>
      </div>

      {/* Advance toggle */}
      <div className="flex gap-3">
        <button type="button"
          onClick={() => handleToggleAdvance(false)}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${!isAdvance ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
          Invoice Payment
          <p className="text-xs font-normal mt-0.5 text-inherit opacity-70">Allocate to specific invoices</p>
        </button>
        <button type="button"
          onClick={() => handleToggleAdvance(true)}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${isAdvance ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
          Advance Payment
          <p className="text-xs font-normal mt-0.5 text-inherit opacity-70">No invoice yet — allocate later</p>
        </button>
      </div>

      {isAdvance && (
        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <span className="text-lg">💡</span>
          <p>This payment will be held as advance credit for the customer. You can apply it to any invoice later from the invoice detail page.</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6 space-y-4">
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

        {!isAdvance && (
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="font-semibold text-gray-700">Invoice Allocations</h2>
              <button type="button" disabled={!selectedCustomer}
                onClick={() => append({ invoice_id: '', amount: 0 })}
                className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-50">
                <Plus size={14} /> Add Invoice
              </button>
            </div>
            {errors.allocations?.message && <p className="text-sm text-red-600">{errors.allocations.message}</p>}
            {!selectedCustomer && <p className="text-sm text-gray-500">Select a customer first to load open invoices.</p>}
            {fields.map((field, i) => (
              <div key={field.id} className="flex items-end gap-3">
                <div className="flex-1">
                  <SelectField label={i === 0 ? 'Invoice' : undefined} options={invoiceOpts}
                    error={errors.allocations?.[i]?.invoice_id?.message} {...register(`allocations.${i}.invoice_id`)} />
                </div>
                <div className="w-40">
                  <TextField label={i === 0 ? 'Amount (LKR)' : undefined} type="number" step="0.01"
                    error={errors.allocations?.[i]?.amount?.message} {...register(`allocations.${i}.amount`)} />
                </div>
                <button type="button" onClick={() => remove(i)} className="mb-0.5 p-2 text-red-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {fields.length > 0 && (
              <div className="flex justify-end border-t pt-3">
                <span className="font-semibold text-gray-700">
                  Total Allocated: <span className="text-primary-700">{fmtCurrency(totalAllocated)}</span>
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/receipts')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'Saving...' : isAdvance ? 'Record Advance Payment' : 'Create Receipt'}
          </button>
        </div>
      </form>
    </div>
  );
}
