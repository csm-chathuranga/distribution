import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useCreateInvoiceMutation, useGetInvoiceQuery, useGetInvoicesQuery } from '../../api/salesApi';
import FormField from '../../components/ui/FormField';
import { today, fmtCurrency } from '../../utils/format';

const schema = yup.object({
  original_invoice_id: yup.number().required('Select the original invoice').typeError('Select an invoice'),
  invoice_date: yup.string().required(),
  reason: yup.string().required('Reason is required'),
  lines: yup.array().of(yup.object({
    product_id: yup.number().required(),
    quantity: yup.number().positive().required(),
    unit_price: yup.number().min(0).required(),
    vat_rate: yup.number().min(0).required(),
  })).min(1),
});

export default function CreditNoteCreate() {
  const navigate = useNavigate();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

  const { data: invoicesData } = useGetInvoicesQuery({ status: 'POSTED', invoice_type: 'INVOICE', limit: 200 });
  const { data: origInvoice } = useGetInvoiceQuery(selectedInvoiceId, { skip: !selectedInvoiceId });
  const [createInvoice, { isLoading }] = useCreateInvoiceMutation();

  const { register, handleSubmit, control, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { invoice_date: today(), lines: [] },
  });

  const { fields, replace } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines');

  // Prefill lines from original invoice
  useEffect(() => {
    if (origInvoice) {
      setValue('original_invoice_id', origInvoice.id);
      setValue('customer_id', origInvoice.customer_id);
      setValue('warehouse_id', origInvoice.warehouse_id);
      replace(
        (origInvoice.Lines || []).map(l => ({
          product_id: l.product_id,
          product_name: l.Product?.name,
          quantity: parseFloat(l.quantity),
          unit_price: parseFloat(l.unit_price),
          vat_rate: parseFloat(l.vat_rate || 0),
          cost_price: parseFloat(l.cost_price || 0),
          discount_rate: 0,
        }))
      );
    }
  }, [origInvoice, replace, setValue]);

  const subtotal = lines.reduce((s, l) => {
    const base = (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0);
    const vat = base * ((parseFloat(l.vat_rate) || 0) / 100);
    return s + base + vat;
  }, 0);

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      invoice_type: 'CREDIT_NOTE',
      status: 'DRAFT',
    };
    await createInvoice(payload).unwrap();
    navigate('/credit-notes');
  };

  const invoices = invoicesData?.data || [];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">New Credit Note</h1>
        <p className="text-sm text-gray-500 mt-0.5">Reverse a posted customer invoice</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="card">
          <div className="card-body grid grid-cols-2 gap-4">
            <FormField label="Original Invoice" error={errors.original_invoice_id?.message} required className="col-span-2">
              <select
                className="input"
                value={selectedInvoiceId}
                onChange={e => {
                  setSelectedInvoiceId(e.target.value);
                  setValue('original_invoice_id', e.target.value ? Number(e.target.value) : '');
                }}
              >
                <option value="">-- Select invoice to credit --</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.invoice_number} — {inv.Customer?.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Credit Note Date" error={errors.invoice_date?.message} required>
              <input type="date" {...register('invoice_date')} className="input" />
            </FormField>

            <FormField label="Reason for Return" error={errors.reason?.message} required>
              <input {...register('reason')} className="input" placeholder="Damaged goods, wrong product..." />
            </FormField>
          </div>
        </div>

        {fields.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-800">Return Lines</h3>
              <p className="text-xs text-gray-500">Adjust quantities to match what was actually returned</p>
            </div>
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-th">Product</th>
                      <th className="table-th text-right">Qty</th>
                      <th className="table-th text-right">Unit Price</th>
                      <th className="table-th text-right">VAT%</th>
                      <th className="table-th text-right">Total</th>
                      <th className="table-th" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {fields.map((field, i) => {
                      const base = (parseFloat(lines[i]?.quantity) || 0) * (parseFloat(lines[i]?.unit_price) || 0);
                      const lineTotal = base + base * ((parseFloat(lines[i]?.vat_rate) || 0) / 100);
                      return (
                        <tr key={field.id}>
                          <td className="table-td font-medium">{field.product_name}</td>
                          <td className="table-td">
                            <input type="number" step="0.001" {...register(`lines.${i}.quantity`)} className="input-sm w-24 text-right" />
                          </td>
                          <td className="table-td">
                            <input type="number" step="0.01" {...register(`lines.${i}.unit_price`)} className="input-sm w-28 text-right" />
                          </td>
                          <td className="table-td text-right text-gray-500">{lines[i]?.vat_rate}%</td>
                          <td className="table-td text-right font-semibold">{fmtCurrency(lineTotal)}</td>
                          <td className="table-td">
                            <button type="button" onClick={() => {
                              const updated = [...fields];
                              updated.splice(i, 1);
                              replace(updated);
                            }} className="text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td colSpan={4} className="table-td text-right font-semibold text-gray-800">Credit Total</td>
                      <td className="table-td text-right font-bold text-red-600 text-base">{fmtCurrency(subtotal)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/credit-notes')} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading || fields.length === 0} className="btn btn-primary">
            {isLoading ? 'Creating...' : 'Create Credit Note'}
          </button>
        </div>
      </form>
    </div>
  );
}
