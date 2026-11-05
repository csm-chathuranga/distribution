import { baseApi } from './baseApi';

export const driverDeductionsApi = baseApi.injectEndpoints({
  endpoints: b => ({
    getDriverDeductions: b.query({ query: params => ({ url: '/driver-deductions', params }), providesTags: ['DriverDeduction'] }),
    settleDeduction: b.mutation({ query: ({ id, ...body }) => ({ url: `/driver-deductions/${id}/settle`, method: 'PUT', body }), invalidatesTags: ['DriverDeduction'] }),
    foundDeduction: b.mutation({ query: ({ id, ...body }) => ({ url: `/driver-deductions/${id}/found`, method: 'PUT', body }), invalidatesTags: ['DriverDeduction'] }),
  }),
});

export const { useGetDriverDeductionsQuery, useSettleDeductionMutation, useFoundDeductionMutation } = driverDeductionsApi;
