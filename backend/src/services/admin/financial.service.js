const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const profitLossService = require('./profitLoss.service');
const expenseService = require('./expense.service');
const supplierPayablesService = require('./supplierPayables.service');
const cashManagementService = require('./cashManagement.service');
const inventoryService = require('../inventory.service');

/**
 * Build Financial Dashboard Intelligence Summary
 */
const getFinancialDashboard = async (queryParams = {}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. P&L Statements for Today and Current Month
  const todayPnl = await profitLossService.generateProfitAndLossStatement({ startDate: todayStr, endDate: todayStr, periodType: 'DAILY' });
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const monthPnl = await profitLossService.generateProfitAndLossStatement({ startDate: monthStart, endDate: todayStr, periodType: 'MONTHLY' });

  // 2. Expense Summary
  const expenseData = await expenseService.getExpenses({ startDate: monthStart, endDate: todayStr, limit: 500 });

  // 3. Supplier Payables Summary
  const payablesData = await supplierPayablesService.getSupplierPayables({});

  // 4. Cash Drawer Session Position
  const activeSession = await cashManagementService.getCurrentSession();
  const cashSessionsHistory = await cashManagementService.getCashSessionsHistory({ limit: 10 });

  // 5. Financial Alerts Engine
  const alerts = [];

  // Alert 1: Active Cash Discrepancy Alert
  if (activeSession && Math.abs(activeSession.discrepancy) > 0) {
    alerts.push({
      id: 'alt-cash-discrepancy',
      severity: 'WARNING',
      title: 'Cash Discrepancy Detected',
      message: `Active cash register session (${activeSession.session_number}) has a discrepancy of ₹${activeSession.discrepancy}.`,
      actionRequired: 'Reconcile cash drawer before session close'
    });
  }

  // Alert 2: Overdue Supplier Invoices Alert
  if (payablesData.summary.overdueAmount > 0) {
    alerts.push({
      id: 'alt-supplier-overdue',
      severity: 'HIGH',
      title: 'Overdue Supplier Payments',
      message: `₹${payablesData.summary.overdueAmount} is overdue to suppliers across unpaid invoices.`,
      actionRequired: 'Clear outstanding supplier payments'
    });
  }

  // Alert 3: Negative Margin / Selling Below WAC Alert
  const lowMarginProducts = [];
  const storeMap = inventoryService.mockProductsStore || inventoryService.mockInventory;
  if (storeMap) {
    storeMap.forEach((prod, id) => {
      const wac = parseFloat(prod.average_cost_price || 0);
      const sellingPrice = parseFloat(prod.selling_price || prod.price || 0);
      if (wac > 0 && sellingPrice < wac) {
        lowMarginProducts.push({
          id,
          name: prod.name || prod.product_name || 'Grocery Item',
          wac,
          sellingPrice,
          lossPerUnit: Math.round((wac - sellingPrice) * 100) / 100
        });
      }
    });
  }

  if (lowMarginProducts.length > 0) {
    alerts.push({
      id: 'alt-negative-margin',
      severity: 'CRITICAL',
      title: 'Negative Margin Alert (Selling Below WAC)',
      message: `${lowMarginProducts.length} product(s) are selling below weighted-average cost price!`,
      details: lowMarginProducts.slice(0, 5),
      actionRequired: 'Adjust retail selling prices to protect gross margin'
    });
  }

  // Alert 4: Expense Spike Alert
  if (monthPnl.statement.operatingExpenses > 50000) {
    alerts.push({
      id: 'alt-expense-spike',
      severity: 'MEDIUM',
      title: 'Operating Expense Spike',
      message: `Current month operating expenses have reached ₹${monthPnl.statement.operatingExpenses}.`,
      actionRequired: 'Review category expense breakdowns'
    });
  }

  return {
    todayPosition: {
      revenue: todayPnl.statement.netSales,
      grossProfit: todayPnl.statement.grossProfit,
      netProfit: todayPnl.statement.netProfit,
      totalExpenses: todayPnl.statement.operatingExpenses,
      cogs: todayPnl.statement.cogs,
      grossMarginPct: todayPnl.statement.grossMarginPct,
      paymentChannels: todayPnl.paymentChannels
    },
    monthToDatePosition: monthPnl.statement,
    expenseAnalysis: {
      categoryBreakdown: monthPnl.expenseCategories,
      totalOperatingExpenses: expenseData.summary.totalOperatingExpenses
    },
    supplierPayablesSummary: payablesData.summary,
    cashPosition: {
      hasActiveSession: !!activeSession,
      activeSession,
      recentSessions: cashSessionsHistory.sessions.slice(0, 5)
    },
    alerts
  };
};

module.exports = {
  getFinancialDashboard
};
