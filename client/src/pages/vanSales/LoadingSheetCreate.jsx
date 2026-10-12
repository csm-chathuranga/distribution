import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateLoadingSheetMutation, useGetAvailableInvoicesForNewQuery, useAddInvoicesToSheetMutation } from '../../api/salesApi';
import { useGetProductsQuery } from '../../api/productsApi';
import { useGetWarehousesQuery } from '../../api/warehousesApi';
import { useGetRoutesQuery } from '../../api/customersApi';
import { useGetUsersForSelectQuery } from '../../api/settingsApi';
import { useGetVehiclesQuery } from '../../api/vehiclesApi';
import { useGetStockOnHandQuery } from '../../api/inventoryApi';
import FormField from '../../components/ui/FormField';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { today, fmtCurrency, fmtDate } from '../../utils/format';
import { usePermission } from '../../hooks/usePermission';

const schema = yup.object({
  sheet_date: yup.string().required('Date is required'),
  route_id: yup.number().required('Route is required').typeError('Select a route'),
  warehouse_id: yup.number().required('Warehouse is required').typeError('Select a warehouse'),
  sales_rep_id: yup.number().required('Sales rep is required').typeError('Select a sales rep'),
  driver_id: yup.number().required('Driver is required').typeError('Select a driver'),
  vehicle_id: yup.number().required('Vehicle is required').typeError('Select a vehicle'),
  lines: yup.array().of(yup.object({
    product_id: yup.number().required().typeError('Select a product'),
    loaded_quantity: yup.number().positive('Must be > 0').required(),
    unit_cost: yup.number().min(0).required(),
  })).min(1, 'Add at least one product'),
});

