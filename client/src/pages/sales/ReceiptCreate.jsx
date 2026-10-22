import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCreateReceiptMutation } from '../../api/salesApi';
import { useGetCustomersQuery } from '../../api/customersApi';
import { TextField, SelectField, TextareaField } from '../../components/ui/FormField';
import { today, fmtCurrency } from '../../utils/format';

const PAYMENT_METHODS = [
  { value: 'CASH',          label: 'Cash' },
  { value: 'CHEQUE',        label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD',          label: 'Card' },
];

const schema = yup.object({
  customer_id:    yup.number().required('Customer is required').typeError('Select customer'),
  payment_method: yup.string().required('Payment method required'),
  receipt_date:   yup.string().required('Date required'),
  amount:         yup.number().positive('Must be > 0').required('Amount required').typeError('Enter amount'),
  reference:      yup.string().nullable().max(100),
  notes:          yup.string().nullable(),
  cheque_number:  yup.string().nullable().when('payment_method', { is: 'CHEQUE', then: s => s.required('Cheque number required') }),
  cheque_date:    yup.string().nullable().when('payment_method', { is: 'CHEQUE', then: s => s.required('Cheque date required') }),
  bank_name:      yup.string().nullable(),
});

export default function ReceiptCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [createReceipt, { isLoading }] = useCreateReceiptMutation();
  const { data: customers } = useGetCustomersQuery({ limit: 500 });
  const prefilledCustomerId = searchParams.get('customer_id');
  const backUrl = prefilledCustomerId ? `/customers/${prefilledCustomerId}` : '/receipts';
  const [selectedCustomer, setSelectedCustomer] = useState(prefilledCustomerId || null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { receipt_date: today(), payment_method: 'CASH', customer_id: prefilledCustomerId ? Number(prefilledCustomerId) : undefined },
  });
  const paymentMethod = watch('payment_method');

  const watchedCustomerId = watch('customer_id');
  const watchedAmount     = watch('amount');
  const selectedCust = customers?.data?.find(c => String(c.id) === String(watchedCustomerId));
  const outstanding  = parseFloat(selectedCust?.outstanding_balance || 0);

  const customerOpts = customers?.data?.map(c => ({
    value: c.id,
    label: c.name,
  })) || [];

  const onSubmit = async (data) => {
    try {
      await createReceipt({ ...data, company_id: 1, branch_id: 1 }).unwrap();
      toast.success('Receipt created');
      navigate(backUrl);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Receipt</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record a customer payment</p>
        </div>
        <button onClick={() => navigate(backUrl)} className="btn-secondary">Cancel</button>
      </div>


      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 border-b pb-2">Payment Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField label="Customer" required options={customerOpts} error={errors.customer_id?.message}
              {...register('customer_id', { onChange: e => setSelectedCustomer(e.target.value) })} />
            <SelectField label="Payment Method" required options={PAYMENT_METHODS} error={errors.payment_method?.message} {...register('payment_method')} />
          </div>

          {/* Outstanding balance panel */}
          {selectedCust && (
            <div className={`rounded-xl px-5 py-4 flex items-center justify-between gap-4 ${outstanding > 0 ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${outstanding > 0 ? 'text-red-500' : 'text-emerald-600'}`}>Outstanding Balance</p>
                <p className={`text-2xl font-bold mt-0.5 ${outstanding > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{fmtCurrency(outstanding)}</p>
                {parseFloat(watchedAmount) > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    After collection: <span className={`font-semibold ${outstanding - parseFloat(watchedAmount) <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmtCurrency(Math.max(0, outstanding - parseFloat(watchedAmount)))}
                    </span>
                  </p>
                )}
              </div>
              {outstanding > 0 && (
                <button type="button"
                  onClick={() => setValue('amount', outstanding)}
                  className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors whitespace-nowrap">
                  Collect Full
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Receipt Date" required type="date" error={errors.receipt_date?.message} {...register('receipt_date')} />
            <TextField label="Collect Amount (LKR)" required type="number" step="0.01" error={errors.amount?.message} {...register('amount')} />
          </div>
          <TextField label="Reference" placeholder="Bank ref / voucher number" error={errors.reference?.message} {...register('reference')} />
          {paymentMethod === 'CHEQUE' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <TextField label="Cheque Number" required error={errors.cheque_number?.message} {...register('cheque_number')} />
              <TextField label="Cheque Date" required type="date" error={errors.cheque_date?.message} {...register('cheque_date')} />
              <TextField label="Bank Name" error={errors.bank_name?.message} {...register('bank_name')} />
            </div>
          )}
          <TextareaField label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
        </div>


        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(backUrl)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'Saving...' : 'Create Receipt'}
          </button>
        </div>
      </form>
    </div>
  );
}
