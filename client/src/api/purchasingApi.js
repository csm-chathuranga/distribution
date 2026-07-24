import { baseApi } from './baseApi';

export const purchasingApi = baseApi.injectEndpoints({
  endpoints: b => ({
    getPOs: b.query({ query: params => ({ url: '/purchase-orders', params }), providesTags: ['PurchaseOrder'] }),
    getPO: b.query({ query: id => `/purchase-orders/${id}`, providesTags: (r,e,id) => [{ type:'PurchaseOrder', id }] }),
    createPO: b.mutation({ query: body => ({ url: '/purchase-orders', method: 'POST', body }), invalidatesTags: ['PurchaseOrder'] }),
    updatePO: b.mutation({ query: ({ id, ...body }) => ({ url: `/purchase-orders/${id}`, method: 'PUT', body }), invalidatesTags: ['PurchaseOrder'] }),
    approvePO: b.mutation({ query: id => ({ url: `/purchase-orders/${id}/approve`, method: 'PUT' }), invalidatesTags: ['PurchaseOrder'] }),

    getGRNs: b.query({ query: params => ({ url: '/goods-received', params }), providesTags: ['GoodsReceived'] }),
    getGRN: b.query({ query: id => `/goods-received/${id}`, providesTags: (r,e,id) => [{ type:'GoodsReceived', id }] }),
    createGRN: b.mutation({ query: body => ({ url: '/goods-received', method: 'POST', body }), invalidatesTags: ['GoodsReceived', 'Stock'] }),
    postGRN: b.mutation({ query: id => ({ url: `/goods-received/${id}/post`, method: 'POST' }), invalidatesTags: ['GoodsReceived', 'Stock'] }),

    getSupplierReturns: b.query({ query: params => ({ url: '/supplier-returns', params }), providesTags: ['SupplierReturn'] }),
    getSupplierReturn: b.query({ query: id => `/supplier-returns/${id}`, providesTags: (r,e,id) => [{ type:'SupplierReturn', id }] }),
    createSupplierReturn: b.mutation({ query: body => ({ url: '/supplier-returns', method: 'POST', body }), invalidatesTags: ['SupplierReturn'] }),
    postSupplierReturn: b.mutation({ query: id => ({ url: `/supplier-returns/${id}/post`, method: 'PUT' }), invalidatesTags: ['SupplierReturn', 'Stock', 'Journal'] }),

    getSupplierPayments: b.query({ query: params => ({ url: '/payments', params }), providesTags: ['Payment'] }),
    getSupplierPayment: b.query({ query: id => `/payments/${id}`, providesTags: (r,e,id) => [{ type:'Payment', id }] }),
    createSupplierPayment: b.mutation({ query: body => ({ url: '/payments', method: 'POST', body }), invalidatesTags: ['Payment', 'GoodsReceived'] }),
    cancelSupplierPayment: b.mutation({ query: id => ({ url: `/payments/${id}/cancel`, method: 'POST' }), invalidatesTags: ['Payment', 'GoodsReceived'] }),
    getOpenGRNs: b.query({ query: supplier_id => `/payments/open-grns/${supplier_id}`, providesTags: (r,e,id) => [{ type:'GoodsReceived', id }] }),
  }),
});

export const {
  useGetPOsQuery, useGetPOQuery, useCreatePOMutation, useUpdatePOMutation, useApprovePOMutation,
  useGetGRNsQuery, useGetGRNQuery, useCreateGRNMutation, usePostGRNMutation,
  useGetSupplierReturnsQuery, useGetSupplierReturnQuery, useCreateSupplierReturnMutation, usePostSupplierReturnMutation,
  useGetSupplierPaymentsQuery, useGetSupplierPaymentQuery, useCreateSupplierPaymentMutation,
  useCancelSupplierPaymentMutation, useGetOpenGRNsQuery,
} = purchasingApi;
