const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const expenseService = require('./expense.service');
const { mockInvoices, mockPosSales } = require('../invoice.service');
const { mockOrders } = require('../order.service');
const inventoryService = require('../inventory.service');

const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

/**
 * Generate Server-Authoritative Profit & Loss Statement
 */
const generateProfitAndLossStatement = async (options = {}) => {
  const periodType = options.periodType || 'MONTHLY'; // DAILY, WEEKLY, MONTHLY, CUSTOM
  const startDate = options.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const endDate = options.endDate || new Date().toISOString().split('T')[0];

  let invoices = Array.from(mockInvoices.values());
  let orders = Array.from(mockOrders ? mockOrders.values() : []);
  let posSales = Array.from(mockPosSales ? mockPosSales.values() : []);

  if (supabase) {
    try {
      const { data: invData } = await supabase.from('invoices').select('*, invoice_items(*)');
      if (invData && invData.length > 0) invoices = invData;

      const { data: ordData } = await supabase.from('orders').select('*, order_items(*)');
      if (ordData && ordData.length > 0) orders = ordData;

      const { data: posData } = await supabase.from('pos_sales').select('*, pos_sale_items(*)');
      if (posData && posData.length > 0) posSales = posData;
    } catch (e) {}
  }

  // Filter Sales within Date Range and exclude CANCELLED sales
  const validInvoices = invoices.filter(inv => {
    const invDate = (inv.issued_at || inv.created_at || '').split('T')[0];
    const isCompleted = inv.invoice_status !== 'CANCELLED';
    return isCompleted && invDate >= startDate && invDate <= endDate;
  });

  // Calculate Revenue Components
  let grossSales = 0;
  let totalDiscounts = 0;
  let totalRefunds = 0;
  let totalCogs = 0;
  let legacyCostItemsCount = 0;
  let snapshotCostItemsCount = 0;

  validInvoices.forEach(inv => {
    const subtotal = parseFloat(inv.subtotal || inv.total_amount || 0);
    const discount = parseFloat(inv.discount_amount || 0);
    grossSales += subtotal;
    totalDiscounts += discount;

    if (inv.invoice_status === 'REFUNDED') {
      totalRefunds += parseFloat(inv.total_amount || 0);
    }

    // Process line item COGS via Cost Snapshots
    const items = inv.invoice_items || inv.items || [];
    items.forEach(item => {
      const qty = parseFloat(item.quantity || 1);
      let costSnapshot = parseFloat(item.invoice_item_cost || item.sale_cost_snapshot || 0);

      // Legacy fallback strategy: If cost snapshot is 0, estimate cost from product's WAC or MRP estimate
      if (costSnapshot <= 0) {
        legacyCostItemsCount++;
        const storeMap = inventoryService.mockProductsStore || inventoryService.mockInventory;
        const prod = storeMap ? storeMap.get(item.product_id || item.productId) : null;
        const wac = prod ? parseFloat(prod.average_cost_price || 0) : 0;
        if (wac > 0) {
          costSnapshot = wac;
        } else {
          // Default estimated cost basis (75% of MRP)
          const mrp = parseFloat(item.mrp || item.selling_price || 0);
          costSnapshot = Math.round(mrp * 0.75 * 100) / 100;
        }
      } else {
        snapshotCostItemsCount++;
      }

      totalCogs += Math.round(qty * costSnapshot * 100) / 100;
    });
  });

  // Calculate Operating Expenses (ONLY APPROVED Expenses)
  const expenseData = await expenseService.getExpenses({ startDate, endDate, status: 'APPROVED', limit: 1000 });
  const operatingExpenses = expenseData.summary.totalOperatingExpenses;

  // Revenue & Profitability Formulas
  const netSales = Math.max(0, Math.round((grossSales - totalDiscounts - totalRefunds) * 100) / 100);
  totalCogs = Math.round(totalCogs * 100) / 100;
  const grossProfit = Math.round((netSales - totalCogs) * 100) / 100;
  const netProfit = Math.round((grossProfit - operatingExpenses) * 100) / 100;

  const grossMarginPct = netSales > 0 ? Math.round((grossProfit / netSales) * 10000) / 100 : 0.00;
  const netMarginPct = netSales > 0 ? Math.round((netProfit / netSales) * 10000) / 100 : 0.00;

  // Breakdown by Payment Channel
  const cashSales = validInvoices.filter(i => i.payment_method === 'CASH').reduce((acc, i) => acc + parseFloat(i.total_amount || 0), 0);
  const upiSales = validInvoices.filter(i => i.payment_method === 'UPI').reduce((acc, i) => acc + parseFloat(i.total_amount || 0), 0);
  const cardSales = validInvoices.filter(i => i.payment_method === 'CARD').reduce((acc, i) => acc + parseFloat(i.total_amount || 0), 0);
  const onlineSales = validInvoices.filter(i => i.invoice_type === 'ONLINE_ORDER').reduce((acc, i) => acc + parseFloat(i.total_amount || 0), 0);
  const posSalesTotal = validInvoices.filter(i => i.invoice_type === 'POS_SALE').reduce((acc, i) => acc + parseFloat(i.total_amount || 0), 0);

  return {
    period: {
      periodType,
      startDate,
      endDate
    },
    statement: {
      grossSales: Math.round(grossSales * 100) / 100,
      discounts: Math.round(totalDiscounts * 100) / 100,
      refunds: Math.round(totalRefunds * 100) / 100,
      netSales,
      cogs: totalCogs,
      grossProfit,
      operatingExpenses,
      netProfit,
      grossMarginPct,
      netMarginPct
    },
    paymentChannels: {
      cashSales: Math.round(cashSales * 100) / 100,
      upiSales: Math.round(upiSales * 100) / 100,
      cardSales: Math.round(cardSales * 100) / 100,
      onlineSales: Math.round(onlineSales * 100) / 100,
      posSales: Math.round(posSalesTotal * 100) / 100
    },
    costMetadata: {
      totalItemsEvaluated: snapshotCostItemsCount + legacyCostItemsCount,
      snapshotCostItemsCount,
      legacyCostItemsCount,
      costStrategy: legacyCostItemsCount > 0 ? 'HYBRID_SNAPSHOT_AND_LEGACY_ESTIMATE' : 'IMMUTABLE_WAC_SNAPSHOT'
    },
    expenseCategories: expenseData.summary.categoryBreakdown
  };
};

module.exports = {
  generateProfitAndLossStatement
};
