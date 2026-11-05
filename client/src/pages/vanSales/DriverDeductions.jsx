import { useState } from 'react';
import { CheckCircle, Search, PackageSearch } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetDriverDeductionsQuery, useSettleDeductionMutation, useFoundDeductionMutation } from '../../api/driverDeductionsApi';
import { useGetUsersForSelectQuery } from '../../api/settingsApi';
import { fmtCurrency, fmtDate } from '../../utils/format';

const STATUS_STYLES = {
  PENDING:  'bg-amber-100 text-amber-800',
  SETTLED:  'bg-green-100 text-green-800',
  FOUND:    'bg-blue-100 text-blue-800',
};

export default function DriverDeductions() {
  const [driverId, setDriverId]   = useState('');
  const [status, setStatus]       = useState('');
  const [noteModal, setNoteModal] = useState(null); // { id, action: 'settle'|'found' }
  const [noteText, setNoteText]   = useState('');

  const { data, isLoading } = useGetDriverDeductionsQuery(
    { driver_id: driverId || undefined, status: status || undefined },
    { refetchOnMountOrArgChange: true }
  );
  const { data: drivers = [] } = useGetUsersForSelectQuery('driver');

  const [settle] = useSettleDeductionMutation();
  const [found]  = useFoundDeductionMutation();

  const rows = data?.data || [];
  const totalPending = rows.filter(r => r.status === 'PENDING').reduce((s, r) => s + parseFloat(r.amount), 0);

  const openNote = (id, action) => { setNoteModal({ id, action }); setNoteText(''); };
  const closeNote = () => setNoteModal(null);

  const handleConfirm = async () => {
    if (noteModal.action === 'found' && !noteText.trim()) {
      toast.error('Note is required when marking as found'); return;
    }
    try {
      if (noteModal.action === 'settle') {
        await settle({ id: noteModal.id, notes: noteText || undefined }).unwrap();
        toast.success('Marked as settled');
      } else {
        await found({ id: noteModal.id, notes: noteText }).unwrap();
        toast.success('Marked as found');
      }
      closeNote();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Driver Deductions</h1>
          <p className="page-subtitle">Lost stock deductions charged to drivers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Driver</label>
            <select value={driverId} onChange={e => setDriverId(e.target.value)} className="input w-48">
              <option value="">All Drivers</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input w-36">
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="SETTLED">Settled</option>
              <option value="FOUND">Found</option>
            </select>
          </div>
          {(!status || status === 'PENDING') && rows.length > 0 && (
            <div className="ml-auto text-right">
              <div className="text-xs text-gray-500">Total Pending</div>
              <div className="text-lg font-bold text-amber-600">{fmtCurrency(totalPending)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Driver</th>
                <th>Sheet</th>
                <th>Product</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Unit Cost</th>
                <th className="text-right">Amount</th>
                <th className="text-center">Status</th>
                <th>Notes</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    <PackageSearch className="mx-auto mb-2" size={28} />
                    No deductions found
                  </td>
                </tr>
              )}
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="text-sm">{fmtDate(row.created_at)}</td>
                  <td className="font-medium">{row.Driver?.name || '—'}</td>
                  <td className="text-sm text-blue-600">{row.LoadingSheet?.sheet_number || '—'}</td>
                  <td className="text-sm">{row.Product?.name || '—'}</td>
                  <td className="text-center">{parseFloat(row.quantity)}</td>
                  <td className="text-right text-sm">{fmtCurrency(row.unit_cost)}</td>
                  <td className="text-right font-semibold">{fmtCurrency(row.amount)}</td>
                  <td className="text-center">
                    <span className={`badge ${STATUS_STYLES[row.status]}`}>{row.status}</span>
                  </td>
                  <td className="text-sm text-gray-500 max-w-xs truncate">{row.notes || '—'}</td>
                  <td className="text-center">
                    {row.status === 'PENDING' && (
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => openNote(row.id, 'settle')}
                          className="btn-xs btn-primary"
                          title="Mark as settled (deducted from salary)"
                        >
                          Settle
                        </button>
                        <button
                          onClick={() => openNote(row.id, 'found')}
                          className="btn-xs btn-secondary"
                          title="Item was found — cancel deduction"
                        >
                          Found
                        </button>
                      </div>
                    )}
                    {row.status === 'SETTLED' && (
                      <span className="text-xs text-gray-400">{fmtDate(row.settled_date)}</span>
                    )}
                    {row.status === 'FOUND' && (
                      <span className="text-xs text-gray-400">{fmtDate(row.found_date)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note modal */}
      {noteModal && (
        <div className="modal-backdrop">
          <div className="modal-box max-w-sm">
            <h3 className="text-lg font-semibold mb-3">
              {noteModal.action === 'settle' ? 'Settle Deduction' : 'Mark as Found'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {noteModal.action === 'settle'
                ? 'Confirm this amount has been deducted from the driver\'s salary.'
                : 'The lost item was found. Add a note explaining what happened.'}
            </p>
            <div className="mb-4">
              <label className="label">{noteModal.action === 'found' ? 'Note (required)' : 'Note (optional)'}</label>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                className="input"
                rows={3}
                placeholder={noteModal.action === 'found' ? 'e.g. Found at depot on 06/11/2026' : 'e.g. Deducted in November payroll'}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={closeNote} className="btn-secondary">Cancel</button>
              <button
                onClick={handleConfirm}
                className={noteModal.action === 'settle' ? 'btn-primary' : 'btn-secondary'}
              >
                <CheckCircle size={14} className="mr-1" />
                {noteModal.action === 'settle' ? 'Confirm Settled' : 'Confirm Found'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
