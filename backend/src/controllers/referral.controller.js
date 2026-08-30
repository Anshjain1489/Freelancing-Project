const referralService = require('../services/customer/referral.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getReferralSummary = async (req, res, next) => {
  try {
    const result = await referralService.getReferralSummary(req.user.id);
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getReferralCode = async (req, res, next) => {
  try {
    const codeRecord = await referralService.getOrCreateReferralCode(req.user.id);
    res.status(HTTP_STATUS.OK).json({ success: true, data: codeRecord });
  } catch (err) {
    next(err);
  }
};

const generateReferralCode = async (req, res, next) => {
  try {
    const codeRecord = await referralService.getOrCreateReferralCode(req.user.id);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data: codeRecord });
  } catch (err) {
    next(err);
  }
};

const applyReferralCode = async (req, res, next) => {
  try {
    const referral = await referralService.applyReferralCode(req.user.id, req.body.code);
    res.status(HTTP_STATUS.OK).json({ success: true, data: referral });
  } catch (err) {
    next(err);
  }
};

const listReferralsAdmin = async (req, res, next) => {
  try {
    const result = await referralService.listReferralsAdmin();
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getReferralSummary,
  getReferralCode,
  generateReferralCode,
  applyReferralCode,
  listReferralsAdmin
};
