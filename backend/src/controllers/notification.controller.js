const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const notificationService = require('../notifications/notification.service');
const preferenceService = require('../notifications/notificationPreference.service');
const sseManager = require('../notifications/sse.manager');
const { HTTP_STATUS } = require('../constants/statusCodes');

const streamNotifications = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  res.write(`data: ${JSON.stringify({ eventType: 'CONNECTED', message: 'Real-time notification stream active' })}\n\n`);

  sseManager.addClient(req.user.id, req.user.role, res);
};

const getUserNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getUserNotifications(req.user.id, req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Notifications retrieved', result);
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Unread notification count', result);
});

const markAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAsRead(req.user.id, req.params.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Notification marked as read', result);
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'All notifications marked as read', result);
});

const getPreferences = asyncHandler(async (req, res) => {
  const result = await preferenceService.getPreferences(req.user.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Notification preferences retrieved', { preferences: result });
});

const updatePreferences = asyncHandler(async (req, res) => {
  const result = await preferenceService.updatePreferences(req.user.id, req.body);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Notification preferences updated', { preferences: result });
});

module.exports = {
  streamNotifications,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences
};
