const cashManagementService = require('../../services/admin/cashManagement.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getCurrentSession = async (req, res, next) => {
  try {
    const registerId = req.query.registerId || 'MAIN_POS_1';
    const session = await cashManagementService.getCurrentSession(registerId);
    return res.status(HTTP_STATUS.OK).json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

const openSession = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'ADMIN';
    const session = await cashManagementService.openCashSession(req.body, userId);
    return res.status(HTTP_STATUS.CREATED).json({ success: true, session, message: 'Cash session opened successfully' });
  } catch (error) {
    next(error);
  }
};

const recordMovement = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'ADMIN';
    const result = await cashManagementService.recordCashMovement(req.body, userId);
    return res.status(HTTP_STATUS.CREATED).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const closeSession = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'ADMIN';
    const result = await cashManagementService.closeCashSession(req.body, userId);
    return res.status(HTTP_STATUS.OK).json({ success: true, ...result, message: 'Cash session closed successfully' });
  } catch (error) {
    next(error);
  }
};

const getSessionsHistory = async (req, res, next) => {
  try {
    const result = await cashManagementService.getCashSessionsHistory(req.query);
    return res.status(HTTP_STATUS.OK).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentSession,
  openSession,
  recordMovement,
  closeSession,
  getSessionsHistory
};
