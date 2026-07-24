import { baseApi } from './baseApi';

export const authApi = baseApi.injectEndpoints({
  endpoints: b => ({
    login: b.mutation({
      query: body => ({ url: '/auth/login', method: 'POST', body }),
    }),
    getMe: b.query({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),
    changePassword: b.mutation({
      query: body => ({ url: '/auth/change-password', method: 'PUT', body }),
    }),
  }),
});

export const { useLoginMutation, useGetMeQuery, useChangePasswordMutation } = authApi;
