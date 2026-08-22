const replacementService = require('../../services/replacement.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getReplacements = async (req, res, next) => {
  try {
    const data = await replacementService.getAdminReplacements(req.query);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

const approveReplacement = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;

    const result = await replacementService.approveReplacement(adminId, id, req);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const rejectReplacement = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const result = await replacementService.rejectReplacement(adminId, id, reason, req);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const updateFulfillment = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    const result = await replacementService.updateReplacementFulfillment(adminId, id, status, req);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getReplacements,
  approveReplacement,
  rejectReplacement,
  updateFulfillment
};
