import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CheckSquare, Square } from 'lucide-react';
import { useGetRolesQuery, useGetAllPermissionsQuery, useSetRolePermissionsMutation } from '../../api/settingsApi';
import { usePermission } from '../../hooks/usePermission';
import Modal from '../../components/ui/Modal';

const MODULE_LABELS = {
  inventory: 'Inventory', purchase: 'Purchasing', sales: 'Sales',
  finance: 'Finance', reports: 'Reports', settings: 'Settings',
};

function PermissionMatrix({ role, allPermissions, onClose }) {
  const [setPerms, { isLoading }] = useSetRolePermissionsMutation();
  const [selected, setSelected] = useState(new Set(role.Permissions?.map(p => p.id) || []));

  const grouped = allPermissions.reduce((acc, p) => {
    const [mod] = p.code.split('.');
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {});

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleModule = (perms) => {
    const allSelected = perms.every(p => selected.has(p.id));
    setSelected(prev => {
      const next = new Set(prev);
      perms.forEach(p => allSelected ? next.delete(p.id) : next.add(p.id));
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await setPerms({ id: role.id, permissionIds: [...selected] }).unwrap();
      toast.success('Permissions updated');
      onClose();
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <Modal open={true} onClose={onClose} title={`Permissions — ${role.display_name}`} size="lg">
      <div className="space-y-4">
        {Object.entries(grouped).map(([mod, perms]) => {
          const allSelected = perms.every(p => selected.has(p.id));
          const someSelected = perms.some(p => selected.has(p.id));
          return (
            <div key={mod} className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleModule(perms)}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b hover:bg-gray-100 transition-colors text-left"
              >
                {allSelected ? <CheckSquare size={16} className="text-primary-600" /> : someSelected ? <CheckSquare size={16} className="text-gray-400" /> : <Square size={16} className="text-gray-400" />}
                <span className="font-semibold text-sm text-gray-700">{MODULE_LABELS[mod] || mod}</span>
                <span className="ml-auto text-xs text-gray-500">{perms.filter(p => selected.has(p.id)).length}/{perms.length}</span>
              </button>
              <div className="grid grid-cols-2 gap-0 divide-y divide-gray-100">
                {perms.map(p => (
                  <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="rounded text-primary-600 focus:ring-primary-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">{p.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{p.code}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={isLoading} className="btn-primary">{isLoading ? 'Saving...' : 'Save Permissions'}</button>
      </div>
    </Modal>
  );
}

export default function RoleList() {
  const canManage = usePermission('settings.roles');
  const [editingRole, setEditingRole] = useState(null);
  const { data: rolesData, isLoading } = useGetRolesQuery({});
  const { data: allPerms } = useGetAllPermissionsQuery();
  const roles = rolesData?.data || [];
  const permissions = allPerms || [];

  const ROLE_COLORS = { super_admin: 'bg-red-100 text-red-800', admin: 'bg-orange-100 text-orange-800', manager: 'bg-amber-100 text-amber-800', accountant: 'bg-blue-100 text-blue-800', sales_rep: 'bg-green-100 text-green-800', warehouse: 'bg-cyan-100 text-cyan-800', driver: 'bg-purple-100 text-purple-800', cashier: 'bg-indigo-100 text-indigo-800' };

  return (
    <div className="card">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Roles & Permissions</h2>
        <p className="text-sm text-gray-500 mt-0.5">Click on a role to manage its permissions</p>
      </div>
      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="p-4 grid grid-cols-1 gap-3">
          {roles.map(role => (
            <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${ROLE_COLORS[role.name] || 'bg-gray-100 text-gray-700'}`}>{role.name}</span>
                <div>
                  <div className="font-semibold text-gray-900">{role.display_name}</div>
                  <div className="text-sm text-gray-500">{role.Permissions?.length || 0} permissions</div>
                </div>
              </div>
              {canManage && role.name !== 'super_admin' && (
                <button onClick={() => setEditingRole(role)} className="btn-secondary text-sm">Manage Permissions</button>
              )}
              {role.name === 'super_admin' && <span className="text-xs text-gray-400 italic">All permissions (bypass)</span>}
            </div>
          ))}
        </div>
      )}
      {editingRole && (
        <PermissionMatrix role={editingRole} allPermissions={permissions} onClose={() => setEditingRole(null)} />
      )}
    </div>
  );
}
