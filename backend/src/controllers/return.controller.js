const returnService = require('../services/return.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const requestReturn = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const returnData = req.body;

    const result = await returnService.requestCustomerReturn(userId, id, returnData);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getMyReturns = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await returnService.getCustomerReturns(userId, req.query);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requestReturn,
  getMyReturns
};
