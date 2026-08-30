const aiDynamicPricingService = require('../services/aiDynamicPricing.service');
const aiChurnPredictionService = require('../services/aiChurnPrediction.service');
const aiCreditRiskService = require('../services/aiCreditRisk.service');
const aiSubscriptionIntelligenceService = require('../services/aiSubscriptionIntelligence.service');

exports.getPricingRecommendations = async (req, res) => {
  try {
    const list = await aiDynamicPricingService.getPricingRecommendations();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.analyzePricing = async (req, res) => {
  try {
    const result = await aiDynamicPricingService.analyzeCatalogPricing(req.body.storeId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getChurnRisks = async (req, res) => {
  try {
    const list = await aiChurnPredictionService.getChurnRisks();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.evaluateChurn = async (req, res) => {
  try {
    const result = await aiChurnPredictionService.evaluateChurnRisk();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCreditRisks = async (req, res) => {
  try {
    const list = await aiCreditRiskService.getRiskAssessments();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.assessCreditRisks = async (req, res) => {
  try {
    const result = await aiCreditRiskService.assessCreditRisks();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSubscriptionInsights = async (req, res) => {
  try {
    const list = await aiSubscriptionIntelligenceService.getSubscriptionInsights();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.evaluateSubscriptions = async (req, res) => {
  try {
    const result = await aiSubscriptionIntelligenceService.evaluateSubscriptionRisks();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
