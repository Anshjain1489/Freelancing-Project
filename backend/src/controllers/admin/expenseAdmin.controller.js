const expenseService = require('../../services/admin/expense.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getCategories = async (req, res, next) => {
  try {
    const categories = await expenseService.getExpenseCategories();
    return res.status(HTTP_STATUS.OK).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await expenseService.createExpenseCategory(req.body);
    return res.status(HTTP_STATUS.CREATED).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

const getExpenses = async (req, res, next) => {
  try {
    const result = await expenseService.getExpenses(req.query);
    return res.status(HTTP_STATUS.OK).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const createExpense = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'ADMIN';
    const expense = await expenseService.createExpense(req.body, userId);
    return res.status(HTTP_STATUS.CREATED).json({ success: true, expense });
  } catch (error) {
    next(error);
  }
};

const approveExpense = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'ADMIN';
    const expense = await expenseService.approveExpense(req.params.id, userId);
    return res.status(HTTP_STATUS.OK).json({ success: true, expense, message: 'Expense approved successfully' });
  } catch (error) {
    next(error);
  }
};

const rejectExpense = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'ADMIN';
    const { reason } = req.body;
    const expense = await expenseService.rejectExpense(req.params.id, userId, reason);
    return res.status(HTTP_STATUS.OK).json({ success: true, expense, message: 'Expense rejected successfully' });
  } catch (error) {
    next(error);
  }
};

const reverseExpense = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'ADMIN';
    const { reason } = req.body;
    const result = await expenseService.reverseExpense(req.params.id, userId, reason);
    return res.status(HTTP_STATUS.OK).json({ success: true, ...result, message: 'Expense reversed successfully' });
  } catch (error) {
    next(error);
  }
};

const getRecurringExpenses = async (req, res, next) => {
  try {
    const recurring = Array.from(expenseService.mockRecurringExpenses.values());
    return res.status(HTTP_STATUS.OK).json({ success: true, recurring });
  } catch (error) {
    next(error);
  }
};

const createRecurringExpense = async (req, res, next) => {
  try {
    const recurring = await expenseService.createRecurringExpense(req.body);
    return res.status(HTTP_STATUS.CREATED).json({ success: true, recurring });
  } catch (error) {
    next(error);
  }
};

const triggerRecurringProcess = async (req, res, next) => {
  try {
    const result = await expenseService.processRecurringExpenses('ADMIN_TRIGGER');
    return res.status(HTTP_STATUS.OK).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  getExpenses,
  createExpense,
  approveExpense,
  rejectExpense,
  reverseExpense,
  getRecurringExpenses,
  createRecurringExpense,
  triggerRecurringProcess
};
