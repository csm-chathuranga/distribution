import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Navigation, Truck, RotateCcw, ChevronRight, Calendar, MapPin, Car } from 'lucide-react';
import { useGetLoadingSheetsQuery, useLoadLoadingSheetMutation } from '../../api/salesApi';
import Table from '../../components/ui/Table';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtDate } from '../../utils/format';
import { usePermission } from '../../hooks/usePermission';

const STATUS_STYLE = {
  DRAFT:  { bar: '#f59e0b', bg: '#fffbeb' },
  LOADED: { bar: '#3b82f6', bg: '#eff6ff' },
  CLOSED: { bar: '#10b981', bg: '#f0fdf4' },
};

export default function LoadingSheetList() {
  const navigate = useNavigate();
  const canCreate = usePermission('sales.create');
  const canLoadVan = usePermission('sales.approve');
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
      header: 'Actions', key: 'actions',
      cell: r => (
        <div className="flex gap-1">
          <button onClick={() => navigate(`/loading-sheets/${r.id}`)} className="btn btn-sm btn-secondary">View</button>
          {r.status === 'DRAFT' && canLoadVan && (
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
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Loading Sheets</h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Van loading and day-end reconciliation</p>
        </div>
        {canCreate && (
          <button onClick={() => navigate('/loading-sheets/new')} className="btn btn-primary flex-shrink-0">
            <Plus size={16} /> <span className="hidden sm:inline">New Loading Sheet</span><span className="sm:hidden">New</span>
          </button>
        )}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block card">
        <Table
          columns={columns}
          data={rows}
          loading={isLoading}
          emptyComponent={
            <EmptyState icon={Navigation} title="No loading sheets"
              description="Create a loading sheet to dispatch a van"
              action={canCreate ? { label: 'New Loading Sheet', onClick: () => navigate('/loading-sheets/new') } : null}
            />
          }
        />
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 animate-pulse overflow-hidden">
                <div className="h-1 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <div className="skeleton h-4 w-32" />
                    <div className="skeleton h-5 w-16 rounded-full" />
                  </div>
                  <div className="skeleton h-3 w-48" />
                  <div className="skeleton h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Navigation size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No loading sheets</p>
            {canCreate && (
              <button onClick={() => navigate('/loading-sheets/new')} className="mt-4 btn btn-primary">
                <Plus size={15} /> New Loading Sheet
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(r => {
              const st = STATUS_STYLE[r.status] || { bar: '#6b7280', bg: '#f9fafb' };
              return (
                <div key={r.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm active:opacity-75 transition-opacity cursor-pointer"
                  onClick={() => navigate(`/loading-sheets/${r.id}`)}>

                  {/* Coloured top bar */}
                  <div className="h-1" style={{ background: st.bar }} />

                  <div className="p-4">
                    {/* Row 1: sheet number + status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-gray-900 font-mono text-sm">{r.sheet_number}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <Calendar size={11} />
                          {fmtDate(r.sheet_date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={r.status} />
                        <ChevronRight size={16} className="text-gray-300" />
                      </div>
                    </div>

                    {/* Row 2: Route + Vehicle */}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                      {r.Route?.name && (
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin size={11} className="text-gray-400" /> {r.Route.name}
                        </span>
                      )}
                      {r.vehicle_number && (
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <Car size={11} className="text-gray-400" /> {r.vehicle_number}
                        </span>
                      )}
                      {r.SalesRep?.name && (
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <Truck size={11} className="text-gray-400" /> {r.SalesRep.name}
                        </span>
                      )}
                    </div>

                    {/* Row 3: Loaded value + action buttons */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Loaded Value</p>
                        <p className="font-bold text-gray-900 font-mono text-sm">{fmtCurrency(r.total_loaded_value)}</p>
                      </div>
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        {r.status === 'DRAFT' && canLoadVan && (
                          <button onClick={() => setLoadTarget(r)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-opacity active:opacity-80"
                            style={{ background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' }}>
                            <Truck size={13} /> Load Van
                          </button>
                        )}
                        {r.status === 'LOADED' && canCreate && (
                          <button onClick={() => navigate(`/loading-sheets/${r.id}`)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-opacity active:opacity-80"
                            style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)' }}>
                            <RotateCcw size={13} /> Day-End
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
