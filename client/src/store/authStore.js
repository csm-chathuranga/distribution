import { create } from 'zustand';
import api from '../api/axios';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  permissions: new Set(JSON.parse(localStorage.getItem('permissions') || '[]')),

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('permissions', JSON.stringify(data.user.Role?.Permissions?.map(p => p.code) || []));
    set({
      token: data.token,
      user: data.user,
      permissions: new Set(data.user.Role?.Permissions?.map(p => p.code) || []),
    });
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    set({ token: null, user: null, permissions: new Set() });
  },

  can: (permission) => {
    const { user, permissions } = get();
    if (user?.Role?.name === 'super_admin') return true;
    return permissions.has(permission);
  },
}));

export default useAuthStore;
