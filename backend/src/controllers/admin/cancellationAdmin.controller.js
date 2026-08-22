const cancellationService = require('../../services/cancellation.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getCancellations = async (req, res, next) => {
  try {
    const data = await cancellationService.getAdminCancellations(req.query);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

const approveCancellation = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;

    const result = await cancellationService.approveCancellation(adminId, id, req);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const rejectCancellation = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const result = await cancellationService.rejectCancellation(adminId, id, reason, req);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCancellations,
  approveCancellation,
  rejectCancellation
};
