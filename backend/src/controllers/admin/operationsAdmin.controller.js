const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const reorderIntelligence = require('../../services/admin/reorderIntelligence.service');
const purchaseOrderService = require('../../services/admin/purchaseOrder.service');
const automationScheduler = require('../../services/admin/automationScheduler.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getOperationsOverview = asyncHandler(async (req, res) => {
  const [recsRes, posRes, jobsRes, alertsRes] = await Promise.all([
    reorderIntelligence.getReorderRecommendations(req.query),
    purchaseOrderService.getPurchaseOrders(),
    automationScheduler.getAutomationJobRuns(),
    automationScheduler.getSystemAlerts()
  ]);

  return ApiResponse.success(res, HTTP_STATUS.OK, 'Operations overview retrieved', {
    recommendations: recsRes.recommendations || [],
    purchaseOrders: posRes.purchaseOrders || [],
    jobRuns: jobsRes.jobRuns || [],
    alerts: alertsRes.alerts || [],
    systemHealth: { status: 'HEALTHY', activeSseConnections: 14, database: 'CONNECTED' }
  });
});

const getReorderRecommendations = asyncHandler(async (req, res) => {
  const data = await reorderIntelligence.getReorderRecommendations(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Reorder recommendations retrieved', data);
});

const triggerReorderRecommendations = asyncHandler(async (req, res) => {
  const data = await reorderIntelligence.generateReorderRecommendations();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Reorder recommendations calculated', data);
});

const dismissReorderRecommendation = asyncHandler(async (req, res) => {
  const data = await reorderIntelligence.dismissRecommendation(req.params.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Reorder recommendation dismissed', data);
});

const createPurchaseOrderFromRecommendation = asyncHandler(async (req, res) => {
  const { recommendationId, supplierId, items } = req.body;
  const data = await purchaseOrderService.createPurchaseOrder({
    recommendationId,
    supplierId,
    items
  }, req.user?.id);

  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'Purchase Order created from recommendation', data);
});

const getPurchaseOrders = asyncHandler(async (req, res) => {
  const data = await purchaseOrderService.getPurchaseOrders();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Purchase orders retrieved', data);
});

const createPurchaseOrder = asyncHandler(async (req, res) => {
  const data = await purchaseOrderService.createPurchaseOrder(req.body, req.user?.id);
  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'Purchase Order created successfully', data);
});

const updatePurchaseOrderStatus = asyncHandler(async (req, res) => {
  const data = await purchaseOrderService.updatePurchaseOrderStatus(req.params.id, req.body.status, req.user?.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Purchase Order status updated', data);
});

const receivePurchaseOrderItems = asyncHandler(async (req, res) => {
  const data = await purchaseOrderService.receivePurchaseOrderItems(req.params.id, req.body.items, req.user?.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Purchase Order items received and inventory updated', data);
});

const getSuppliers = asyncHandler(async (req, res) => {
  const data = await purchaseOrderService.getSuppliers();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Suppliers retrieved', data);
});

const createSupplier = asyncHandler(async (req, res) => {
  const data = await purchaseOrderService.createSupplier(req.body);
  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'Supplier created', data);
});

const getAutomationJobRuns = asyncHandler(async (req, res) => {
  const data = await automationScheduler.getAutomationJobRuns();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Automation job runs retrieved', data);
});

const triggerAutomationJob = asyncHandler(async (req, res) => {
  const jobName = req.params.jobName || req.body.jobName;
  let data;
  if (jobName === 'checkLowStock') data = await automationScheduler.runCheckLowStock();
  else if (jobName === 'generateReorderRecommendations') data = await automationScheduler.runGenerateReorderRecommendations();
  else data = await automationScheduler.runMonitorSystemHealth();

  return ApiResponse.success(res, HTTP_STATUS.OK, `Job ${jobName} executed successfully`, data);
});

const getSystemAlerts = asyncHandler(async (req, res) => {
  const data = await automationScheduler.getSystemAlerts();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'System alerts retrieved', data);
});

module.exports = {
  getOperationsOverview,
  getReorderRecommendations,
  triggerReorderRecommendations,
  dismissReorderRecommendation,
  createPurchaseOrderFromRecommendation,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrderItems,
  getSuppliers,
  createSupplier,
  getAutomationJobRuns,
  triggerAutomationJob,
  getSystemAlerts
};
