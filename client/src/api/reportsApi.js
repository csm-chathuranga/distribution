import { baseApi } from './baseApi';

export const reportsApi = baseApi.injectEndpoints({
  endpoints: b => ({
    getDashboard: b.query({ query: () => '/dashboard', providesTags: ['Dashboard'] }),
    getDashboardTrend: b.query({ query: (days = 30) => ({ url: '/dashboard/trend', params: { days } }), providesTags: ['Dashboard'] }),
    getSalesSummary: b.query({ query: params => ({ url: '/reports/sales-summary', params }), providesTags: ['Report'] }),
    getAgedDebtors: b.query({ query: () => '/reports/aged-debtors', providesTags: ['Report'] }),
    getStockMovement: b.query({ query: params => ({ url: '/reports/stock-movement', params }), providesTags: ['Report'] }),
    getProfitLoss: b.query({ query: params => ({ url: '/reports/profit-loss', params }), providesTags: ['Report'] }),
    getLowStock: b.query({ query: () => '/reports/low-stock', providesTags: ['Stock'] }),
    getVatSummary: b.query({ query: params => ({ url: '/reports/vat-summary', params }), providesTags: ['Report'] }),
    getCustomerStatement: b.query({ query: ({ customerId, ...params }) => ({ url: `/reports/customer-statement/${customerId}`, params }), providesTags: ['Report'] }),
    getProductProfitability: b.query({ query: params => ({ url: '/reports/product-profitability', params }), providesTags: ['Report'] }),
    getReorderSuggestions: b.query({ query: () => '/reports/reorder-suggestions', providesTags: ['Stock'] }),
    getSalesRepKpi: b.query({ query: params => ({ url: '/reports/sales-rep-kpi', params }), providesTags: ['Report'] }),
    getStockMatrix: b.query({ query: () => '/reports/stock-matrix', providesTags: ['Report', 'Stock'] }),
    getFastMovers: b.query({ query: params => ({ url: '/reports/fast-movers', params }), providesTags: ['Report'] }),
    getBestRoutes: b.query({ query: params => ({ url: '/reports/best-routes', params }), providesTags: ['Report'] }),
    getCustomerRanking: b.query({ query: params => ({ url: '/reports/customer-ranking', params }), providesTags: ['Report'] }),
    getAgedCreditors: b.query({ query: () => '/reports/aged-creditors', providesTags: ['Report'] }),
    getPeriods: b.query({ query: () => '/periods', providesTags: ['Period'] }),
    createPeriod: b.mutation({ query: body => ({ url: '/periods', method: 'POST', body }), invalidatesTags: ['Period'] }),
    closePeriod: b.mutation({ query: id => ({ url: `/periods/${id}/close`, method: 'PUT' }), invalidatesTags: ['Period'] }),
    reopenPeriod: b.mutation({ query: id => ({ url: `/periods/${id}/reopen`, method: 'PUT' }), invalidatesTags: ['Period'] }),
    getCompany: b.query({ query: () => '/branches/company', providesTags: ['Company'] }),
    updateCompany: b.mutation({ query: body => ({ url: '/branches/company', method: 'PUT', body }), invalidatesTags: ['Company'] }),
  }),
});

export const {
  useGetDashboardQuery, useGetDashboardTrendQuery,
  useGetSalesSummaryQuery, useGetAgedDebtorsQuery,
  useGetStockMovementQuery, useGetProfitLossQuery, useGetLowStockQuery,
  useGetVatSummaryQuery, useGetCustomerStatementQuery,
  useGetProductProfitabilityQuery, useGetReorderSuggestionsQuery, useGetSalesRepKpiQuery,
  useGetStockMatrixQuery, useGetFastMoversQuery, useGetBestRoutesQuery, useGetCustomerRankingQuery,
  useGetAgedCreditorsQuery,
  useGetPeriodsQuery, useCreatePeriodMutation, useClosePeriodMutation, useReopenPeriodMutation,
  useGetCompanyQuery, useUpdateCompanyMutation,
} = reportsApi;
