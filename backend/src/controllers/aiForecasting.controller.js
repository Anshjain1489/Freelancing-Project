const aiDemandForecastingService = require('../services/aiDemandForecasting.service');
const aiInventoryIntelligenceService = require('../services/aiInventoryIntelligence.service');
const aiSalesForecastingService = require('../services/aiSalesForecasting.service');

exports.getDemandForecasts = async (req, res) => {
  try {
    const forecasts = await aiDemandForecastingService.getForecasts(req.query.limit || 50);
    return res.status(200).json({ success: true, data: forecasts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.generateDemandForecasts = async (req, res) => {
  try {
    const result = await aiDemandForecastingService.generateDemandForecasts(req.body.storeId, req.body.horizonDays || 30);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInventoryReorders = async (req, res) => {
  try {
    const reorders = await aiInventoryIntelligenceService.getReorderAlerts();
    return res.status(200).json({ success: true, data: reorders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.evaluateInventoryReorders = async (req, res) => {
  try {
    const reorders = await aiInventoryIntelligenceService.evaluateInventoryReorders(req.body.storeId);
    return res.status(200).json({ success: true, data: reorders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSalesForecasts = async (req, res) => {
  try {
    const salesForecasts = await aiSalesForecastingService.getSalesForecasts(req.query.days || 30);
    return res.status(200).json({ success: true, data: salesForecasts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.generateSalesForecasts = async (req, res) => {
  try {
    const result = await aiSalesForecastingService.generateSalesForecasts(req.body.storeId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
