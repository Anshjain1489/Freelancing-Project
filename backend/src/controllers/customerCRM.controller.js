const customerCRMService = require('../services/customer/customerCRM.service');
const customerSegmentationService = require('../services/customer/customerSegmentation.service');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getCustomerProfile = async (req, res, next) => {
  try {
    const profile = await customerCRMService.getProfile(req.user.id);
    res.status(HTTP_STATUS.OK).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

const getCustomerInsights = async (req, res, next) => {
  try {
    const profile = await customerCRMService.getProfile(req.user.id);
    const { segments } = await customerSegmentationService.getCustomerSegments(req.user.id);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        profile,
        segments,
        insights: {
          orderFrequency: profile.completed_orders > 0 ? 'Regular Purchaser' : 'New Customer',
          spendingStatus: profile.total_spend > 5000 ? 'VIP Kirana Buyer' : 'Standard Shopper'
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

const listCustomersAdmin = async (req, res, next) => {
  try {
    const result = await customerCRMService.listProfiles(req.query);
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getCustomerDetailAdmin = async (req, res, next) => {
  try {
    const profile = await customerCRMService.getProfile(req.params.id);
    const { segments } = await customerSegmentationService.getCustomerSegments(req.params.id);
    res.status(HTTP_STATUS.OK).json({ success: true, data: { profile, segments } });
  } catch (err) {
    next(err);
  }
};

const listSegmentsAdmin = async (req, res, next) => {
  try {
    const result = await customerSegmentationService.listSegments();
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const createSegmentAdmin = async (req, res, next) => {
  try {
    const segment = await customerSegmentationService.createSegment(req.body);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data: segment });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCustomerProfile,
  getCustomerInsights,
  listCustomersAdmin,
  getCustomerDetailAdmin,
  listSegmentsAdmin,
  createSegmentAdmin
};
