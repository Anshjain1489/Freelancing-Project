const returnService = require('../../services/return.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getReturns = async (req, res, next) => {
  try {
    const data = await returnService.getAdminReturns(req.query);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

const approveReturn = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;

    const result = await returnService.approveReturn(adminId, id, req);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const rejectReturn = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const result = await returnService.rejectReturn(adminId, id, reason, req);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const assignPickup = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { deliveryPartnerId } = req.body;

    const result = await returnService.assignReversePickup(adminId, id, deliveryPartnerId, req);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const confirmReceived = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { itemsCondition } = req.body;

    const result = await returnService.confirmReturnReceived(adminId, id, itemsCondition, req);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getReturns,
  approveReturn,
  rejectReturn,
  assignPickup,
  confirmReceived
};
