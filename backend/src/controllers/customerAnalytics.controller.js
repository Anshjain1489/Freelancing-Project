const customerAnalyticsService = require('../services/customer/customerAnalytics.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getOverviewAnalytics = async (req, res, next) => {
  try {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    res.status(HTTP_STATUS.OK).json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverviewAnalytics
};
