import { baseApi } from './baseApi';

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: b => ({
    // Stock Adjustments
    getStockAdjustments: b.query({
      query: params => ({ url: '/stock-adjustments', params }),
      providesTags: ['StockAdjustment'],
    }),
    getStockAdjustment: b.query({
      query: id => `/stock-adjustments/${id}`,
      providesTags: (r, e, id) => [{ type: 'StockAdjustment', id }],
    }),
    createStockAdjustment: b.mutation({
      query: body => ({ url: '/stock-adjustments', method: 'POST', body }),
      invalidatesTags: ['StockAdjustment'],
    }),
    approveStockAdjustment: b.mutation({
      query: id => ({ url: `/stock-adjustments/${id}/approve`, method: 'POST' }),
      invalidatesTags: ['StockAdjustment', 'Stock'],
    }),
    cancelStockAdjustment: b.mutation({
      query: id => ({ url: `/stock-adjustments/${id}/cancel`, method: 'POST' }),
      invalidatesTags: ['StockAdjustment'],
    }),
    // Stock Transfers
    getStockTransfers: b.query({
      query: params => ({ url: '/stock-transfers', params }),
      providesTags: ['StockTransfer'],
    }),
    getStockTransfer: b.query({
      query: id => `/stock-transfers/${id}`,
      providesTags: (r, e, id) => [{ type: 'StockTransfer', id }],
    }),
    createStockTransfer: b.mutation({
      query: body => ({ url: '/stock-transfers', method: 'POST', body }),
      invalidatesTags: ['StockTransfer'],
    }),
    dispatchStockTransfer: b.mutation({
      query: id => ({ url: `/stock-transfers/${id}/dispatch`, method: 'PUT' }),
      invalidatesTags: ['StockTransfer', 'Stock'],
    }),
    receiveStockTransfer: b.mutation({
      query: id => ({ url: `/stock-transfers/${id}/receive`, method: 'PUT' }),
      invalidatesTags: ['StockTransfer', 'Stock'],
    }),
    setOpeningStock: b.mutation({
      query: body => ({ url: '/stock/opening', method: 'POST', body }),
      invalidatesTags: ['Stock', 'StockAdjustment'],
    }),
  }),
});

export const {
  useGetStockAdjustmentsQuery, useGetStockAdjustmentQuery,
  useCreateStockAdjustmentMutation, useApproveStockAdjustmentMutation, useCancelStockAdjustmentMutation,
  useGetStockTransfersQuery, useGetStockTransferQuery,
  useCreateStockTransferMutation, useDispatchStockTransferMutation, useReceiveStockTransferMutation,
  useSetOpeningStockMutation,
} = inventoryApi;
