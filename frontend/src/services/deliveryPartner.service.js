import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const deliveryPartnerService = {
  // Delivery Partner Methods
  getDashboard: async () => {
    const response = await apiClient.get(ENDPOINTS.DELIVERY.DASHBOARD);
    return response.data;
  },

  getAssignedOrders: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.DELIVERY.ORDERS, { params });
    return response.data;
  },

  getOrderById: async (id) => {
    const response = await apiClient.get(ENDPOINTS.DELIVERY.BY_ID(id));
    return response.data;
  },

  acceptDelivery: async (id) => {
    const response = await apiClient.post(ENDPOINTS.DELIVERY.ACCEPT(id));
    return response.data;
  },

  pickupDelivery: async (id) => {
    const response = await apiClient.post(ENDPOINTS.DELIVERY.PICKUP(id));
    return response.data;
  },

  startDelivery: async (id) => {
    const response = await apiClient.post(ENDPOINTS.DELIVERY.START(id));
    return response.data;
  },

  deliverOrder: async (id, codPayload = {}) => {
    const response = await apiClient.post(ENDPOINTS.DELIVERY.COMPLETE(id), codPayload);
    return response.data;
  },

  completeDelivery: async (id, codPayload = {}) => {
    const response = await apiClient.post(ENDPOINTS.DELIVERY.COMPLETE(id), codPayload);
    return response.data;
  },

  failDelivery: async (id, reason, notes = '') => {
    const response = await apiClient.post(ENDPOINTS.DELIVERY.FAIL(id), { reason, notes });
    return response.data;
  },

  // Admin Delivery Management Methods
  getAdminDeliveryDashboard: async () => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.DELIVERY_DASHBOARD);
    return response.data;
  },

  getDeliveryPartners: async () => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.DELIVERY_PARTNERS);
    return response.data;
  },

  createDeliveryPartner: async (data) => {
    const response = await apiClient.post(ENDPOINTS.ADMIN.DELIVERY_PARTNERS, data);
    return response.data;
  },

  getUnassignedOrders: async () => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.UNASSIGNED_DELIVERY_ORDERS);
    return response.data;
  },

  getAssignedDeliveries: async () => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.ASSIGNED_DELIVERY_ORDERS);
    return response.data;
  },

  assignDeliveryPartner: async (orderId, deliveryPartnerId, estimatedMinutes = 30, deliveryNotes = '') => {
    const response = await apiClient.post(ENDPOINTS.ADMIN.ASSIGN_DELIVERY(orderId), { deliveryPartnerId, estimatedMinutes, deliveryNotes });
    return response.data;
  },

  reassignDeliveryPartner: async (orderId, deliveryPartnerId) => {
    const response = await apiClient.post(ENDPOINTS.ADMIN.REASSIGN_DELIVERY(orderId), { deliveryPartnerId });
    return response.data;
  },

  resendWhatsAppNotification: async (orderId) => {
    const response = await apiClient.post(ENDPOINTS.ADMIN.RESEND_WHATSAPP_DELIVERY(orderId));
    return response.data;
  },

  getWhatsAppClickToChatLink: async (orderId, partnerId = null) => {
    const response = await apiClient.post(ENDPOINTS.ADMIN.WHATSAPP_LINK(orderId), { partnerId });
    return response.data;
  },

  getDeliveryNotifications: async (orderId) => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.DELIVERY_NOTIFICATIONS(orderId));
    return response.data;
  }
};
