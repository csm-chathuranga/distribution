import { baseApi } from './baseApi';

export const financeApi = baseApi.injectEndpoints({
  endpoints: b => ({
    getAccounts: b.query({ query: params => ({ url: '/accounts', params }), providesTags: ['Account'] }),
    getAccount: b.query({ query: id => `/accounts/${id}`, providesTags: (r,e,id) => [{ type:'Account', id }] }),
    getAccountLedger: b.query({ query: ({ id, ...params }) => ({ url: `/accounts/${id}/ledger`, params }), providesTags: (r,e,{id}) => [{ type:'Account', id }] }),
    getTrialBalance: b.query({ query: params => ({ url: '/accounts/trial-balance', params }), providesTags: ['Account'] }),
    createAccount: b.mutation({ query: body => ({ url: '/accounts', method: 'POST', body }), invalidatesTags: ['Account'] }),
    updateAccount: b.mutation({ query: ({ id, ...body }) => ({ url: `/accounts/${id}`, method: 'PUT', body }), invalidatesTags: ['Account'] }),

    setOpeningBalance: b.mutation({ query: body => ({ url: '/accounts/opening-balance', method: 'POST', body }), invalidatesTags: ['Account', 'Journal'] }),

    getJournals: b.query({ query: params => ({ url: '/journals', params }), providesTags: ['Journal'] }),
    getJournal: b.query({ query: id => `/journals/${id}`, providesTags: (r,e,id) => [{ type:'Journal', id }] }),
    createJournal: b.mutation({ query: body => ({ url: '/journals', method: 'POST', body }), invalidatesTags: ['Journal', 'Account'] }),
  }),
});

export const {
  useGetAccountsQuery, useGetAccountQuery, useGetAccountLedgerQuery, useGetTrialBalanceQuery,
  useCreateAccountMutation, useUpdateAccountMutation, useSetOpeningBalanceMutation,
  useGetJournalsQuery, useGetJournalQuery, useCreateJournalMutation,
} = financeApi;
