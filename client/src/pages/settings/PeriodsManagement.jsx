import { useState } from 'react';
import { Plus, Lock, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetPeriodsQuery, useCreatePeriodMutation, useClosePeriodMutation, useReopenPeriodMutation } from '../../api/reportsApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import PageHeader from '../../components/ui/PageHeader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatusBadge from '../../components/ui/StatusBadge';
import { fmtDate } from '../../utils/format';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function PeriodsManagement() {
  const canManage = usePermission('finance.close_period');
  const { data, isLoading } = useGetPeriodsQuery();
  const [createPeriod, { isLoading: creating }] = useCreatePeriodMutation();
  const [closePeriod, { isLoading: closing }] = useClosePeriodMutation();
  const [reopenPeriod, { isLoading: reopening }] = useReopenPeriodMutation();
  const [action, setAction] = useState(null); // { type: 'close'|'reopen', period }
  const [newModal, setNewModal] = useState(false);
  const now = new Date();
  const [newYear, setNewYear] = useState(now.getFullYear());
  const [newMonth, setNewMonth] = useState(now.getMonth() + 1);

  const handleAction = async () => {
    try {
      if (action.type === 'close') {
        await closePeriod(action.period.id).unwrap();
        toast.success(`Period ${MONTHS[action.period.month - 1]} ${action.period.year} closed`);
      } else {
        await reopenPeriod(action.period.id).unwrap();
        toast.success(`Period ${MONTHS[action.period.month - 1]} ${action.period.year} reopened`);
      }
      setAction(null);
    } catch (err) { toast.error(err.data?.message || 'Failed'); }
  };

  const handleCreate = async () => {
    try {
      await createPeriod({ year: newYear, month: newMonth }).unwrap();
      toast.success('Period opened');
      setNewModal(false);
    } catch (err) { toast.error(err.data?.message || 'Failed'); }
  };

  const columns = [
    {
      key: 'period', header: 'Period',
      cell: r => <span className="font-medium">{MONTHS[r.month - 1]} {r.year}</span>,
    },
    {
      key: 'status', header: 'Status',
      cell: r => <StatusBadge status={r.is_open ? 'OPEN' : 'CLOSED'} />,
    },
    { key: 'opened_at', header: 'Opened', cell: r => fmtDate(r.opened_at) },
    { key: 'closed_at', header: 'Closed', cell: r => r.closed_at ? fmtDate(r.closed_at) : '—' },
    {
      key: 'actions', header: '', className: 'text-right',
      cell: r => canManage && (
        r.is_open
          ? <button onClick={() => setAction({ type: 'close', period: r })} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"><Lock size={12} /> Close</button>
          : <button onClick={() => setAction({ type: 'reopen', period: r })} className="inline-flex items-center gap-1 text-xs text-green-600 hover:underline"><Unlock size={12} /> Reopen</button>
      ),
    },
  ];

  return (
    <div className="card">
      <PageHeader title="Accounting Periods" onNew={canManage ? () => setNewModal(true) : null} newLabel="Open Period" />
      <Table columns={columns} data={data?.data} loading={isLoading} emptyText="No accounting periods found" />

      <ConfirmDialog
        open={!!action}
        title={action?.type === 'close' ? 'Close Period' : 'Reopen Period'}
        message={action?.type === 'close'
          ? `Close ${MONTHS[(action?.period?.month || 1) - 1]} ${action?.period?.year}? No new journals will be allowed in this period.`
          : `Reopen ${MONTHS[(action?.period?.month || 1) - 1]} ${action?.period?.year}?`}
        confirmLabel={action?.type === 'close' ? 'Close Period' : 'Reopen'}
        onConfirm={handleAction}
        onCancel={() => setAction(null)}
        loading={closing || reopening}
      />

      {newModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-base font-semibold">Open New Period</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Year</label>
                <input type="number" value={newYear} onChange={e => setNewYear(Number(e.target.value))} className="input" min={2020} max={2030} />
              </div>
              <div>
                <label className="form-label">Month</label>
                <select value={newMonth} onChange={e => setNewMonth(Number(e.target.value))} className="input">
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setNewModal(false)} className="btn btn-ghost btn-sm">Cancel</button>
                <button onClick={handleCreate} disabled={creating} className="btn btn-primary btn-sm">
                  {creating ? 'Opening…' : 'Open Period'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
