const replacementService = require('../services/replacement.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const requestReplacement = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const replacementData = req.body;

    const result = await replacementService.requestCustomerReplacement(userId, id, replacementData);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getMyReplacements = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await replacementService.getCustomerReplacements(userId, req.query);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requestReplacement,
  getMyReplacements
};
