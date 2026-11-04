import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownCircle, CheckCircle, XCircle, Bell } from 'lucide-react';
import { useGetChequesQuery, useDepositChequeMutation, useClearChequeMutation, useBounceChequesMutation, useReceiveChequeMutation } from '../../api/salesApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtDate } from '../../utils/format';

const daysPast = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
};

export default function ChequeList() {
  const canManage = usePermission('finance.payments');
  const [page, setPage] = useState(1);
  const [actionCheque, setActionCheque] = useState(null);
  const [actionType, setActionType] = useState(null);
  const { data, isLoading } = useGetChequesQuery({ page, limit: 20 });
  const [deposit, { isLoading: depositing }] = useDepositChequeMutation();
  const [clear, { isLoading: clearing }] = useClearChequeMutation();
  const [bounce, { isLoading: bouncing }] = useBounceChequesMutation();
  const [receive, { isLoading: receiving }] = useReceiveChequeMutation();

  const mutLoading = depositing || clearing || bouncing || receiving;

  const doAction = async () => {
    try {
      if (actionType === 'deposit') await deposit(actionCheque.id).unwrap();
      else if (actionType === 'clear') await clear(actionCheque.id).unwrap();
      else if (actionType === 'receive') await receive(actionCheque.id).unwrap();
      else await bounce(actionCheque.id).unwrap();
      toast.success(`Cheque ${actionType === 'deposit' ? 'deposited' : actionType === 'clear' ? 'cleared' : actionType === 'receive' ? 'marked as received & converted to cash' : 'bounced'}`);
      setActionCheque(null);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const ACTION_LABELS = { deposit: 'Deposit Cheque', clear: 'Clear Cheque', bounce: 'Mark as Bounced', receive: 'Mark as Received' };
  const ACTION_MESSAGES = {
    deposit: c => `Mark cheque ${c.cheque_number} as deposited to bank?`,
    clear: c => `Mark cheque ${c.cheque_number} as cleared?`,
    bounce: c => `Mark cheque ${c.cheque_number} as BOUNCED? This will create a reversal entry.`,
    receive: c => `Mark cheque ${c.cheque_number} as received? This will clear the cheque and convert it to cash in the bank account.`,
  };

  const overdueCount = (data?.data || []).filter(r => r.status === 'RECEIVED' && daysPast(r.cheque_date) >= 3).length;

  const columns = [
    { key: 'cheque_number', header: 'Cheque #', cell: r => <span className="font-mono font-medium">{r.cheque_number}</span> },
    { key: 'customer', header: 'Customer', cell: r => r.Receipt?.Customer?.name || '-' },
    { key: 'bank_name', header: 'Bank', cell: r => r.bank_name || '-' },
    {
      key: 'cheque_date', header: 'Cheque Date',
      cell: r => {
        const days = daysPast(r.cheque_date);
        const overdue = r.status === 'RECEIVED' && days >= 3;
        return (
          <div className="flex items-center gap-1.5">
            {fmtDate(r.cheque_date)}
            {overdue && <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">{days}d overdue</span>}
          </div>
        );
      },
    },
    { key: 'amount', header: 'Amount', cell: r => fmtCurrency(r.amount), className: 'text-right font-medium' },
    { key: 'status', header: 'Status', cell: r => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      cell: r => canManage && (
        <div className="flex items-center justify-end gap-1">
          {r.status === 'RECEIVED' && daysPast(r.cheque_date) >= 3 && (
            <button onClick={() => { setActionCheque(r); setActionType('receive'); }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 rounded-lg"
              title="Mark as Received & convert to cash">
              <Bell size={12} /> Mark Received
            </button>
          )}
          {r.status === 'RECEIVED' && <button onClick={() => { setActionCheque(r); setActionType('deposit'); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Deposit"><ArrowDownCircle size={14} /></button>}
          {r.status === 'DEPOSITED' && <button onClick={() => { setActionCheque(r); setActionType('clear'); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Clear"><CheckCircle size={14} /></button>}
          {(r.status === 'RECEIVED' || r.status === 'DEPOSITED') && <button onClick={() => { setActionCheque(r); setActionType('bounce'); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Bounce"><XCircle size={14} /></button>}
        </div>
      ),
    },
  ];

  return (
    <div className="card">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Cheques</h2>
        <p className="text-sm text-gray-500 mt-0.5">Track cheque lifecycle: Received → Deposited → Cleared / Bounced</p>
      </div>
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border-b border-orange-200 text-orange-800 text-sm font-medium">
          <Bell size={15} className="text-orange-500 shrink-0" />
          {overdueCount} cheque{overdueCount > 1 ? 's' : ''} {overdueCount > 1 ? 'are' : 'is'} overdue by 3+ days and need{overdueCount === 1 ? 's' : ''} to be received.
        </div>
      )}
      <Table columns={columns} data={data?.data} loading={isLoading} />
      <Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} />
      <ConfirmDialog
        open={!!actionCheque && !!actionType}
        title={ACTION_LABELS[actionType] || ''}
        message={actionCheque && actionType ? ACTION_MESSAGES[actionType]?.(actionCheque) : ''}
        confirmLabel={ACTION_LABELS[actionType]}
        onConfirm={doAction}
        onCancel={() => setActionCheque(null)}
        loading={mutLoading}
      />
    </div>
  );
}
