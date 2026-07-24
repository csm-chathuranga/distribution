import { baseApi } from './baseApi';

export const settingsApi = baseApi.injectEndpoints({
  endpoints: b => ({
    login: b.mutation({ query: body => ({ url: '/auth/login', method: 'POST', body }) }),
    me: b.query({ query: () => '/auth/me', providesTags: ['User'] }),

    getUsers: b.query({ query: params => ({ url: '/users', params }), providesTags: ['User'] }),
    getUser: b.query({ query: id => `/users/${id}`, providesTags: (r,e,id) => [{ type:'User', id }] }),
    createUser: b.mutation({ query: body => ({ url: '/users', method: 'POST', body }), invalidatesTags: ['User'] }),
    updateUser: b.mutation({ query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PUT', body }), invalidatesTags: ['User'] }),
    deleteUser: b.mutation({ query: id => ({ url: `/users/${id}`, method: 'DELETE' }), invalidatesTags: ['User'] }),
    setUserPermissions: b.mutation({ query: ({ id, permissions }) => ({ url: `/users/${id}/permissions`, method: 'PUT', body: { permissions } }), invalidatesTags: ['User'] }),

    getRoles: b.query({ query: () => '/roles', providesTags: ['Role'] }),
    getRole: b.query({ query: id => `/roles/${id}`, providesTags: (r,e,id) => [{ type:'Role', id }] }),
    createRole: b.mutation({ query: body => ({ url: '/roles', method: 'POST', body }), invalidatesTags: ['Role'] }),
    updateRole: b.mutation({ query: ({ id, ...body }) => ({ url: `/roles/${id}`, method: 'PUT', body }), invalidatesTags: ['Role'] }),
    setRolePermissions: b.mutation({ query: ({ id, permissionIds }) => ({ url: `/roles/${id}/permissions`, method: 'PUT', body: { permission_ids: permissionIds } }), invalidatesTags: ['Role'] }),
    getAllPermissions: b.query({ query: () => '/roles/permissions', providesTags: ['Role'] }),

    getBranches: b.query({ query: params => ({ url: '/branches', params }), providesTags: ['Branch'] }),
    createBranch: b.mutation({ query: body => ({ url: '/branches', method: 'POST', body }), invalidatesTags: ['Branch'] }),
    updateBranch: b.mutation({ query: ({ id, ...body }) => ({ url: `/branches/${id}`, method: 'PUT', body }), invalidatesTags: ['Branch'] }),
  }),
});

export const {
  useLoginMutation, useMeQuery,
  useGetUsersQuery, useGetUserQuery, useCreateUserMutation, useUpdateUserMutation, useDeleteUserMutation, useSetUserPermissionsMutation,
  useGetRolesQuery, useGetRoleQuery, useCreateRoleMutation, useUpdateRoleMutation, useSetRolePermissionsMutation, useGetAllPermissionsQuery,
  useGetBranchesQuery, useCreateBranchMutation, useUpdateBranchMutation,
} = settingsApi;
