import { baseApi } from './baseApi';

export const productsApi = baseApi.injectEndpoints({
  endpoints: b => ({
    getProducts: b.query({
      query: params => ({ url: '/products', params }),
      providesTags: (r) => r ? [...r.data.map(({ id }) => ({ type: 'Product', id })), 'Product'] : ['Product'],
    }),
    getProduct: b.query({
      query: id => `/products/${id}`,
      providesTags: (r, e, id) => [{ type: 'Product', id }],
    }),
    createProduct: b.mutation({
      query: body => ({ url: '/products', method: 'POST', body }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: b.mutation({
      query: ({ id, ...body }) => ({ url: `/products/${id}`, method: 'PUT', body }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Product', id }, 'Product'],
    }),
    deleteProduct: b.mutation({
      query: id => ({ url: `/products/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Product'],
    }),
    getCategories: b.query({
      query: params => ({ url: '/categories', params }),
      providesTags: ['Category'],
    }),
    createCategory: b.mutation({
      query: body => ({ url: '/categories', method: 'POST', body }),
      invalidatesTags: ['Category'],
    }),
    updateCategory: b.mutation({
      query: ({ id, ...body }) => ({ url: `/categories/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Category'],
    }),
    getUnits: b.query({
      query: () => '/products/units',
      providesTags: ['Unit'],
    }),
    createUnit: b.mutation({
      query: body => ({ url: '/products/units', method: 'POST', body }),
      invalidatesTags: ['Unit'],
    }),
    updateUnit: b.mutation({
      query: ({ id, ...body }) => ({ url: `/products/units/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Unit'],
    }),
    getPriceLists: b.query({
      query: params => ({ url: '/price-lists', params }),
      providesTags: ['PriceList'],
    }),
    getPriceList: b.query({
      query: id => `/price-lists/${id}`,
      providesTags: (r, e, id) => [{ type: 'PriceList', id }],
    }),
    createPriceList: b.mutation({
      query: body => ({ url: '/price-lists', method: 'POST', body }),
      invalidatesTags: ['PriceList'],
    }),
    updatePriceList: b.mutation({
      query: ({ id, ...body }) => ({ url: `/price-lists/${id}`, method: 'PUT', body }),
      invalidatesTags: ['PriceList'],
    }),
    deletePriceList: b.mutation({
      query: id => ({ url: `/price-lists/${id}`, method: 'DELETE' }),
      invalidatesTags: ['PriceList'],
    }),
  }),
});

export const {
  useGetProductsQuery, useGetProductQuery,
  useCreateProductMutation, useUpdateProductMutation, useDeleteProductMutation,
  useGetCategoriesQuery, useCreateCategoryMutation, useUpdateCategoryMutation,
  useGetUnitsQuery, useCreateUnitMutation, useUpdateUnitMutation,
  useGetPriceListsQuery, useGetPriceListQuery,
  useCreatePriceListMutation, useUpdatePriceListMutation, useDeletePriceListMutation,
} = productsApi;
