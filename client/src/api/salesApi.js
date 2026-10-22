import { baseApi } from './baseApi';

export const salesApi = baseApi.injectEndpoints({
  endpoints: b => ({
    getSalesOrders: b.query({ query: params => ({ url: '/sales-orders', params }), providesTags: ['SalesOrder'] }),
    getSalesOrder: b.query({ query: id => `/sales-orders/${id}`, providesTags: (r,e,id) => [{ type:'SalesOrder', id }] }),
    createSalesOrder: b.mutation({ query: body => ({ url: '/sales-orders', method: 'POST', body }), invalidatesTags: ['SalesOrder', 'FreeAlloc', 'Stock'] }),
    confirmSalesOrder: b.mutation({ query: id => ({ url: `/sales-orders/${id}/confirm`, method: 'PUT' }), invalidatesTags: ['SalesOrder'] }),
    invoiceSalesOrder: b.mutation({ query: id => ({ url: `/sales-orders/${id}/invoice`, method: 'POST' }), invalidatesTags: ['SalesOrder', 'Invoice'] }),

    getInvoices: b.query({ query: params => ({ url: '/invoices', params }), providesTags: ['Invoice'] }),
    getInvoice: b.query({ query: id => `/invoices/${id}`, providesTags: (r,e,id) => [{ type:'Invoice', id }] }),
    createInvoice: b.mutation({ query: body => ({ url: '/invoices', method: 'POST', body }), invalidatesTags: ['Invoice'] }),
    postInvoice: b.mutation({ query: id => ({ url: `/invoices/${id}/post`, method: 'POST' }), invalidatesTags: ['Invoice', 'Stock', 'Journal'] }),
    deliverInvoice: b.mutation({ query: id => ({ url: `/invoices/${id}/deliver`, method: 'PUT' }), invalidatesTags: ['Invoice', 'LoadingSheet'] }),
    cancelInvoice: b.mutation({ query: ({ id, reason }) => ({ url: `/invoices/${id}/cancel`, method: 'PUT', body: { reason } }), invalidatesTags: ['Invoice', 'LoadingSheet'] }),

    getReceipts: b.query({ query: params => ({ url: '/receipts', params }), providesTags: ['Receipt'] }),
    getReceipt: b.query({ query: id => `/receipts/${id}`, providesTags: (r,e,id) => [{ type: 'Receipt', id }] }),
    createReceipt: b.mutation({ query: body => ({ url: '/receipts', method: 'POST', body }), invalidatesTags: ['Receipt', 'Invoice', 'Journal', 'Customer'] }),
    getMyCollections: b.query({ query: params => ({ url: '/receipts/my', params }), providesTags: ['Receipt'] }),
    getCustomerAdvance: b.query({ query: customerId => `/receipts/advance/${customerId}`, providesTags: ['Receipt'] }),
    allocateReceipt: b.mutation({ query: ({ id, ...body }) => ({ url: `/receipts/${id}/allocate`, method: 'POST', body }), invalidatesTags: ['Receipt', 'Invoice'] }),

    getCheques: b.query({ query: params => ({ url: '/cheques', params }), providesTags: ['Cheque'] }),
    depositCheque: b.mutation({ query: id => ({ url: `/cheques/${id}/deposit`, method: 'PUT' }), invalidatesTags: ['Cheque'] }),
    clearCheque: b.mutation({ query: id => ({ url: `/cheques/${id}/clear`, method: 'PUT' }), invalidatesTags: ['Cheque'] }),
    bounceCheques: b.mutation({ query: id => ({ url: `/cheques/${id}/bounce`, method: 'PUT' }), invalidatesTags: ['Cheque'] }),

    getPayments: b.query({ query: params => ({ url: '/payments', params }), providesTags: ['Payment'] }),
    createPayment: b.mutation({ query: body => ({ url: '/payments', method: 'POST', body }), invalidatesTags: ['Payment', 'Journal'] }),

    getExpenses: b.query({ query: params => ({ url: '/expenses', params }), providesTags: ['Expense'] }),
    createExpense: b.mutation({ query: body => ({ url: '/expenses', method: 'POST', body }), invalidatesTags: ['Expense', 'Journal'] }),

    getDeliveries: b.query({ query: params => ({ url: '/deliveries', params }), providesTags: ['Delivery'] }),
    getDelivery: b.query({ query: id => `/deliveries/${id}`, providesTags: (r,e,id) => [{ type:'Delivery', id }] }),
    createDelivery: b.mutation({ query: body => ({ url: '/deliveries', method: 'POST', body }), invalidatesTags: ['Delivery'] }),
    dispatchDelivery: b.mutation({ query: ({ id, ...body }) => ({ url: `/deliveries/${id}/dispatch`, method: 'PUT', body }), invalidatesTags: ['Delivery'] }),
    deliverDelivery: b.mutation({ query: ({ id, ...body }) => ({ url: `/deliveries/${id}/deliver`, method: 'PUT', body }), invalidatesTags: ['Delivery'] }),
    returnDelivery: b.mutation({ query: ({ id, ...body }) => ({ url: `/deliveries/${id}/return`, method: 'PUT', body }), invalidatesTags: ['Delivery'] }),

    getLoadingSheets: b.query({ query: params => ({ url: '/loading-sheets', params }), providesTags: ['LoadingSheet'] }),
    getLoadingSheet: b.query({ query: id => `/loading-sheets/${id}`, providesTags: (r,e,id) => [{ type:'LoadingSheet', id }, 'LoadingSheet'] }),
    getActiveSheet: b.query({ query: () => '/loading-sheets/active', providesTags: ['LoadingSheet'] }),
    getVanStock: b.query({ query: id => `/loading-sheets/${id}/van-stock`, providesTags: (r,e,id) => [{ type:'LoadingSheet', id }] }),
    createLoadingSheet: b.mutation({ query: body => ({ url: '/loading-sheets', method: 'POST', body }), invalidatesTags: ['LoadingSheet', 'Stock'] }),
    loadLoadingSheet: b.mutation({ query: id => ({ url: `/loading-sheets/${id}/load`, method: 'PUT' }), invalidatesTags: ['LoadingSheet', 'Stock'] }),
    closeLoadingSheet: b.mutation({ query: ({ id, ...body }) => ({ url: `/loading-sheets/${id}/close`, method: 'PUT', body }), invalidatesTags: ['LoadingSheet', 'Stock', 'Invoice'] }),
    deleteLoadingSheet: b.mutation({ query: id => ({ url: `/loading-sheets/${id}`, method: 'DELETE' }), invalidatesTags: ['LoadingSheet'] }),
    getAvailableInvoices: b.query({ query: sheetId => `/loading-sheets/${sheetId}/available-invoices`, providesTags: ['Invoice'] }),
    getAvailableInvoicesForNew: b.query({ query: () => '/loading-sheets/available-invoices', providesTags: ['Invoice'] }),
    addInvoicesToSheet: b.mutation({ query: ({ id, invoice_ids }) => ({ url: `/loading-sheets/${id}/invoices`, method: 'PUT', body: { invoice_ids } }), invalidatesTags: ['LoadingSheet', 'Invoice'] }),
    removeInvoiceFromSheet: b.mutation({ query: ({ sheetId, invoiceId }) => ({ url: `/loading-sheets/${sheetId}/invoices/${invoiceId}`, method: 'DELETE' }), invalidatesTags: ['LoadingSheet', 'Invoice'] }),
    updateLoadingSheet: b.mutation({ query: ({ id, ...body }) => ({ url: `/loading-sheets/${id}`, method: 'PATCH', body }), invalidatesTags: ['LoadingSheet'] }),

    getFreeAllocations: b.query({ query: () => '/free-allocations', providesTags: ['FreeAlloc'] }),
    createFreeAllocation: b.mutation({ query: body => ({ url: '/free-allocations', method: 'POST', body }), invalidatesTags: ['FreeAlloc'] }),
    topupFreeAllocation: b.mutation({ query: ({ id, ...body }) => ({ url: `/free-allocations/${id}/topup`, method: 'PUT', body }), invalidatesTags: ['FreeAlloc'] }),
    distributeFreeItems: b.mutation({ query: ({ id, ...body }) => ({ url: `/free-allocations/${id}/distribute`, method: 'POST', body }), invalidatesTags: ['FreeAlloc', 'Stock'] }),
    getFreeAllocationHistory: b.query({ query: id => `/free-allocations/${id}/history`, providesTags: (r, e, id) => [{ type: 'FreeAlloc', id }] }),

    getCustomerReturns: b.query({ query: params => ({ url: '/customer-returns', params }), providesTags: ['CustomerReturn'] }),
    getCustomerReturn: b.query({ query: id => `/customer-returns/${id}`, providesTags: (r,e,id) => [{ type:'CustomerReturn', id }] }),
    createCustomerReturn: b.mutation({ query: body => ({ url: '/customer-returns', method: 'POST', body }), invalidatesTags: ['CustomerReturn'] }),
    confirmCustomerReturn: b.mutation({ query: id => ({ url: `/customer-returns/${id}/confirm`, method: 'PUT' }), invalidatesTags: ['CustomerReturn', 'Stock'] }),
    cancelCustomerReturn: b.mutation({ query: id => ({ url: `/customer-returns/${id}/cancel`, method: 'PUT' }), invalidatesTags: ['CustomerReturn'] }),
  }),
});

