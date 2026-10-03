import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setCredentials, logout } from '../store/authSlice';
import { enqueueRequest, getQueueCount } from '../utils/offlineQueue';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Mutations queued when offline — driver can create these without internet
const QUEUEABLE_PATHS = ['/invoices', '/customer-returns', '/sales-orders'];

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

// On 401: try to refresh the access token once, then retry the original request.
// If the refresh also fails, dispatch logout() — ProtectedRoute redirects to /login.
let isRefreshing = false;

const baseQueryWithReauth = async (args, api, extraOptions) => {
  // --- Offline queue interception ---
  if (!navigator.onLine) {
    const method = typeof args === 'string' ? 'GET' : (args.method || 'GET');
    const url    = typeof args === 'string' ? args  : args.url;
    const isQueuable = ['POST', 'PUT'].includes(method)
      && QUEUEABLE_PATHS.some(p => url?.startsWith(p));

    if (isQueuable) {
      try {
        await enqueueRequest({
          id:        crypto.randomUUID(),
          url,
          method,
          body:      typeof args === 'string' ? undefined : args.body,
          timestamp: Date.now(),
        });
      } catch { /* IndexedDB unavailable — fall through to network attempt */ }
      return { data: { __queued: true } };
    }
  }
  // ----------------------------------

  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && !isRefreshing) {
    const refreshToken = api.getState().auth.refreshToken;

    if (refreshToken) {
      isRefreshing = true;
      try {
        const refreshResult = await rawBaseQuery(
          { url: '/auth/refresh', method: 'POST', body: { refresh_token: refreshToken } },
          api,
          extraOptions,
        );

        if (refreshResult.data) {
          api.dispatch(setCredentials(refreshResult.data));
          // Retry the original request with the new access token
          result = await rawBaseQuery(args, api, extraOptions);
        } else {
          api.dispatch(logout());
        }
      } finally {
        isRefreshing = false;
      }
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: [
    'Auth', 'User', 'Role', 'Branch',
    'Account', 'Journal', 'Period',
    'Category', 'Unit', 'Product', 'Warehouse', 'Stock',
    'Supplier', 'Customer', 'Route',
    'PurchaseOrder', 'GoodsReceived',
    'SalesOrder', 'Invoice', 'Receipt', 'Payment', 'Cheque', 'Expense',
    'Dashboard', 'Report', 'StockAdjustment', 'Notification', 'Vehicle',
  ],
  endpoints: () => ({}),
});
