import { useSelector } from 'react-redux';
import { selectCurrentUser, selectPermissions } from '../store/authSlice';

export function usePermission(permission) {
  const user = useSelector(selectCurrentUser);
  const permissions = useSelector(selectPermissions);
  if (!user) return false;
  if (['super_admin', 'admin'].includes(user.Role?.name)) return true;
  if (!permission) return true;
  return permissions.includes(permission);
}

export function useCanAny(...perms) {
  const user = useSelector(selectCurrentUser);
  const permissions = useSelector(selectPermissions);
  if (!user) return false;
  if (['super_admin', 'admin'].includes(user.Role?.name)) return true;
  return perms.some(p => permissions.includes(p));
}
