import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const invoiceService = {
  getInvoiceById: async (invoiceId) => {
    const response = await apiClient.get(ENDPOINTS.INVOICES.BY_ID(invoiceId));
    return response.data;
  },

  getInvoiceByOrderId: async (orderId) => {
    const response = await apiClient.get(ENDPOINTS.ORDERS.INVOICE(orderId));
    return response.data;
  },

  createPosSale: async (posData) => {
    const response = await apiClient.post(ENDPOINTS.POS.CREATE_SALE, posData);
    return response.data;
  },

  getPosSaleById: async (saleId) => {
    const response = await apiClient.get(ENDPOINTS.POS.GET_SALE(saleId));
    return response.data;
  },

  cancelPosSale: async (saleId, reason) => {
    const response = await apiClient.post(ENDPOINTS.POS.CANCEL_SALE(saleId), { reason });
    return response.data;
  },

  listAdminInvoices: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.POS.LIST_INVOICES, { params });
    return response.data;
  },

  getDownloadUrl: (invoiceId) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    const token = localStorage.getItem('accessToken') || localStorage.getItem('cks_auth_token');
    return `${baseURL}/invoices/${invoiceId}/download?print=true&token=${token || ''}`;
  }
};
