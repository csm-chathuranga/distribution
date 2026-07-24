import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Navigation } from 'lucide-react';
import { useGetLoadingSheetsQuery, useLoadLoadingSheetMutation } from '../../api/salesApi';
import Table from '../../components/ui/Table';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtDate } from '../../utils/format';
import { usePermission } from '../../hooks/usePermission';

export default function LoadingSheetList() {
  const navigate = useNavigate();
  const canCreate = usePermission('sales.create');
  const [loadTarget, setLoadTarget] = useState(null);

  const { data, isLoading } = useGetLoadingSheetsQuery({});
  const [loadSheet, { isLoading: loading }] = useLoadLoadingSheetMutation();

  const rows = data?.data || [];

  const handleLoad = async () => {
    await loadSheet(loadTarget.id).unwrap();
    setLoadTarget(null);
  };

  const columns = [
    { header: 'Sheet #',      key: 'sheet_number',       cell: r => <span className="font-mono text-xs font-semibold text-gray-800">{r.sheet_number}</span> },
    { header: 'Date',         key: 'sheet_date',         cell: r => fmtDate(r.sheet_date) },
    { header: 'Sales Rep',    key: 'sales_rep',          cell: r => r.SalesRep?.name || '—' },
    { header: 'Route',        key: 'route',              cell: r => r.Route?.name || '—' },
    { header: 'Vehicle',      key: 'vehicle_number',     cell: r => r.vehicle_number || '—' },
    { header: 'Loaded Value', key: 'total_loaded_value', cell: r => fmtCurrency(r.total_loaded_value) },
    { header: 'Status',       key: 'status',             cell: r => <StatusBadge status={r.status} /> },
    {
      header: 'Actions',      key: 'actions',
      cell: r => (
        <div className="flex gap-1">
          <button onClick={() => navigate(`/loading-sheets/${r.id}`)} className="btn btn-sm btn-secondary">View</button>
          {r.status === 'DRAFT' && canCreate && (
            <button onClick={() => setLoadTarget(r)} className="btn btn-sm bg-purple-600 text-white hover:bg-purple-700">Load Van</button>
          )}
          {r.status === 'LOADED' && canCreate && (
            <button onClick={() => navigate(`/loading-sheets/${r.id}`)} className="btn btn-sm bg-green-600 text-white hover:bg-green-700">Close</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Loading Sheets</h1>
          <p className="text-sm text-gray-500 mt-0.5">Van loading and day-end reconciliation</p>
        </div>
        {canCreate && (
          <button onClick={() => navigate('/loading-sheets/new')} className="btn btn-primary">
            <Plus size={16} /> New Loading Sheet
          </button>
        )}
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={rows}
          loading={isLoading}
          emptyComponent={<EmptyState icon={Navigation} title="No loading sheets" description="Create a loading sheet to dispatch a van" action={canCreate ? { label: 'New Loading Sheet', onClick: () => navigate('/loading-sheets/new') } : null} />}
        />
      </div>

      <ConfirmDialog
        open={!!loadTarget}
        onCancel={() => setLoadTarget(null)}
        onConfirm={handleLoad}
        loading={loading}
        variant="info"
        title="Load Van"
        confirmLabel="Load Van"
        loadingLabel="Loading..."
        message={`Load ${loadTarget?.sheet_number}? This will deduct stock from the warehouse for all items on this sheet.`}
      />
    </div>
  );
}
