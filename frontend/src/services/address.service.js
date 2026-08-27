import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const addressService = {
  getAddresses: async () => {
    const response = await apiClient.get(ENDPOINTS.ADDRESSES.LIST);
    return response.data;
  },

  createAddress: async (addressData) => {
    const response = await apiClient.post(ENDPOINTS.ADDRESSES.CREATE, addressData);
    return response.data;
  },

  updateAddress: async (id, addressData) => {
    const response = await apiClient.patch(ENDPOINTS.ADDRESSES.UPDATE(id), addressData);
    return response.data;
  },

  deleteAddress: async (id) => {
    const response = await apiClient.delete(ENDPOINTS.ADDRESSES.DELETE(id));
    return response.data;
  },

  setDefaultAddress: async (id) => {
    const response = await apiClient.put(`/addresses/${id}/default`);
    return response.data;
  }
};
