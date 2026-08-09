import { baseApi } from './baseApi';

export const vehiclesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getVehicles: build.query({
      query: (params = {}) => ({ url: '/vehicles', params }),
      providesTags: ['Vehicle'],
    }),
    createVehicle: build.mutation({
      query: (body) => ({ url: '/vehicles', method: 'POST', body }),
      invalidatesTags: ['Vehicle'],
    }),
    updateVehicle: build.mutation({
      query: ({ id, ...body }) => ({ url: `/vehicles/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Vehicle'],
    }),
  }),
});

export const { useGetVehiclesQuery, useCreateVehicleMutation, useUpdateVehicleMutation } = vehiclesApi;
