import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectToken } from '../store/authSlice';
import { useCanAny } from '../hooks/usePermission';

export default function ProtectedRoute({ children, permission }) {
  const token = useSelector(selectToken);
  const perms = permission ? (Array.isArray(permission) ? permission : [permission]) : [];
  const can = useCanAny(...perms);

  if (!token) return <Navigate to="/login" replace />;
  if (permission && !can) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-5xl font-bold text-gray-200 mb-3">403</p>
          <p className="text-gray-500">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }
  return children;
}
