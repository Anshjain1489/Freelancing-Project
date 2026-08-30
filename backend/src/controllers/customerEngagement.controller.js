const customerEngagementService = require('../services/customer/customerEngagement.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getPreferences = async (req, res, next) => {
  try {
    const prefs = await customerEngagementService.getPreferences(req.user.id);
    res.status(HTTP_STATUS.OK).json({ success: true, data: prefs });
  } catch (err) {
    next(err);
  }
};

const updatePreferences = async (req, res, next) => {
  try {
    const prefs = await customerEngagementService.updatePreferences(req.user.id, req.body);
    res.status(HTTP_STATUS.OK).json({ success: true, data: prefs });
  } catch (err) {
    next(err);
  }
};

const logEvent = async (req, res, next) => {
  try {
    const event = await customerEngagementService.logEvent({
      ...req.body,
      userId: req.user ? req.user.id : null
    });
    res.status(HTTP_STATUS.CREATED).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPreferences,
  updatePreferences,
  logEvent
};
