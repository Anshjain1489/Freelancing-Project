const assert = require('assert');
const procurementService = require('./services/admin/procurementAdmin.service');
const valuationService = require('./services/admin/inventoryValuation.service');
const purchaseOrderService = require('./services/admin/purchaseOrder.service');
const { authorizeAdmin } = require('./middleware/auth.middleware');
const { HTTP_STATUS } = require('./constants/statusCodes');

console.log('================================================================');
console.log('   CHAUDHARY KIRANA STORE - PHASE 40 PROCUREMENT & QA SUITE     ');
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
    // 1. WEIGHTED-AVERAGE COSTING (WAC) & OPERATIONAL COST SOURCE OF TRUTH (1 - 35)
    // -------------------------------------------------------------------------
    console.log('--- TEST GROUP 1: Weighted-Average Costing (WAC) & Inventory Valuation ---');

    // Test 1.1: Physical Stock before Receipt (Excluding Reserved)
    const inv1 = procurementService.getProductInventory('prod-wac-1');
    inv1.stock_quantity = 20;
    inv1.reserved_quantity = 5; // Reserved stock should be excluded from cost base
    inv1.average_cost_price = 100.00;

    check('Initial physical stock is 20', inv1.stock_quantity === 20);
    check('Initial reserved stock is 5', inv1.reserved_quantity === 5);
    check('Initial average_cost_price is 100.00', inv1.average_cost_price === 100.00);

    // Test 1.2: Single Receipt WAC Calculation
    // Physical stock before = 20, Avg cost = 100.00
    // Receive 10 accepted units @ 160.00 invoice cost
    // Expected new WAC = ((20 * 100) + (10 * 160)) / (20 + 10) = (2000 + 1600) / 30 = 3600 / 30 = 120.00
    const po1 = await purchaseOrderService.createPurchaseOrder({
      supplierId: 'sup-wac-1',
      items: [{ productId: 'prod-wac-1', productName: 'Basmati Rice 5kg', quantityOrdered: 30, unitCostPrice: 160.00 }]
    }, 'admin-1');

    await procurementService.updatePOStatusWithHistory(po1.id, 'PENDING_APPROVAL', 'admin-1');
    await procurementService.updatePOStatusWithHistory(po1.id, 'APPROVED', 'admin-1');
    await procurementService.updatePOStatusWithHistory(po1.id, 'ORDERED', 'admin-1');

    const recResult1 = await procurementService.receivePOItemsAtomic(po1.id, [{
      productId: 'prod-wac-1',
      quantityReceived: 10,
      quantityDamaged: 0,
      quantityMissing: 0,
      unitCostPrice: 160.00
    }], 'admin-1');

    check('Atomic receive returns PARTIALLY_RECEIVED status', recResult1.status === 'PARTIALLY_RECEIVED');
    check('Physical stock updated from 20 + 10 = 30', inv1.stock_quantity === 30);
    check('Reserved stock remains unchanged at 5', inv1.reserved_quantity === 5);
    check('WAC calculated accurately to 120.00', inv1.average_cost_price === 120.00);

    // Test 1.3: Sequential Receipt WAC
    // Physical stock before = 30, Avg cost = 120.00
    // Receive 20 accepted units @ 180.00 invoice cost
    // Expected new WAC = ((30 * 120) + (20 * 180)) / (30 + 20) = (3600 + 3600) / 50 = 7200 / 50 = 144.00
    const recResult2 = await procurementService.receivePOItemsAtomic(po1.id, [{
      productId: 'prod-wac-1',
      quantityReceived: 20,
      quantityDamaged: 0,
      quantityMissing: 0,
      unitCostPrice: 180.00
    }], 'admin-1');

    check('Sequential atomic receive updates PO to RECEIVED', recResult2.status === 'RECEIVED');
    check('Physical stock updated to 30 + 20 = 50', inv1.stock_quantity === 50);
    check('WAC updated to 144.00', inv1.average_cost_price === 144.00);

    // Test 1.4: Zero Stock Initial WAC
    const invZero = procurementService.getProductInventory('prod-zero-stock');
    invZero.stock_quantity = 0;
    invZero.average_cost_price = 0.00;

    const poZero = await purchaseOrderService.createPurchaseOrder({
      supplierId: 'sup-wac-1',
      items: [{ productId: 'prod-zero-stock', productName: 'Salt 1kg', quantityOrdered: 10, unitCostPrice: 25.00 }]
    }, 'admin-1');
    await procurementService.updatePOStatusWithHistory(poZero.id, 'PENDING_APPROVAL', 'admin-1');
    await procurementService.updatePOStatusWithHistory(poZero.id, 'APPROVED', 'admin-1');
    await procurementService.updatePOStatusWithHistory(poZero.id, 'ORDERED', 'admin-1');

    await procurementService.receivePOItemsAtomic(poZero.id, [{
      productId: 'prod-zero-stock',
      quantityReceived: 10,
      quantityDamaged: 0,
      quantityMissing: 0,
      unitCostPrice: 25.00
    }], 'admin-1');

    check('Initial receipt on zero stock sets WAC to 25.00', invZero.average_cost_price === 25.00);
    check('Initial physical stock updated to 10', invZero.stock_quantity === 10);

    // Valuation Summary Report
    const valReport = await valuationService.getInventoryValuationReport();
    check('Valuation report contains summary object', typeof valReport.summary === 'object');
    check('Valuation report totalPhysicalStock is numeric', typeof valReport.summary.totalPhysicalStock === 'number');
    check('Valuation report totalInventoryValuation is numeric', typeof valReport.summary.totalInventoryValuation === 'number');
    check('Valuation report valuationSource is OPERATIONAL_AVERAGE_COST_PRICE', valReport.summary.valuationSource === 'OPERATIONAL_AVERAGE_COST_PRICE');
    check('Valuation report products array is non-empty', Array.isArray(valReport.products) && valReport.products.length > 0);

    // Detailed Product Valuation Checks
    const sampleVal = valReport.products[0];
    check('Product valuation contains productId', typeof sampleVal.productId === 'string');
    check('Product valuation contains productName', typeof sampleVal.productName === 'string');
    check('Product valuation contains physicalStock', typeof sampleVal.physicalStock === 'number');
    check('Product valuation contains averageCostPrice', typeof sampleVal.averageCostPrice === 'number');
    check('Product valuation contains sellingPrice', typeof sampleVal.sellingPrice === 'number');
    check('Product valuation contains lineValuation', typeof sampleVal.lineValuation === 'number');
    check('Product valuation contains grossProfitPerUnit', typeof sampleVal.grossProfitPerUnit === 'number');
    check('Product valuation contains grossMarginPct', typeof sampleVal.grossMarginPct === 'number');

    // Cost History Records
    const cHist = await valuationService.getCostHistory('prod-wac-1');
    check('getCostHistory returns costHistory array', Array.isArray(cHist.costHistory));

    check('prod-wac-1 physical stock is 50', inv1.stock_quantity === 50);
    check('prod-wac-1 average_cost_price is 144', inv1.average_cost_price === 144);
    check('prod-zero-stock physical stock is 10', invZero.stock_quantity === 10);
    check('prod-zero-stock average_cost_price is 25', invZero.average_cost_price === 25);
    check('valReport summary totalProductsCount is integer', Number.isInteger(valReport.summary.totalProductsCount));
    check('valReport summary totalPotentialRevenue is numeric', typeof valReport.summary.totalPotentialRevenue === 'number');
    check('valReport summary totalPotentialProfit is numeric', typeof valReport.summary.totalPotentialProfit === 'number');
    check('valReport summary overallGrossMarginPct is numeric', typeof valReport.summary.overallGrossMarginPct === 'number');
    check('sampleVal category is string', typeof sampleVal.category === 'string');

    // -------------------------------------------------------------------------
    // 2. GOODS RECEIVING WITH ACCEPTED, DAMAGED & MISSING TRACKING (36 - 65)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: Goods Receiving, Damaged & Missing Stock Handling ---');

    const invDam = procurementService.getProductInventory('prod-dam-test');
    invDam.stock_quantity = 100;
    invDam.average_cost_price = 50.00;

    const poDam = await purchaseOrderService.createPurchaseOrder({
      supplierId: 'sup-dam-1',
      items: [{ productId: 'prod-dam-test', productName: 'Glass Bottle Sauce', quantityOrdered: 50, unitCostPrice: 60.00 }]
    }, 'admin-1');

    await procurementService.updatePOStatusWithHistory(poDam.id, 'PENDING_APPROVAL', 'admin-1');
    await procurementService.updatePOStatusWithHistory(poDam.id, 'APPROVED', 'admin-1');
    await procurementService.updatePOStatusWithHistory(poDam.id, 'ORDERED', 'admin-1');

    // Received 40 total: 30 accepted, 6 damaged, 4 missing
    // Accepted = 40 - 6 - 4 = 30
    const recDamRes = await procurementService.receivePOItemsAtomic(poDam.id, [{
      productId: 'prod-dam-test',
      quantityReceived: 40,
      quantityDamaged: 6,
      quantityMissing: 4,
      unitCostPrice: 60.00
    }], 'admin-1');

    check('Atomic receive summary contains 1 item', recDamRes.receivingSummary.length === 1);
    const summaryItem = recDamRes.receivingSummary[0];
    check('Summary item received is 40', summaryItem.received === 40);
    check('Summary item accepted is 30', summaryItem.accepted === 30);
    check('Summary item damaged is 6', summaryItem.damaged === 6);
    check('Summary item missing is 4', summaryItem.missing === 4);

    // Only accepted 30 units added to physical stock: 100 + 30 = 130
    check('Physical stock increases ONLY by accepted quantity (100 + 30 = 130)', invDam.stock_quantity === 130);

    // WAC updated with accepted quantity: ((100 * 50) + (30 * 60)) / 130 = (5000 + 1800) / 130 = 6800 / 130 = 52.31
    check('WAC updated using accepted quantity to 52.31', invDam.average_cost_price === 52.31);

    // Damaged + Missing Exceed Received Rejection Guard
    let errDamExceed = null;
    try {
      await procurementService.receivePOItemsAtomic(poDam.id, [{
        productId: 'prod-dam-test',
        quantityReceived: 10,
        quantityDamaged: 8,
        quantityMissing: 5 // 8 + 5 = 13 > 10
      }], 'admin-1');
    } catch (e) { errDamExceed = e; }
    check('Rejects damaged + missing > received with 400 Bad Request', errDamExceed && errDamExceed.statusCode === HTTP_STATUS.BAD_REQUEST);

    // Negative Quantity Input Rejection Guard
    let errNegQty = null;
    try {
      await procurementService.receivePOItemsAtomic(poDam.id, [{
        productId: 'prod-dam-test',
        quantityReceived: -5,
        quantityDamaged: 0,
        quantityMissing: 0
      }], 'admin-1');
    } catch (e) { errNegQty = e; }
    check('Rejects negative quantity with 400 Bad Request', errNegQty && errNegQty.statusCode === HTTP_STATUS.BAD_REQUEST);

    // Zero Accepted Quantity (All Damaged/Missing)
    const invAllDam = procurementService.getProductInventory('prod-all-dam');
    invAllDam.stock_quantity = 50;
    invAllDam.average_cost_price = 40.00;

    const poAllDam = await purchaseOrderService.createPurchaseOrder({
      supplierId: 'sup-dam-1',
      items: [{ productId: 'prod-all-dam', productName: 'Eggs 12-Pack', quantityOrdered: 10, unitCostPrice: 60.00 }]
    }, 'admin-1');
    await procurementService.updatePOStatusWithHistory(poAllDam.id, 'PENDING_APPROVAL', 'admin-1');
    await procurementService.updatePOStatusWithHistory(poAllDam.id, 'APPROVED', 'admin-1');
    await procurementService.updatePOStatusWithHistory(poAllDam.id, 'ORDERED', 'admin-1');

    await procurementService.receivePOItemsAtomic(poAllDam.id, [{
      productId: 'prod-all-dam',
      quantityReceived: 10,
      quantityDamaged: 10,
      quantityMissing: 0,
      unitCostPrice: 60.00
    }], 'admin-1');

    check('Zero accepted quantity does not change physical stock (remains 50)', invAllDam.stock_quantity === 50);
    check('Zero accepted quantity does not change WAC (remains 40.00)', invAllDam.average_cost_price === 40.00);

    // Additional receiving checks
    check('poDam items array line_item has quantity_damaged 6', poDam.items[0].quantity_damaged === 6);
    check('poDam items array line_item has quantity_missing 4', poDam.items[0].quantity_missing === 4);
    check('poAllDam items array line_item has quantity_damaged 10', poAllDam.items[0].quantity_damaged === 10);
    check('poAllDam items array line_item has quantity_missing 0', poAllDam.items[0].quantity_missing === 0);

    check('summaryItem productId matches input', summaryItem.productId === 'prod-dam-test');
    check('summaryItem productName matches input', summaryItem.productName === 'Glass Bottle Sauce');
    check('summaryItem oldCostPrice is 50.00', summaryItem.oldCostPrice === 50.00);
    check('summaryItem newCostPrice is 52.31', summaryItem.newCostPrice === 52.31);
    check('summaryItem newPhysicalStock is 130', summaryItem.newPhysicalStock === 130);

    // -------------------------------------------------------------------------
    // 3. MULTI-PRODUCT PO EDITING, LIFECYCLE & AUDIT TRAIL (56 - 80)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Multi-Product PO Editing, Lifecycle & Status History ---');

    // Create DRAFT PO
    const draftPo = await purchaseOrderService.createPurchaseOrder({
      supplierId: 'sup-edit-1',
      items: [
        { productId: 'p-edit-1', productName: 'Sugar 1kg', quantityOrdered: 20, unitCostPrice: 40.00 },
        { productId: 'p-edit-2', productName: 'Tea 250g', quantityOrdered: 10, unitCostPrice: 110.00 }
      ]
    }, 'admin-1');

    check('DRAFT PO created with 2 items', draftPo.items.length === 2);
    check('DRAFT PO initial total is 1900.00', draftPo.total_amount === 1900.00);

    // Edit DRAFT PO
    const editedPo = await procurementService.editDraftPurchaseOrder(draftPo.id, {
      notes: 'Updated wholesale order details',
      items: [
        { productId: 'p-edit-1', productName: 'Sugar 1kg', quantityOrdered: 30, unitCostPrice: 40.00 },
        { productId: 'p-edit-2', productName: 'Tea 250g', quantityOrdered: 15, unitCostPrice: 110.00 }
      ]
    }, 'admin-1');

    check('Edited DRAFT PO notes updated', editedPo.notes === 'Updated wholesale order details');
    check('Edited DRAFT PO total_amount updated to 2850.00 (30*40 + 15*110)', editedPo.total_amount === 2850.00);

    // Transition Lifecycle: DRAFT -> PENDING_APPROVAL -> APPROVED -> ORDERED
    const t1 = await procurementService.updatePOStatusWithHistory(draftPo.id, 'PENDING_APPROVAL', 'admin-1', 'Submitted for review');
    check('Transition to PENDING_APPROVAL successful', t1.po.status === 'PENDING_APPROVAL');
    check('Status history recorded previous status DRAFT', t1.historyRecord.previous_status === 'DRAFT');

    const t2 = await procurementService.updatePOStatusWithHistory(draftPo.id, 'APPROVED', 'admin-super', 'Approved by manager');
    check('Transition to APPROVED successful', t2.po.status === 'APPROVED');
    check('APPROVED PO sets approved_by', t2.po.approved_by === 'admin-super');

    // Edit Lock Rejection Guard for APPROVED PO
    let errEditLock = null;
    try {
      await procurementService.editDraftPurchaseOrder(draftPo.id, { notes: 'Illegal edit attempt' }, 'admin-1');
    } catch (e) { errEditLock = e; }
    check('Rejects editing APPROVED PO with 400 Bad Request', errEditLock && errEditLock.statusCode === HTTP_STATUS.BAD_REQUEST);

    const t3 = await procurementService.updatePOStatusWithHistory(draftPo.id, 'ORDERED', 'admin-1', 'Placed order with vendor');
    check('Transition to ORDERED successful', t3.po.status === 'ORDERED');

    // Invalid Transition Rejection Guard (ORDERED -> DRAFT)
    let errInvalidTrans = null;
    try {
      await procurementService.updatePOStatusWithHistory(draftPo.id, 'DRAFT', 'admin-1');
    } catch (e) { errInvalidTrans = e; }
    check('Rejects invalid transition ORDERED -> DRAFT with 409 CONFLICT', errInvalidTrans && errInvalidTrans.statusCode === HTTP_STATUS.CONFLICT);
    check('Error code is INVALID_PO_STATUS_TRANSITION', errInvalidTrans && errInvalidTrans.code === 'INVALID_PO_STATUS_TRANSITION');

    // Status History Audit Trail
    const poHistoryList = procurementService.mockStatusHistoryMap.get(draftPo.id) || [];
    check('PO status history recorded 3 transition logs', poHistoryList.length === 3);
    check('History log 1 new_status is PENDING_APPROVAL', poHistoryList[0].new_status === 'PENDING_APPROVAL');
    check('History log 2 new_status is APPROVED', poHistoryList[1].new_status === 'APPROVED');
    check('History log 3 new_status is ORDERED', poHistoryList[2].new_status === 'ORDERED');

    check('draftPo po_number is non-empty string', typeof draftPo.po_number === 'string');
    check('editedPo items line 1 quantity_ordered is 30', editedPo.items[0].quantity_ordered === 30);
    check('editedPo items line 2 quantity_ordered is 15', editedPo.items[1].quantity_ordered === 15);
    check('t1 historyRecord changed_by is admin-1', t1.historyRecord.changed_by === 'admin-1');
    check('t2 historyRecord changed_by is admin-super', t2.historyRecord.changed_by === 'admin-super');

    // -------------------------------------------------------------------------
    // 4. IMMUTABLE STOCK ADJUSTMENTS & REVERSALS (81 - 98)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: Immutable Stock Adjustments & Compensating Reversals ---');

    const invAdjProd = procurementService.getProductInventory('prod-adj-test');
    invAdjProd.stock_quantity = 50;
    invAdjProd.average_cost_price = 80.00;

    // Create Stock Adjustment: Damage (-5 units)
    const adj1 = await valuationService.createStockAdjustment({
      productId: 'prod-adj-test',
      quantityChange: -5,
      reason: 'DAMAGE',
      unitCost: 80.00,
      notes: 'Water damage in warehouse'
    }, 'admin-1');

    check('Stock adjustment created with ID', typeof adj1.adjustment.id === 'string');
    check('Stock adjustment quantity_change is -5', adj1.adjustment.quantity_change === -5);
    check('Stock adjustment reason is DAMAGE', adj1.adjustment.reason === 'DAMAGE');
    check('Stock adjustment total_loss_value calculated (5 * 80 = 400.00)', adj1.adjustment.total_loss_value === 400.00);
    check('Physical stock reduced from 50 to 45', adj1.newPhysicalStock === 45);

    // Negative Inventory Prevention Guard
    let errNegInv = null;
    try {
      await valuationService.createStockAdjustment({
        productId: 'prod-adj-test',
        quantityChange: -100,
        reason: 'THEFT_LOSS'
      }, 'admin-1');
    } catch (e) { errNegInv = e; }
    check('Rejects adjustment causing negative inventory with 400 Bad Request', errNegInv && errNegInv.statusCode === HTTP_STATUS.BAD_REQUEST);

    // Invalid Reason Rejection Guard
    let errInvalidReason = null;
    try {
      await valuationService.createStockAdjustment({
        productId: 'prod-adj-test',
        quantityChange: -2,
        reason: 'INVALID_REASON'
      }, 'admin-1');
    } catch (e) { errInvalidReason = e; }
    check('Rejects invalid adjustment reason with 400 Bad Request', errInvalidReason && errInvalidReason.statusCode === HTTP_STATUS.BAD_REQUEST);

    // Compensating Stock Adjustment Reversal (+5 units)
    const revAdj = await valuationService.reverseStockAdjustment(adj1.adjustment.id, 'Correction for incorrect damage report', 'admin-1');
    check('Reversal adjustment created with ID', typeof revAdj.adjustment.id === 'string');
    check('Reversal quantity_change is +5 (inverse of -5)', revAdj.adjustment.quantity_change === 5);
    check('Reversal references original adjustment ID', revAdj.adjustment.reverses_adjustment_id === adj1.adjustment.id);
    check('Reversal reason is MANUAL_CORRECTION', revAdj.adjustment.reason === 'MANUAL_CORRECTION');
    check('Physical stock restored from 45 back to 50', revAdj.newPhysicalStock === 50);

    // Fetch Adjustments History
    const allAdjs = await valuationService.getStockAdjustments();
    check('getStockAdjustments returns array of adjustments', Array.isArray(allAdjs.adjustments) && allAdjs.adjustments.length >= 2);

    check('adj1 adjustment product_id is prod-adj-test', adj1.adjustment.product_id === 'prod-adj-test');
    check('revAdj adjustment unit_cost is 80', revAdj.adjustment.unit_cost === 80);
    check('revAdj adjustment created_by is admin-1', revAdj.adjustment.created_by === 'admin-1');

    // -------------------------------------------------------------------------
    // 5. DETERMINISTIC AUTOMATED PROCUREMENT & UNASSIGNED SUPPLIERS (99 - 105)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: Deterministic Auto-Procurement & Unassigned Suppliers ---');

    const autoProcRes = await procurementService.generateAutomatedProcurementGrouped('admin-1');
    check('generateAutomatedProcurementGrouped returns createdPOsCount integer', typeof autoProcRes.createdPOsCount === 'number');
    check('generateAutomatedProcurementGrouped returns createdPOs array', Array.isArray(autoProcRes.createdPOs));
    check('generateAutomatedProcurementGrouped returns unassignedCount integer', typeof autoProcRes.unassignedCount === 'number');
    check('generateAutomatedProcurementGrouped returns unassignedProducts array', Array.isArray(autoProcRes.unassignedProducts));
    check('unassignedProducts elements contain issue UNASSIGNED_SUPPLIER if present', autoProcRes.unassignedProducts.every(u => u.issue === 'UNASSIGNED_SUPPLIER'));

    // -------------------------------------------------------------------------
    // 6. SUPPLIER PERFORMANCE INTELLIGENCE & SENSITIVE BANK DATA PROTECTION (106 - 115)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 6: Supplier Performance Intelligence & Sensitive Bank Details RBAC ---');

    await purchaseOrderService.createSupplier({ name: 'Alpha Wholesalers', phone: '9998887770', leadTimeDays: 3 });

    // Super Admin request (unmasked bank details)
    const supPerfSuper = await procurementService.getSuppliersWithPerformance({ role: 'SUPER_ADMIN', is_super_admin: true });
    check('getSuppliersWithPerformance returns suppliers array', Array.isArray(supPerfSuper.suppliers) && supPerfSuper.suppliers.length > 0);
    const sampleSupSuper = supPerfSuper.suppliers[0];
    check('Supplier record contains performance object', typeof sampleSupSuper.performance === 'object');
    check('Performance contains on_time_delivery_pct', typeof sampleSupSuper.performance.on_time_delivery_pct === 'number');
    check('Performance contains avg_lead_time_days', typeof sampleSupSuper.performance.avg_lead_time_days === 'number');
    check('Performance contains lead_time_variance_days', typeof sampleSupSuper.performance.lead_time_variance_days === 'number');
    check('Performance contains supplier_fill_rate_pct', typeof sampleSupSuper.performance.supplier_fill_rate_pct === 'number');

    // Normal Admin request (masked bank details)
    const supPerfNormal = await procurementService.getSuppliersWithPerformance({ role: 'ADMIN', is_super_admin: false });
    const sampleSupNormal = supPerfNormal.suppliers[0];
    check('Non-super-admin request masks bank details account number', !sampleSupNormal.bank_details || sampleSupNormal.bank_details.account_number.includes('••••'));

    // Security RBAC Barriers
    let rbacCustBlocked = false;
    authorizeAdmin({ user: { role: 'CUSTOMER' } }, { status: () => {}, json: () => {} }, (err) => {
      if (err && err.statusCode === HTTP_STATUS.FORBIDDEN) rbacCustBlocked = true;
    });
    check('authorizeAdmin middleware blocks Customer from procurement endpoints with 403 Forbidden', rbacCustBlocked);

    let rbacDpBlocked = false;
    authorizeAdmin({ user: { role: 'DELIVERY_PARTNER' } }, { status: () => {}, json: () => {} }, (err) => {
      if (err && err.statusCode === HTTP_STATUS.FORBIDDEN) rbacDpBlocked = true;
    });
    check('authorizeAdmin middleware blocks Delivery Partner from procurement endpoints with 403 Forbidden', rbacDpBlocked);

    let rbacAdminAllowed = false;
    authorizeAdmin({ user: { role: 'ADMIN' } }, { status: () => {}, json: () => {} }, (err) => {
      if (!err) rbacAdminAllowed = true;
    });
    check('authorizeAdmin middleware permits ADMIN role to access procurement endpoints', rbacAdminAllowed);

    check('supPerfSuper suppliers count > 0', supPerfSuper.suppliers.length > 0);
    check('supPerfNormal suppliers count matches super admin count', supPerfNormal.suppliers.length === supPerfSuper.suppliers.length);
    check('sampleSupSuper rating is numeric', typeof sampleSupSuper.performance.rating === 'number');

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`   TOTAL PASSED ASSERTIONS: ${passCount} / ${totalAssertions}`);
    console.log('   STATUS: ALL PHASE 40 PROCUREMENT & QA TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('================================================================\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ TEST SUITE RUNTIME FAILURE:', err);
    process.exit(1);
  }
}

runTests();
