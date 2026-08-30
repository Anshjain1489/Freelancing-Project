const aiRecommendationService = require('../services/aiRecommendation.service');
const aiCampaignIntelligenceService = require('../services/aiCampaignIntelligence.service');
const aiActionRecommendationService = require('../services/aiActionRecommendation.service');

exports.getCustomerRecommendations = async (req, res) => {
  try {
    const customerId = req.user.role === 'CUSTOMER' ? req.user.id : (req.query.customerId || req.user.id);
    const list = await aiRecommendationService.getRecommendationsForCustomer(customerId);
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCampaignProposals = async (req, res) => {
  try {
    const proposals = await aiCampaignIntelligenceService.getCampaignProposals();
    return res.status(200).json({ success: true, data: proposals });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.generateCampaignProposals = async (req, res) => {
  try {
    const proposals = await aiCampaignIntelligenceService.generateCampaignProposals();
    return res.status(200).json({ success: true, data: proposals });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingRecommendationsQueue = async (req, res) => {
  try {
    const queue = await aiActionRecommendationService.getPendingRecommendations(req.query.category);
    return res.status(200).json({ success: true, data: queue });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveRecommendation = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await aiActionRecommendationService.approveRecommendation(id, req.user.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.rejectRecommendation = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await aiActionRecommendationService.rejectRecommendation(id, req.user.id, req.body.reason);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
