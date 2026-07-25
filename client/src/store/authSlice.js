import { createSlice } from '@reduxjs/toolkit';

const stored = () => {
  try { return JSON.parse(localStorage.getItem('auth') || 'null'); } catch { return null; }
};

const initialState = stored() || { token: null, refreshToken: null, user: null, permissions: [] };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, { payload }) {
      state.token = payload.token;
      state.refreshToken = payload.refresh_token ?? state.refreshToken;
      state.user = payload.user;
      state.permissions = payload.user?.Role?.Permissions?.map(p => p.code) || [];
      localStorage.setItem('auth', JSON.stringify(state));
    },
    logout(state) {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.permissions = [];
      localStorage.removeItem('auth');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = s => s.auth.user;
export const selectToken = s => s.auth.token;
export const selectRefreshToken = s => s.auth.refreshToken;
export const selectPermissions = s => s.auth.permissions;
export const selectCan = (state, permission) => {
  if (['super_admin', 'admin'].includes(state.auth.user?.Role?.name)) return true;
  return state.auth.permissions.includes(permission);
};
