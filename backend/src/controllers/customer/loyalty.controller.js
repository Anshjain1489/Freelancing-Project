const loyaltyService = require('../../services/customer/loyalty.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getAccount = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const account = await loyaltyService.getLoyaltyAccount(userId);
    res.status(HTTP_STATUS.OK).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
};

const getLedger = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const result = await loyaltyService.getLedger(userId, req.query);
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const redeemPoints = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const result = await loyaltyService.redeemPoints({
      userId,
      pointsToRedeem: req.body.points,
      orderTotal: req.body.orderTotal,
      referenceId: req.body.orderId || '',
      createdBy: userId
    });
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Loyalty points redeemed successfully', data: result });
  } catch (err) {
    next(err);
  }
};

// Admin Endpoints
const listAdminLoyaltyAccounts = async (req, res, next) => {
  try {
    const result = await loyaltyService.listLoyaltyAccounts(req.query);
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const adjustAdminPoints = async (req, res, next) => {
  try {
    const adminId = req.user.id || 'ADMIN';
    const result = await loyaltyService.adjustPoints(
      req.body.userId,
      req.body.pointsDelta,
      req.body.reason,
      adminId
    );
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Points adjusted successfully', data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAccount,
  getLedger,
  redeemPoints,
  listAdminLoyaltyAccounts,
  adjustAdminPoints
};
