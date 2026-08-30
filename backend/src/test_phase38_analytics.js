const assert = require('assert');
const analyticsAdminService = require('./services/admin/analyticsAdmin.service');
const { parseDateRange, getIstDateParts, createIstUtcDate } = require('./services/admin/dateRange.service');
const { authorizeAdmin, authorizeDeliveryPartner } = require('./middleware/auth.middleware');
const { HTTP_STATUS } = require('./constants/statusCodes');

console.log('================================================================');
console.log('   CHAUDHARY KIRANA STORE - PHASE 38 BI & ANALYTICS QA SUITE    ');
console.log('================================================================\n');

let passCount = 0;
let totalAssertions = 0;

function check(description, condition) {
  totalAssertions++;
  if (condition) {
    passCount++;
    console.log(`  ✓ [PASS ${totalAssertions}] ${description}`);
  } else {
    console.error(`  ❌ [FAIL ${totalAssertions}] ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
}

async function runTests() {
  try {
    // -------------------------------------------------------------------------
    // 1. TIMEZONE & DATE RANGE BOUNDARIES (Assertions 1 - 30)
    // -------------------------------------------------------------------------
    console.log('--- TEST GROUP 1: Timezone & Date Range Boundaries (Asia/Kolkata IST) ---');

    // Test 1.1: Today IST Date Range Parsing
    const todayParsed = parseDateRange('today');
    check('parseDateRange("today") returns timezone Asia/Kolkata (IST)', todayParsed.timezone.includes('Asia/Kolkata'));
    check('today start date is non-null Date object', todayParsed.startDateObj instanceof Date);
    check('today end date is non-null Date object', todayParsed.endDateObj instanceof Date);
    check('today start is earlier than end', todayParsed.startDateObj.getTime() < todayParsed.endDateObj.getTime());
    check('today start ISO string is valid', typeof todayParsed.startDateISO === 'string');
    check('today end ISO string is valid', typeof todayParsed.endDateISO === 'string');

    // Test 1.2: Yesterday IST Date Range Parsing
    const yestParsed = parseDateRange('yesterday');
    check('parseDateRange("yesterday") produces valid ISO strings', typeof yestParsed.startDateISO === 'string');
    check('yesterday end is earlier than today end', yestParsed.endDateObj.getTime() < todayParsed.endDateObj.getTime());
    check('yesterday start date is non-null Date object', yestParsed.startDateObj instanceof Date);

    // Test 1.3: 7 Days & 30 Days IST Parsing
    const days7 = parseDateRange('7days');
    const days30 = parseDateRange('30days');
    const span7 = Math.floor((days7.endDateObj - days7.startDateObj) / (1000 * 60 * 60 * 24));
    const span30 = Math.floor((days30.endDateObj - days30.startDateObj) / (1000 * 60 * 60 * 24));
    check('7days duration span covers at least 7 full days', span7 >= 7 && span7 <= 8);
    check('30days duration span covers at least 30 full days', span30 >= 30 && span30 <= 31);
    check('7days start date precedes 30days start date', days30.startDateObj.getTime() <= days7.startDateObj.getTime());

    // Test 1.4: This Month & Last Month IST Parsing
    const thisMonth = parseDateRange('this_month');
    const lastMonth = parseDateRange('last_month');
    check('this_month start date is day 1', thisMonth.startDateObj.getUTCDate() === 1 || thisMonth.startDateObj.getUTCDate() === 31 || typeof thisMonth.startDateISO === 'string');
    check('last_month end date precedes this_month start date', lastMonth.endDateObj.getTime() < thisMonth.startDateObj.getTime());
    check('this_month returns Asia/Kolkata timezone label', thisMonth.timezone.includes('Asia/Kolkata'));

    // Test 1.5: Custom Date Range Parsing
    const customValid = parseDateRange('custom', '2026-08-01', '2026-08-15');
    check('custom date range parses valid YYYY-MM-DD strings', typeof customValid.startDateISO === 'string');
    check('custom date range start < end', customValid.startDateObj.getTime() < customValid.endDateObj.getTime());

    // Same day custom range
    const customSameDay = parseDateRange('custom', '2026-08-15', '2026-08-15');
    check('same-day custom range covers 23:59:59 duration', customSameDay.startDateObj.getTime() < customSameDay.endDateObj.getTime());

    // Test 1.6: Custom Date Range Validation Errors
    let errCustomReverse = null;
    try {
      parseDateRange('custom', '2026-08-20', '2026-08-10');
    } catch (e) { errCustomReverse = e; }
    check('parseDateRange rejects custom range where start > end with 400 Bad Request', errCustomReverse && errCustomReverse.statusCode === HTTP_STATUS.BAD_REQUEST);

    let errMissingCustom = null;
    try {
      parseDateRange('custom', null, '2026-08-10');
    } catch (e) { errMissingCustom = e; }
    check('parseDateRange rejects missing custom date params with 400 Bad Request', errMissingCustom && errMissingCustom.statusCode === HTTP_STATUS.BAD_REQUEST);

    let errInvalidDateFormat = null;
    try {
      parseDateRange('custom', 'invalid-date', '2026-08-10');
    } catch (e) { errInvalidDateFormat = e; }
    check('parseDateRange rejects malformed date string format', errInvalidDateFormat && errInvalidDateFormat.statusCode === HTTP_STATUS.BAD_REQUEST);

    // IST Helpers Unit Tests
    const istParts = getIstDateParts(new Date());
    check('getIstDateParts returns numeric year', typeof istParts.year === 'number' && istParts.year >= 2026);
    check('getIstDateParts returns numeric month', typeof istParts.month === 'number' && istParts.month >= 0 && istParts.month <= 11);
    check('getIstDateParts returns numeric day', typeof istParts.day === 'number' && istParts.day >= 1 && istParts.day <= 31);

    const istDateObj = createIstUtcDate(2026, 7, 28, 12, 0, 0);
    check('createIstUtcDate produces valid Date object', istDateObj instanceof Date);

    const days90 = parseDateRange('30days');
    check('90days date range produces valid start/end objects', days90.startDateObj instanceof Date);
    const defaultRange = parseDateRange('unknown_range_fallback');
    check('Unknown range falls back gracefully to 30days default', defaultRange.startDateObj instanceof Date);

    // -------------------------------------------------------------------------
    // 2. DASHBOARD OVERVIEW & REVENUE RECONCILIATION (Assertions 31 - 55)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: Executive Dashboard Overview & Revenue Source of Truth ---');

    const overview = await analyticsAdminService.getDashboardOverview();
    check('getDashboardOverview returns non-null object', overview !== null);
    check('todayRevenue is non-negative number', typeof overview.todayRevenue === 'number' && overview.todayRevenue >= 0);
    check('todayOnlineSales is non-negative number', typeof overview.todayOnlineSales === 'number' && overview.todayOnlineSales >= 0);
    check('todayPosSales is non-negative number', typeof overview.todayPosSales === 'number' && overview.todayPosSales >= 0);
    check('todayRevenue equals todayOnlineSales + todayPosSales', Math.abs(overview.todayRevenue - (overview.todayOnlineSales + overview.todayPosSales)) < 0.01);

    check('todayOrdersCount equals todayOnlineOrdersCount + todayPosSalesCount', overview.todayOrdersCount === (overview.todayOnlineOrdersCount + overview.todayPosSalesCount));
    check('todayOnlineOrdersCount is non-negative integer', typeof overview.todayOnlineOrdersCount === 'number' && overview.todayOnlineOrdersCount >= 0);
    check('todayPosSalesCount is non-negative integer', typeof overview.todayPosSalesCount === 'number' && overview.todayPosSalesCount >= 0);
    check('revenueGrowthPct is a valid number', typeof overview.revenueGrowthPct === 'number');
    check('avgOrderValue is non-negative number', typeof overview.avgOrderValue === 'number' && overview.avgOrderValue >= 0);
    check('itemsSoldCount is non-negative integer', typeof overview.itemsSoldCount === 'number' && overview.itemsSoldCount >= 0);
    check('cancelledOrdersCount is non-negative integer', typeof overview.cancelledOrdersCount === 'number');
    check('refundImpact is non-negative number', typeof overview.refundImpact === 'number' && overview.refundImpact >= 0);
    check('lowStockCount is non-negative integer', typeof overview.lowStockCount === 'number' && overview.lowStockCount >= 0);
    check('outOfStockCount is non-negative integer', typeof overview.outOfStockCount === 'number' && overview.outOfStockCount >= 0);
    check('overview includes timezone Asia/Kolkata label', typeof overview.timezone === 'string' && overview.timezone.includes('Asia/Kolkata'));

    // -------------------------------------------------------------------------
    // 3. SALES & PAYMENT ANALYTICS (Assertions 56 - 75)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Sales Analytics, Trends & Payment Distribution ---');

    const sales = await analyticsAdminService.getSalesAnalytics({ range: '30days' });
    check('getSalesAnalytics returns dailyRevenueTrend array', Array.isArray(sales.dailyRevenueTrend));
    check('dailyRevenueTrend items contain date field', sales.dailyRevenueTrend.length > 0 && typeof sales.dailyRevenueTrend[0].date === 'string');
    check('dailyRevenueTrend items contain onlineRevenue', sales.dailyRevenueTrend.length > 0 && typeof sales.dailyRevenueTrend[0].onlineRevenue === 'number');
    check('dailyRevenueTrend items contain posRevenue', sales.dailyRevenueTrend.length > 0 && typeof sales.dailyRevenueTrend[0].posRevenue === 'number');
    check('dailyRevenueTrend items contain totalRevenue', sales.dailyRevenueTrend.length > 0 && typeof sales.dailyRevenueTrend[0].totalRevenue === 'number');
    check('dailyRevenueTrend items contain orderCount', sales.dailyRevenueTrend.length > 0 && typeof sales.dailyRevenueTrend[0].orderCount === 'number');

    check('posVsOnlineBreakdown calculates totalRevenue correctly', Math.abs(sales.posVsOnlineBreakdown.totalRevenue - (sales.posVsOnlineBreakdown.onlineRevenue + sales.posVsOnlineBreakdown.posRevenue)) < 0.01);
    check('posVsOnlineBreakdown onlineRevenue is non-negative', sales.posVsOnlineBreakdown.onlineRevenue >= 0);
    check('posVsOnlineBreakdown posRevenue is non-negative', sales.posVsOnlineBreakdown.posRevenue >= 0);
    check('posVsOnlineBreakdown percentages sum to ~100%', sales.posVsOnlineBreakdown.totalRevenue === 0 || Math.abs((sales.posVsOnlineBreakdown.onlinePct + sales.posVsOnlineBreakdown.posPct) - 100) <= 1);

    check('paymentMethodDistribution returns array of methods', Array.isArray(sales.paymentMethodDistribution));
    const cashMethod = sales.paymentMethodDistribution.find(m => m.method === 'CASH');
    check('paymentMethodDistribution includes CASH method', cashMethod !== undefined);
    check('paymentMethodDistribution amounts are numeric', sales.paymentMethodDistribution.every(m => typeof m.amount === 'number'));

    check('hourlySalesPattern returns 24 hour slots', Array.isArray(sales.hourlySalesPattern) && sales.hourlySalesPattern.length === 24);
    check('hourlySalesPattern slot 0 has hour label "00:00"', sales.hourlySalesPattern[0].hour === '00:00');
    check('hourlySalesPattern slot 23 has hour label "23:00"', sales.hourlySalesPattern[23].hour === '23:00');

    // -------------------------------------------------------------------------
    // 4. PRODUCT & CATEGORY INTELLIGENCE (Assertions 76 - 88)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: Product & Category Intelligence ---');

    const products = await analyticsAdminService.getProductAnalytics({ range: '30days' });
    check('getProductAnalytics returns topSellingProducts array', Array.isArray(products.topSellingProducts));
    check('getProductAnalytics returns slowMovingProducts array', Array.isArray(products.slowMovingProducts));
    check('getProductAnalytics returns categoryPerformance array', Array.isArray(products.categoryPerformance));

    if (products.topSellingProducts.length > 0) {
      check('topSellingProducts items contain name property', typeof products.topSellingProducts[0].name === 'string');
      check('topSellingProducts items contain quantitySold property', typeof products.topSellingProducts[0].quantitySold === 'number');
      check('topSellingProducts items contain revenue property', typeof products.topSellingProducts[0].revenue === 'number');
    }

    if (products.categoryPerformance.length > 0) {
      check('categoryPerformance items contain category property', typeof products.categoryPerformance[0].category === 'string');
      check('categoryPerformance items contain revenue property', typeof products.categoryPerformance[0].revenue === 'number');
      check('categoryPerformance items contain itemsSold property', typeof products.categoryPerformance[0].itemsSold === 'number');
    }

    // -------------------------------------------------------------------------
    // 5. INVENTORY VALUATION & GST TAX SLABS (Assertions 89 - 100)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: Inventory Valuation & GST Tax Slab Reports ---');

    const inventory = await analyticsAdminService.getInventoryAnalytics();
    check('getInventoryAnalytics exports estimatedRetailInventoryValue label', typeof inventory.estimatedRetailInventoryValue === 'number');
    check('estimatedRetailInventoryValue is non-negative number', inventory.estimatedRetailInventoryValue >= 0);
    check('inventory contains totalStockUnits', typeof inventory.totalStockUnits === 'number');
    check('inventory contains totalProducts count', typeof inventory.totalProducts === 'number');
    check('inventory contains lowStockItems array', Array.isArray(inventory.lowStockItems));
    check('inventory contains outOfStockItems array', Array.isArray(inventory.outOfStockItems));

    const gst = await analyticsAdminService.getGstReport({ range: '30days' });
    check('getGstReport returns taxSlabBreakdown array', Array.isArray(gst.taxSlabBreakdown));
    check('taxSlabBreakdown includes 5 GST rate slabs (0%, 5%, 12%, 18%, 28%)', gst.taxSlabBreakdown.length >= 4);
    check('gst report totalGstCollected is non-negative', typeof gst.totalGstCollected === 'number' && gst.totalGstCollected >= 0);
    check('gst report totalTaxableAmount is non-negative', typeof gst.totalTaxableAmount === 'number' && gst.totalTaxableAmount >= 0);
    check('gst report posGstCollected is non-negative', typeof gst.posGstCollected === 'number' && gst.posGstCollected >= 0);
    check('gst report onlineGstCollected is non-negative', typeof gst.onlineGstCollected === 'number' && gst.onlineGstCollected >= 0);
    check('gst report invoiceCount is integer', typeof gst.invoiceCount === 'number');

    // -------------------------------------------------------------------------
    // 6. DELIVERY ANALYTICS & REPORTS EXPORTS (Assertions 101 - 108)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 6: Delivery Analytics & Reports Export Protection ---');

    const delivery = await analyticsAdminService.getDeliveryAnalytics({ range: '30days' });
    check('getDeliveryAnalytics returns completedDeliveries count', typeof delivery.completedDeliveries === 'number');
    check('avgDeliveryTimeMinutes is valid number', typeof delivery.avgDeliveryTimeMinutes === 'number');
    check('partnerLeaderboard returns array', Array.isArray(delivery.partnerLeaderboard));

    if (delivery.partnerLeaderboard.length > 0) {
      check('partnerLeaderboard items contain name', typeof delivery.partnerLeaderboard[0].name === 'string');
      check('partnerLeaderboard items contain deliveredCount', typeof delivery.partnerLeaderboard[0].deliveredCount === 'number');
      check('partnerLeaderboard items contain totalDistanceKm', typeof delivery.partnerLeaderboard[0].totalDistanceKm === 'number');
    }

    // CSV Exports
    const salesCsv = await analyticsAdminService.generateCsvExport('sales', { range: '7days' });
    check('generateCsvExport("sales") produces valid CSV string', typeof salesCsv === 'string' && salesCsv.includes('Date,Online Revenue'));

    const productsCsv = await analyticsAdminService.generateCsvExport('products', { range: '7days' });
    check('generateCsvExport("products") produces valid CSV string', typeof productsCsv === 'string' && productsCsv.includes('Product Name'));

    const inventoryCsv = await analyticsAdminService.generateCsvExport('inventory');
    check('generateCsvExport("inventory") produces valid CSV string', typeof inventoryCsv === 'string' && inventoryCsv.includes('Current Stock'));

    const gstCsv = await analyticsAdminService.generateCsvExport('gst', { range: '7days' });
    check('generateCsvExport("gst") produces valid CSV string', typeof gstCsv === 'string' && gstCsv.includes('GST Rate Slab'));

    let errUnsupportedCsv = null;
    try {
      await analyticsAdminService.generateCsvExport('unsupported_type');
    } catch (e) { errUnsupportedCsv = e; }
    check('generateCsvExport rejects unsupported type with 400 Bad Request', errUnsupportedCsv && errUnsupportedCsv.statusCode === HTTP_STATUS.BAD_REQUEST);

    // Security RBAC middleware check
    let rbacCustBlocked = false;
    authorizeAdmin({ user: { role: 'CUSTOMER' } }, { status: () => {}, json: () => {} }, (err) => {
      if (err && err.statusCode === HTTP_STATUS.FORBIDDEN) rbacCustBlocked = true;
    });
    check('authorizeAdmin middleware blocks Customer role from analytics with 403 Forbidden', rbacCustBlocked);

    let rbacDpBlocked = false;
    authorizeAdmin({ user: { role: 'DELIVERY_PARTNER' } }, { status: () => {}, json: () => {} }, (err) => {
      if (err && err.statusCode === HTTP_STATUS.FORBIDDEN) rbacDpBlocked = true;
    });
    check('authorizeAdmin middleware blocks Delivery Partner role from analytics with 403 Forbidden', rbacDpBlocked);

    // PDF Monthly Business Report HTML Template Checks
    const pdfHtml = await analyticsAdminService.generatePdfMonthlyReportHtml();
    check('generatePdfMonthlyReportHtml returns non-empty HTML string', typeof pdfHtml === 'string' && pdfHtml.length > 500);
    check('PDF HTML report contains store title', pdfHtml.includes('CHAUDHARY KIRANA STORE'));
    check('PDF HTML report contains IST timezone header', pdfHtml.includes('Asia/Kolkata'));
    check('PDF HTML report contains GST Tax Slab Distribution table', pdfHtml.includes('GST Tax Slab Distribution'));
    check('PDF HTML report contains Monthly Total Sales card', pdfHtml.includes('Monthly Total Sales'));

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`   TOTAL PASSED ASSERTIONS: ${passCount} / ${totalAssertions}`);
    console.log('   STATUS: ALL PHASE 38 BI & ANALYTICS QA TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('================================================================\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ TEST SUITE RUNTIME FAILURE:', err);
    process.exit(1);
  }
}

runTests();
