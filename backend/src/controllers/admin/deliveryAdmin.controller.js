const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const deliveryService = require('../../services/delivery.management.service');
const whatsappService = require('../../services/whatsapp.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getDeliveryPartners = asyncHandler(async (req, res) => {
  const partners = await deliveryService.getDeliveryPartners();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Delivery partners retrieved', { items: partners });
});

const createDeliveryPartner = asyncHandler(async (req, res) => {
  const partner = await deliveryService.createDeliveryPartner(req.user.id, req.body, req);
  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'Delivery Partner created successfully', partner);
});

const getAdminDeliveryDashboard = asyncHandler(async (req, res) => {
  const dashboard = await deliveryService.getAdminDeliveryDashboard();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Admin delivery summary dashboard retrieved', dashboard);
});

const getUnassignedOrders = asyncHandler(async (req, res) => {
  const orders = await deliveryService.getUnassignedOrders();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Unassigned delivery orders retrieved', { items: orders });
});

const getAssignedDeliveries = asyncHandler(async (req, res) => {
  const assignments = await deliveryService.getAssignedDeliveries();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Assigned delivery orders retrieved', { items: assignments });
});

const assignDeliveryPartner = asyncHandler(async (req, res) => {
  const { deliveryPartnerId, estimatedMinutes, deliveryNotes } = req.body;
  const result = await deliveryService.assignDeliveryPartner(
    req.user.id,
    req.params.orderId || req.body.orderId,
    deliveryPartnerId,
    estimatedMinutes,
    req,
    deliveryNotes
  );
  return ApiResponse.success(res, HTTP_STATUS.OK, result.message, result);
});

const reassignDeliveryPartner = asyncHandler(async (req, res) => {
  const { deliveryPartnerId } = req.body;
  const result = await deliveryService.reassignDeliveryPartner(
    req.user.id,
    req.params.orderId || req.body.orderId,
    deliveryPartnerId,
    req
  );
  return ApiResponse.success(res, HTTP_STATUS.OK, result.message, result);
});

const getWhatsAppClickToChatLink = asyncHandler(async (req, res) => {
  const result = await whatsappService.getWhatsAppClickToChatLink(req.user.id, req.params.orderId);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'WhatsApp Click-to-Chat link generated', result);
});

module.exports = {
  getDeliveryPartners,
  createDeliveryPartner,
  getAdminDeliveryDashboard,
  getUnassignedOrders,
  getAssignedDeliveries,
  assignDeliveryPartner,
  reassignDeliveryPartner,
  getWhatsAppClickToChatLink,
  resendWhatsAppNotification: getWhatsAppClickToChatLink,
  getDeliveryNotifications: getWhatsAppClickToChatLink
};
