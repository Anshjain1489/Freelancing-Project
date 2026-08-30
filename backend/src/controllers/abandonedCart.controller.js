const abandonedCartService = require('../services/customer/abandonedCart.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const listAbandonedCartsAdmin = async (req, res, next) => {
  try {
    const result = await abandonedCartService.listAbandonedCarts(req.query);
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const triggerRecoveryRemindersAdmin = async (req, res, next) => {
  try {
    const result = await abandonedCartService.sendCartRecoveryReminders();
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listAbandonedCartsAdmin,
  triggerRecoveryRemindersAdmin
};
