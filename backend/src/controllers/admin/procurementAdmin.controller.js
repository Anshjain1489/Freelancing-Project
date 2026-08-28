const procurementService = require('../../services/admin/procurementAdmin.service');
const valuationService = require('../../services/admin/inventoryValuation.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getSuppliers = async (req, res, next) => {
  try {
    const result = await procurementService.getSuppliersWithPerformance(req.user);
    return res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const editDraftPO = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : 'admin';
    const updatedPo = await procurementService.editDraftPurchaseOrder(id, req.body, userId);
    return res.status(HTTP_STATUS.OK).json({ success: true, data: updatedPo });
  } catch (err) {
    next(err);
  }
};

const updatePOStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user ? req.user.id : 'admin';
    const result = await procurementService.updatePOStatusWithHistory(id, status, userId, notes);
    return res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const receivePOItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const userId = req.user ? req.user.id : 'admin';
    const result = await procurementService.receivePOItemsAtomic(id, items, userId);
    return res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const triggerAutoProcurement = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'admin';
    const result = await procurementService.generateAutomatedProcurementGrouped(userId);
    return res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getValuationReport = async (req, res, next) => {
  try {
    const report = await valuationService.getInventoryValuationReport();
    return res.status(HTTP_STATUS.OK).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

const createAdjustment = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'admin';
    const result = await valuationService.createStockAdjustment(req.body, userId);
    return res.status(HTTP_STATUS.CREATED).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const reverseAdjustment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user ? req.user.id : 'admin';
    const result = await valuationService.reverseStockAdjustment(id, notes, userId);
    return res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getAdjustments = async (req, res, next) => {
  try {
    const result = await valuationService.getStockAdjustments();
    return res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getCostHistory = async (req, res, next) => {
  try {
    const { productId } = req.query;
    const result = await valuationService.getCostHistory(productId);
    return res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSuppliers,
  editDraftPO,
  updatePOStatus,
  receivePOItems,
  triggerAutoProcurement,
  getValuationReport,
  createAdjustment,
  reverseAdjustment,
  getAdjustments,
  getCostHistory
};
