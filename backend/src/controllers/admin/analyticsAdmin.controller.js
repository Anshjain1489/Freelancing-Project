const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const analyticsAdminService = require('../../services/admin/analyticsAdmin.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getDashboardOverview = asyncHandler(async (req, res) => {
  const data = await analyticsAdminService.getDashboardOverview();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Store owner overview metrics retrieved', data);
});

const getSalesAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsAdminService.getSalesAnalytics(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Sales analytics retrieved', data);
});

const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsAdminService.getSalesAnalytics(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Revenue analytics retrieved', data);
});

const getProductAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsAdminService.getProductAnalytics(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Product intelligence analytics retrieved', data);
});

const getTopProducts = asyncHandler(async (req, res) => {
  const data = await analyticsAdminService.getProductAnalytics(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Top products analytics retrieved', data);
});

const getInventoryAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsAdminService.getInventoryAnalytics();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Inventory intelligence analytics retrieved', data);
});

const getGstReport = asyncHandler(async (req, res) => {
  const data = await analyticsAdminService.getGstReport(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'GST tax slab report retrieved', data);
});

const getDeliveryAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsAdminService.getDeliveryAnalytics(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Delivery performance analytics retrieved', data);
});

const exportCsv = asyncHandler(async (req, res) => {
  const type = (req.params.type || req.query.type || 'sales').toLowerCase();
  const csvContent = await analyticsAdminService.generateCsvExport(type, req.query);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="cks_${type}_report_${Date.now()}.csv"`);
  return res.status(HTTP_STATUS.OK).send(csvContent);
});

const exportPdfMonthlyReport = asyncHandler(async (req, res) => {
  const htmlContent = await analyticsAdminService.generatePdfMonthlyReportHtml(req.query);
  
  res.setHeader('Content-Type', 'text/html');
  return res.status(HTTP_STATUS.OK).send(htmlContent);
});

module.exports = {
  getDashboardOverview,
  getSalesAnalytics,
  getRevenueAnalytics,
  getProductAnalytics,
  getTopProducts,
  getInventoryAnalytics,
  getGstReport,
  getDeliveryAnalytics,
  exportCsv,
  exportPdfMonthlyReport
};
