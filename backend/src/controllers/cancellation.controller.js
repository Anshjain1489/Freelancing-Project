const cancellationService = require('../services/cancellation.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const requestCancellation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const result = await cancellationService.requestCustomerCancellation(userId, id, reason);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getMyCancellations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await cancellationService.getCustomerCancellations(userId, req.query);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requestCancellation,
  getMyCancellations
};
