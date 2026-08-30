const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const monitoringService = require('../../services/admin/productionMonitoring.service');

/**
 * GET /api/v1/admin/system-status
 * Admin System Status Dashboard Data (Protected RBAC)
 */
const getSystemStatus = asyncHandler(async (req, res) => {
  const summary = await monitoringService.getSystemStatusSummary();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'System status retrieved successfully', summary);
});

/**
 * GET /api/v1/admin/monitoring/alerts
 * Active System Alerts
 */
const getSystemAlerts = asyncHandler(async (req, res) => {
  const { status, limit } = req.query;
  const alerts = await monitoringService.getSystemAlerts({ status: status || 'ACTIVE', limit: parseInt(limit, 10) || 50 });
  return ApiResponse.success(res, HTTP_STATUS.OK, 'System alerts retrieved successfully', { items: alerts });
});

/**
 * POST /api/v1/admin/monitoring/alerts/:id/acknowledge
 */
const acknowledgeAlert = asyncHandler(async (req, res) => {
  const result = await monitoringService.acknowledgeSystemAlert(req.params.id, req.user.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Alert acknowledged successfully', result);
});

module.exports = {
  getSystemStatus,
  getSystemAlerts,
  acknowledgeAlert
};
