const storeBranchService = require('../../services/admin/storeBranch.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const listBranches = async (req, res, next) => {
  try {
    const result = await storeBranchService.listBranches(req.query);
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getBranch = async (req, res, next) => {
  try {
    const branch = await storeBranchService.getBranchById(req.params.id);
    res.status(HTTP_STATUS.OK).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
};

const createBranch = async (req, res, next) => {
  try {
    const branch = await storeBranchService.createBranch(req.body);
    res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Store branch created successfully', data: branch });
  } catch (err) {
    next(err);
  }
};

const updateBranch = async (req, res, next) => {
  try {
    const branch = await storeBranchService.updateBranch(req.params.id, req.body);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Store branch updated successfully', data: branch });
  } catch (err) {
    next(err);
  }
};

const activateBranch = async (req, res, next) => {
  try {
    const branch = await storeBranchService.setBranchStatus(req.params.id, true);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Store branch activated', data: branch });
  } catch (err) {
    next(err);
  }
};

const deactivateBranch = async (req, res, next) => {
  try {
    const branch = await storeBranchService.setBranchStatus(req.params.id, false);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Store branch deactivated', data: branch });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listBranches,
  getBranch,
  createBranch,
  updateBranch,
  activateBranch,
  deactivateBranch
};
