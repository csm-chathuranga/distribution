import { baseApi } from './baseApi';

export const customersApi = baseApi.injectEndpoints({
  endpoints: b => ({
    getCustomers: b.query({ query: params => ({ url: '/customers', params }), providesTags: ['Customer'] }),
    getCustomer: b.query({ query: id => `/customers/${id}`, providesTags: (r,e,id) => [{ type:'Customer', id }] }),
    getCustomerProfile: b.query({ query: id => `/customers/${id}/profile`, providesTags: (r,e,id) => [{ type:'Customer', id }] }),
    createCustomer: b.mutation({ query: body => ({ url: '/customers', method: 'POST', body }), invalidatesTags: ['Customer'] }),
    updateCustomer: b.mutation({ query: ({ id, ...body }) => ({ url: `/customers/${id}`, method: 'PUT', body }), invalidatesTags: ['Customer'] }),
    getRoutes: b.query({ query: params => ({ url: '/routes', params }), providesTags: ['Route'] }),
    createRoute: b.mutation({ query: body => ({ url: '/routes', method: 'POST', body }), invalidatesTags: ['Route'] }),
    updateRoute: b.mutation({ query: ({ id, ...body }) => ({ url: `/routes/${id}`, method: 'PUT', body }), invalidatesTags: ['Route'] }),
    getRouteCustomers: b.query({ query: id => `/routes/${id}/customers`, providesTags: (r,e,id) => [{ type:'Route', id }] }),
    updateVisitOrder: b.mutation({ query: ({ id, order }) => ({ url: `/routes/${id}/visit-order`, method: 'PUT', body: { order } }), invalidatesTags: ['Route', 'Customer'] }),
  }),
});

export const {
  useGetCustomersQuery, useGetCustomerQuery, useGetCustomerProfileQuery,
  useCreateCustomerMutation, useUpdateCustomerMutation,
  useGetRoutesQuery, useCreateRouteMutation, useUpdateRouteMutation,
  useGetRouteCustomersQuery, useUpdateVisitOrderMutation,
} = customersApi;
