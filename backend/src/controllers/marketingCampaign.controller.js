const marketingCampaignService = require('../services/customer/marketingCampaign.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const createCampaignAdmin = async (req, res, next) => {
  try {
    const campaign = await marketingCampaignService.createCampaign(req.body, req.user.id);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data: campaign });
  } catch (err) {
    next(err);
  }
};

const updateCampaignAdmin = async (req, res, next) => {
  try {
    const campaign = await marketingCampaignService.updateCampaign(req.params.id, req.body);
    res.status(HTTP_STATUS.OK).json({ success: true, data: campaign });
  } catch (err) {
    next(err);
  }
};

const listCampaignsAdmin = async (req, res, next) => {
  try {
    const result = await marketingCampaignService.listCampaigns(req.query);
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getCampaignAnalyticsAdmin = async (req, res, next) => {
  try {
    const result = await marketingCampaignService.getCampaignAnalytics(req.params.id);
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const dispatchCampaignAdmin = async (req, res, next) => {
  try {
    const result = await marketingCampaignService.dispatchCampaign(req.params.id, req.body.targetUserIds);
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCampaignAdmin,
  updateCampaignAdmin,
  listCampaignsAdmin,
  getCampaignAnalyticsAdmin,
  dispatchCampaignAdmin
};
