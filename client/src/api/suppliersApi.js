import { baseApi } from './baseApi';

export const suppliersApi = baseApi.injectEndpoints({
  endpoints: b => ({
    getSuppliers: b.query({
      query: params => ({ url: '/suppliers', params }),
      providesTags: ['Supplier'],
    }),
    getSupplier: b.query({ query: id => `/suppliers/${id}`, providesTags: (r,e,id) => [{ type:'Supplier', id }] }),
    createSupplier: b.mutation({ query: body => ({ url: '/suppliers', method: 'POST', body }), invalidatesTags: ['Supplier'] }),
    updateSupplier: b.mutation({ query: ({ id, ...body }) => ({ url: `/suppliers/${id}`, method: 'PUT', body }), invalidatesTags: ['Supplier'] }),
  }),
});

export const { useGetSuppliersQuery, useGetSupplierQuery, useCreateSupplierMutation, useUpdateSupplierMutation } = suppliersApi;
