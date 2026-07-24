import { useState } from 'react';
import { Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetUnitsQuery, useCreateUnitMutation, useUpdateUnitMutation } from '../../api/productsApi';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';

export default function UnitList() {
  const canCreate = usePermission('inventory.create');
  const [modal, setModal] = useState(null); // null | { id?, name, abbreviation }
  const { data: units, isLoading } = useGetUnitsQuery();
  const [createUnit, { isLoading: creating }] = useCreateUnitMutation();
  const [updateUnit, { isLoading: updating }] = useUpdateUnitMutation();

  const saving = creating || updating;

  const openNew = () => setModal({ name: '', abbreviation: '' });
  const openEdit = (u) => setModal({ id: u.id, name: u.name, abbreviation: u.abbreviation });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (modal.id) {
        await updateUnit({ id: modal.id, name: modal.name, abbreviation: modal.abbreviation }).unwrap();
        toast.success('Unit updated');
      } else {
        await createUnit({ name: modal.name, abbreviation: modal.abbreviation }).unwrap();
        toast.success('Unit created');
      }
      setModal(null);
    } catch (err) { toast.error(err.data?.message || 'Failed'); }
  };

  const columns = [
    { key: 'name', header: 'Name', cell: r => <span className="font-medium">{r.name}</span> },
    { key: 'abbreviation', header: 'Abbreviation', cell: r => <span className="font-mono text-primary-700 bg-primary-50 px-2 py-0.5 rounded text-sm">{r.abbreviation}</span> },
    {
      key: 'actions', header: '', className: 'text-right',
      cell: r => canCreate && (
        <button onClick={() => openEdit(r)} className="text-xs text-primary-600 hover:underline">Edit</button>
      ),
    },
  ];

  return (
    <div className="card">
      <PageHeader title="Units of Measure" onNew={canCreate ? openNew : null} newLabel="New Unit" />
      <Table columns={columns} data={units} loading={isLoading} emptyText="No units found" />

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-base font-semibold">{modal.id ? 'Edit Unit' : 'New Unit'}</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="form-label">Name</label>
                <input
                  className="input"
                  value={modal.name}
                  onChange={e => setModal(m => ({ ...m, name: e.target.value }))}
                  placeholder="e.g. Kilogram"
                  required
                />
              </div>
              <div>
                <label className="form-label">Abbreviation</label>
                <input
                  className="input"
                  value={modal.abbreviation}
                  onChange={e => setModal(m => ({ ...m, abbreviation: e.target.value }))}
                  placeholder="e.g. kg"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn btn-ghost btn-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