export const {
  useGetSalesOrdersQuery, useGetSalesOrderQuery, useCreateSalesOrderMutation, useConfirmSalesOrderMutation, useInvoiceSalesOrderMutation,
  useGetInvoicesQuery, useGetInvoiceQuery, useCreateInvoiceMutation, usePostInvoiceMutation, useDeliverInvoiceMutation,
  useGetReceiptsQuery, useGetReceiptQuery, useCreateReceiptMutation, useGetMyCollectionsQuery, useGetCustomerAdvanceQuery, useAllocateReceiptMutation,
  useGetChequesQuery, useDepositChequeMutation, useClearChequeMutation, useBounceChequesMutation,
  useGetPaymentsQuery, useCreatePaymentMutation,
  useGetExpensesQuery, useCreateExpenseMutation,
  useGetDeliveriesQuery, useGetDeliveryQuery, useCreateDeliveryMutation, useDispatchDeliveryMutation, useDeliverDeliveryMutation, useReturnDeliveryMutation,
  useGetLoadingSheetsQuery, useGetLoadingSheetQuery, useGetActiveSheetQuery, useGetVanStockQuery, useCreateLoadingSheetMutation, useLoadLoadingSheetMutation, useCloseLoadingSheetMutation, useDeleteLoadingSheetMutation, useGetAvailableInvoicesQuery, useGetAvailableInvoicesForNewQuery, useAddInvoicesToSheetMutation, useRemoveInvoiceFromSheetMutation, useUpdateLoadingSheetMutation,
  useGetFreeAllocationsQuery, useCreateFreeAllocationMutation, useTopupFreeAllocationMutation, useDistributeFreeItemsMutation, useGetFreeAllocationHistoryQuery,
  useGetCustomerReturnsQuery, useGetCustomerReturnQuery, useCreateCustomerReturnMutation, useConfirmCustomerReturnMutation, useCancelCustomerReturnMutation,
  useCancelInvoiceMutation,
} = salesApi;
