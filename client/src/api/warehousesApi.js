import { baseApi } from './baseApi';

export const warehousesApi = baseApi.injectEndpoints({
  endpoints: b => ({
    getWarehouses: b.query({
      query: params => ({ url: '/warehouses', params }),
      providesTags: ['Warehouse'],
    }),
    getWarehouse: b.query({
      query: id => `/warehouses/${id}`,
      providesTags: (r, e, id) => [{ type: 'Warehouse', id }],
    }),
    getWarehouseStock: b.query({
      query: id => `/warehouses/${id}/stock`,
      providesTags: (r, e, id) => [{ type: 'Stock', id }],
    }),
    createWarehouse: b.mutation({
      query: body => ({ url: '/warehouses', method: 'POST', body }),
      invalidatesTags: ['Warehouse'],
    }),
    updateWarehouse: b.mutation({
      query: ({ id, ...body }) => ({ url: `/warehouses/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Warehouse'],
    }),
    getWarehouseUsers: b.query({
      query: id => `/warehouses/${id}/users`,
      providesTags: (r, e, id) => [{ type: 'WarehouseUser', id }],
    }),
    assignWarehouseUser: b.mutation({
      query: ({ warehouseId, userId }) => ({ url: `/warehouses/${warehouseId}/users`, method: 'POST', body: { user_id: userId } }),
      invalidatesTags: (r, e, { warehouseId }) => [{ type: 'WarehouseUser', id: warehouseId }],
    }),
    removeWarehouseUser: b.mutation({
      query: ({ warehouseId, userId }) => ({ url: `/warehouses/${warehouseId}/users/${userId}`, method: 'DELETE' }),
      invalidatesTags: (r, e, { warehouseId }) => [{ type: 'WarehouseUser', id: warehouseId }],
    }),
  }),
});

export const {
  useGetWarehousesQuery, useGetWarehouseQuery, useGetWarehouseStockQuery,
  useCreateWarehouseMutation, useUpdateWarehouseMutation,
  useGetWarehouseUsersQuery, useAssignWarehouseUserMutation, useRemoveWarehouseUserMutation,
} = warehousesApi;