export default function LoadingSheetCreate() {
  const navigate   = useNavigate();
  const canApprove = usePermission('sales.approve');

  const [create,      { isLoading }]          = useCreateLoadingSheetMutation();
  const [addInvoices, { isLoading: linking }] = useAddInvoicesToSheetMutation();
  const [selectedInvIds, setSelectedInvIds]   = useState(new Set());

  const { data: availableInvoices = [], isLoading: loadingInvoices } = useGetAvailableInvoicesForNewQuery(undefined, { skip: !canApprove });

  const toggleInv = id => setSelectedInvIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAllInv = () => {
    if (selectedInvIds.size === availableInvoices.length) setSelectedInvIds(new Set());
    else setSelectedInvIds(new Set(availableInvoices.map(i => i.id)));
  };

  const { data: productsData }  = useGetProductsQuery({ limit: 500 });
  const { data: warehousesData } = useGetWarehousesQuery({});
  const { data: routesData }    = useGetRoutesQuery({});
  const { data: drivers = [] }   = useGetUsersForSelectQuery('delivery');
  const { data: allSelectUsers = [] } = useGetUsersForSelectQuery(null);
  const salesReps = allSelectUsers.filter(u => ['sales_rep', 'manager', 'admin'].includes(u.Role?.name));
  const { data: vehiclesData }  = useGetVehiclesQuery({});

  const products   = productsData?.data || [];
  const warehouses = warehousesData?.data || [];
  const routes     = routesData?.data || [];
  const vehicles   = (vehiclesData?.data || []).filter(v => v.status === 'active');

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { sheet_date: today(), lines: [{ product_id: '', loaded_quantity: 1, unit_cost: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines       = watch('lines');
  const warehouseId = watch('warehouse_id');

  const { data: stockData } = useGetStockOnHandQuery(
    { warehouse_id: warehouseId, limit: 1000 },
    { skip: !warehouseId },
  );
  // Map product_id → available quantity for fast lookup
  const stockMap = (stockData?.data || []).reduce((m, s) => {
    m[s.product_id] = parseFloat(s.quantity || 0);
    return m;
  }, {});

  const handleProductChange = (index, productId) => {
    const product = products.find(p => p.id === Number(productId));
    if (product) {
      setValue(`lines.${index}.unit_cost`, parseFloat(product.cost_price) || 0);
    }
  };

  const totalValue  = lines.reduce((s, l) => s + (parseFloat(l.loaded_quantity) || 0) * (parseFloat(l.unit_cost) || 0), 0);
  const hasOverStock = lines.some(l => {
    const avail = stockMap[Number(l.product_id)];
    return avail !== undefined && (parseFloat(l.loaded_quantity) || 0) > avail;
  });

  const onSubmit = async (values) => {
    try {
      const sheet = await create(values).unwrap();
      if (selectedInvIds.size > 0) {
        await addInvoices({ id: sheet.id, invoice_ids: [...selectedInvIds] }).unwrap();
      }
      toast.success('Loading sheet created');
      navigate(`/loading-sheets/${sheet.id}`);
    } catch (e) {
      toast.error(e.data?.message || e.message || 'Failed to create loading sheet');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">New Loading Sheet</h1>
        <p className="text-sm text-gray-500 mt-0.5">Load a van with stock for delivery</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Header info */}
        <div className="card">
          <div className="card-body grid grid-cols-2 gap-4">
            <FormField label="Date" error={errors.sheet_date?.message} required>
              <input type="date" {...register('sheet_date')} className="input" />
            </FormField>
            <FormField label="Vehicle" error={errors.vehicle_id?.message} required>
              <select {...register('vehicle_id')} className="input">
                <option value="">-- Select Vehicle --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number}{v.make ? ` — ${v.make} ${v.model || ''}`.trimEnd() : ''}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Route" error={errors.route_id?.message} required>
              <select {...register('route_id')} className="input">
                <option value="">-- Select Route --</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </FormField>
            <FormField label="Warehouse" error={errors.warehouse_id?.message} required>
              <select {...register('warehouse_id')} className="input">
                <option value="">-- Select Warehouse --</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </FormField>
            <FormField label="Sales Rep" error={errors.sales_rep_id?.message} required>
              <select {...register('sales_rep_id')} className="input">
                <option value="">-- Select Sales Rep --</option>
                {salesReps.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </FormField>
            <FormField label="Driver" error={errors.driver_id?.message} required>
              <select {...register('driver_id')} className="input">
                <option value="">-- Select Driver --</option>
                {drivers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </FormField>
          </div>
        </div>

        {/* Products */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-800">Products to Load</h3>
            <button type="button" onClick={() => append({ product_id: '', loaded_quantity: 1, unit_cost: 0 })} className="btn btn-sm btn-secondary">
              <Plus size={14} /> Add Line
            </button>
          </div>
          <div className="card-body">
            {errors.lines && <p className="text-sm text-red-600 mb-3">{errors.lines.message}</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-th">Product</th>
                    <th className="table-th text-right">Available</th>
                    <th className="table-th text-right">Qty to Load</th>
                    <th className="table-th text-right">Unit Cost (LKR)</th>
                    <th className="table-th text-right">Total</th>
                    <th className="table-th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {fields.map((field, i) => {
                    const lineTotal  = (parseFloat(lines[i]?.loaded_quantity) || 0) * (parseFloat(lines[i]?.unit_cost) || 0);
                    const productId  = Number(lines[i]?.product_id);
                    const available  = productId ? (stockMap[productId] ?? null) : null;
                    const loadQty    = parseFloat(lines[i]?.loaded_quantity) || 0;
                    const overStock  = available !== null && loadQty > available;
                    return (
                      <tr key={field.id} className={overStock ? 'bg-red-50' : ''}>
                        <td className="table-td">
                          <Controller
                            name={`lines.${i}.product_id`}
                            control={control}
                            render={({ field }) => (
                              <SearchableSelect
                                value={field.value}
                                onChange={val => {
                                  field.onChange(val);
                                  handleProductChange(i, val);
                                }}
                                options={products.map(p => ({ value: p.id, label: `${p.sku} — ${p.name}` }))}
                                placeholder="-- Product --"
                                error={errors.lines?.[i]?.product_id?.message}
                              />
                            )}
                          />
                        </td>
                        <td className="table-td text-right">
                          {available === null ? (
                            <span className="text-gray-300 text-xs">—</span>
                          ) : (
                            <span className={`text-xs font-semibold ${available === 0 ? 'text-red-600' : overStock ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {available}
                            </span>
                          )}
                        </td>
                        <td className="table-td">
                          <input type="number" step="0.001" {...register(`lines.${i}.loaded_quantity`)}
                            className={`input-sm w-24 text-right ${overStock ? 'border-red-400 focus:ring-red-400' : ''}`}
                            onFocus={e => e.target.select()} />
                          {overStock && <p className="text-red-500 text-[10px] mt-0.5">Exceeds stock</p>}
                        </td>
                        <td className="table-td">
                          <input type="number" step="0.01" {...register(`lines.${i}.unit_cost`)} className="input-sm w-28 text-right" onFocus={e => e.target.select()} />
                        </td>
                        <td className="table-td text-right font-semibold">{fmtCurrency(lineTotal)}</td>
                        <td className="table-td">
                          <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td colSpan={3} className="table-td text-right font-semibold text-gray-700">Total Loaded Value</td>
                    <td className="table-td text-right font-bold text-primary-700 text-base">{fmtCurrency(totalValue)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Link Invoices — admin/manager only */}
        {canApprove && (
          <div className="card">
            <div className="card-header flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Link Invoices</h3>
                <p className="text-xs text-gray-400 mt-0.5">Attach posted invoices to this loading sheet</p>
              </div>
              {availableInvoices.length > 0 && (
                <button type="button" onClick={toggleAllInv}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-800">
                  <CheckSquare size={13} />
                  {selectedInvIds.size === availableInvoices.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>

            {loadingInvoices ? (
              <div className="p-6 text-center text-sm text-gray-400">Loading invoices…</div>
            ) : availableInvoices.length === 0 ? (
              <div className="p-8 text-center">
                <FileText size={28} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No unassigned posted invoices available</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {availableInvoices.map(inv => (
                  <label key={inv.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedInvIds.has(inv.id) ? 'bg-primary-50/40' : ''}`}>
                    <input type="checkbox" checked={selectedInvIds.has(inv.id)} onChange={() => toggleInv(inv.id)}
                      className="w-4 h-4 accent-primary-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-primary-700">{inv.invoice_number}</span>
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">POSTED</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        <span>{inv.Customer?.name || '—'}</span>
                        <span>{fmtDate(inv.invoice_date)}</span>
                      </div>
                    </div>
                    <span className="font-bold text-gray-800 font-mono text-sm flex-shrink-0">{fmtCurrency(inv.total_amount)}</span>
                  </label>
                ))}
              </div>
            )}

            {selectedInvIds.size > 0 && (
              <div className="px-4 py-2.5 bg-primary-50 border-t border-primary-100 text-xs font-semibold text-primary-700">
                {selectedInvIds.size} invoice{selectedInvIds.size !== 1 ? 's' : ''} selected · {fmtCurrency(
                  availableInvoices.filter(i => selectedInvIds.has(i.id)).reduce((s, i) => s + parseFloat(i.total_amount), 0)
                )} total
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/loading-sheets')} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading || linking || hasOverStock} className="btn btn-primary disabled:opacity-50">
            {isLoading || linking ? 'Creating...' : 'Create Loading Sheet'}
          </button>
          {hasOverStock && <p className="text-sm text-red-600 self-center">Fix quantities exceeding available stock</p>}
        </div>
      </form>
    </div>
  );
}
