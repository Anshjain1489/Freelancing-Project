const subscriptionService = require('../../services/customer/subscription.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const createSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const sub = await subscriptionService.createSubscription(userId, req.body);
    res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Grocery subscription created successfully', data: sub });
  } catch (err) {
    next(err);
  }
};

const listSubscriptions = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const result = await subscriptionService.listSubscriptions(userId, req.query);
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const sub = await subscriptionService.getSubscriptionById(req.params.id, userId);
    res.status(HTTP_STATUS.OK).json({ success: true, data: sub });
  } catch (err) {
    next(err);
  }
};

const updateSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const sub = await subscriptionService.updateSubscription(req.params.id, userId, req.body);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Subscription updated', data: sub });
  } catch (err) {
    next(err);
  }
};

const pauseSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const sub = await subscriptionService.pauseSubscription(req.params.id, userId);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Subscription paused', data: sub });
  } catch (err) {
    next(err);
  }
};

const resumeSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const sub = await subscriptionService.resumeSubscription(req.params.id, userId);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Subscription resumed', data: sub });
  } catch (err) {
    next(err);
  }
};

const skipNextDelivery = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const result = await subscriptionService.skipNextDelivery(req.params.id, userId);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Next delivery skipped', data: result });
  } catch (err) {
    next(err);
  }
};

const cancelSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const sub = await subscriptionService.cancelSubscription(req.params.id, userId);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Subscription cancelled', data: sub });
  } catch (err) {
    next(err);
  }
};

// Admin Endpoints
const listAdminSubscriptions = async (req, res, next) => {
  try {
    const result = await subscriptionService.listAllSubscriptionsAdmin(req.query);
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const dispatchAdminSubscriptions = async (req, res, next) => {
  try {
    const scheduledDate = req.body.scheduledDate || new Date().toISOString().split('T')[0];
    const result = await subscriptionService.dispatchSubscriptions(scheduledDate);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Subscription batch dispatch executed', data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSubscription,
  listSubscriptions,
  getSubscription,
  updateSubscription,
  pauseSubscription,
  resumeSubscription,
  skipNextDelivery,
  cancelSubscription,
  listAdminSubscriptions,
  dispatchAdminSubscriptions
};
