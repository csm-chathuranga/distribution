import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setCredentials, logout } from '../store/authSlice';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
    'Dashboard', 'Report', 'StockAdjustment', 'Notification',
  ],
  endpoints: () => ({}),
});
