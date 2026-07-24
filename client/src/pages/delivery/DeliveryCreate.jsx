import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateDeliveryMutation, useGetInvoicesQuery } from '../../api/salesApi';
import { useGetUsersQuery } from '../../api/settingsApi';
import { useGetRoutesQuery } from '../../api/customersApi';
import FormField from '../../components/ui/FormField';
import PageHeader from '../../components/ui/PageHeader';
import { today } from '../../utils/format';

const schema = yup.object({
  invoice_id:       yup.number().required('Invoice is required').typeError('Select an invoice'),
  driver_id:        yup.number().nullable().transform(v => v === '' ? null : Number(v)),
  route_id:         yup.number().nullable().transform(v => v === '' ? null : Number(v)),
  dn_date:          yup.string().required('Date is required'),
  delivery_address: yup.string().nullable(),
  notes:            yup.string().nullable(),
});

export default function DeliveryCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preInvoiceId = searchParams.get('invoice_id');

  const [create, { isLoading }] = useCreateDeliveryMutation();
  // Load both POSTED and PARTIAL invoices — partial means partly paid but still needs delivery
  const { data: p1 } = useGetInvoicesQuery({ status: 'POSTED',  limit: 500 });
  const { data: p2 } = useGetInvoicesQuery({ status: 'PARTIAL', limit: 500 });
  const invoicesData = { data: [...(p1?.data || []), ...(p2?.data || [])] };
  const { data: usersData }    = useGetUsersQuery({ limit: 200 });
  const { data: routesData }   = useGetRoutesQuery({ limit: 200 });

  const invoices = invoicesData?.data || [];
  const drivers  = (usersData?.data || []).filter(u => u.Role?.name === 'delivery');
  const routes   = routesData?.data || [];

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { dn_date: today(), invoice_id: preInvoiceId ? Number(preInvoiceId) : '' },
  });

  // When invoice changes, auto-fill route from customer's route
  const selectedInvoiceId = watch('invoice_id');
  useEffect(() => {
    if (!selectedInvoiceId) return;
    const inv = invoices.find(i => i.id === Number(selectedInvoiceId));
    if (inv?.Customer?.route_id) setValue('route_id', inv.Customer.route_id);
  }, [selectedInvoiceId, invoices, setValue]);

  const onSubmit = async (values) => {
    try {
      await create(values).unwrap();
      toast.success('Delivery note created');
      navigate('/deliveries');
    } catch (e) {
      toast.error(e.data?.message || 'Failed to create delivery note');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <PageHeader
        title="New Delivery Note"
        subtitle="Assign a posted invoice to a driver for delivery"
        onBack={() => navigate('/deliveries')}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="card">
        <div className="card-body space-y-4 p-6">

          {/* Invoice */}
          <FormField label="Invoice" error={errors.invoice_id?.message} required>
            <select {...register('invoice_id')} className="input">
              <option value="">-- Select Posted Invoice --</option>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} — {inv.Customer?.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* Driver */}
          <FormField label="Assign Driver" error={errors.driver_id?.message}>
            <select {...register('driver_id')} className="input">
              <option value="">-- Select Driver --</option>
              {drivers.length === 0 && (
                <option disabled>No drivers found (create delivery role users)</option>
              )}
              {drivers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </FormField>

          {/* Route */}
          <FormField label="Route" error={errors.route_id?.message}>
            <select {...register('route_id')} className="input">
              <option value="">-- Select Route (optional) --</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </FormField>

          {/* Date */}
          <FormField label="Delivery Date" error={errors.dn_date?.message} required>
            <input type="date" {...register('dn_date')} className="input" />
          </FormField>

          {/* Address */}
          <FormField label="Delivery Address" error={errors.delivery_address?.message}>
            <textarea
              {...register('delivery_address')}
              rows={2}
              className="input"
              placeholder="Leave blank to use customer address"
            />
          </FormField>

          {/* Notes */}
          <FormField label="Notes" error={errors.notes?.message}>
            <textarea
              {...register('notes')}
              rows={2}
              className="input"
              placeholder="Special delivery instructions..."
            />
          </FormField>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <button type="button" onClick={() => navigate('/deliveries')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-2">
            <Truck size={15} />
            {isLoading ? 'Creating...' : 'Create Delivery Note'}
          </button>
        </div>
      </form>
    </div>
  );
}
