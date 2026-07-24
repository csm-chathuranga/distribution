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
  }),
});

export const {
  useGetWarehousesQuery, useGetWarehouseQuery, useGetWarehouseStockQuery,
  useCreateWarehouseMutation, useUpdateWarehouseMutation,
} = warehousesApi;
