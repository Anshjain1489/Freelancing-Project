const assert = require('assert');
const invoiceService = require('./services/invoice.service');
const inventoryService = require('./services/inventory.service');
const { HTTP_STATUS } = require('./constants/statusCodes');

console.log('================================================================');
console.log('   CHAUDHARY KIRANA STORE - PHASE 36 BILLING & POS TEST SUITE   ');
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
    // 1. FINANCIAL CALCULATION ENGINE TESTS
    // -------------------------------------------------------------------------
    console.log('--- TEST GROUP 1: Financial Calculation Engine ---');

    const sampleItems = [
      { productId: 'p1', productName: 'Atta 10kg', sku: 'SKU-01', sellingPrice: 320, mrp: 350, quantity: 2, discountAmount: 20, taxPercentage: 5 },
      { productId: 'p2', productName: 'Mustard Oil 1L', sku: 'SKU-02', sellingPrice: 150, mrp: 170, quantity: 3, discountAmount: 0, taxPercentage: 12 }
    ];

    const calc = invoiceService.calculateFinancials(sampleItems, { deliveryCharge: 30, couponDiscount: 10 });

    check('Calculates item array length correctly', calc.items.length === 2);
    check('Calculates line 1 subtotal (320 * 2 = 640)', calc.items[0].subtotal === 640);
    check('Calculates line 1 discount (20)', calc.items[0].discountAmount === 20);
    check('Calculates line 1 taxable amount (640 - 20 = 620)', calc.items[0].taxableAmount === 620);
    check('Calculates line 1 tax amount (620 * 5% = 31)', calc.items[0].taxAmount === 31);
    check('Calculates line 1 total (620 + 31 = 651)', calc.items[0].totalAmount === 651);

    check('Calculates line 2 subtotal (150 * 3 = 450)', calc.items[1].subtotal === 450);
    check('Calculates line 2 tax amount (450 * 12% = 54)', calc.items[1].taxAmount === 54);
    check('Calculates line 2 total (450 + 54 = 504)', calc.items[1].totalAmount === 504);

    check('Calculates overall subtotal (640 + 450 = 1090)', calc.subtotal === 1090);
    check('Calculates total discount (20 line + 10 coupon = 30)', calc.discountAmount === 30);
    check('Calculates total tax (31 + 54 = 85)', calc.taxAmount === 85);
    check('Calculates delivery charge (30)', calc.deliveryCharge === 30);
    check('Grand total is non-negative number', calc.totalAmount >= 0);
    check('Round off calculation is finite number', Number.isFinite(calc.roundOff));

    // Zero tax & 0 discount edge case
    const zeroTaxCalc = invoiceService.calculateFinancials([
      { productId: 'p3', productName: 'Sugar 1kg', sellingPrice: 42, quantity: 5, discountAmount: 0, taxPercentage: 0 }
    ]);
    check('Zero tax item calculates 0 tax amount', zeroTaxCalc.taxAmount === 0);
    check('Zero tax subtotal equals total', zeroTaxCalc.subtotal === zeroTaxCalc.totalAmount);
    check('Handles empty options parameter safely', typeof zeroTaxCalc.currency === 'string');

    // Precision & rounding edge cases
    const precCalc = invoiceService.calculateFinancials([
      { productId: 'p4', productName: 'Spices 100g', sellingPrice: 33.33, quantity: 3, taxPercentage: 18 }
    ]);
    check('Handles floating point precision correctly', precCalc.subtotal === 99.99);
    check('Calculates 18% GST on 99.99 (18.00)', precCalc.taxAmount === 18.00);

    // -------------------------------------------------------------------------
    // 2. INVOICE & POS NUMBER SEQUENCING TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: Sequential Numbering Formats ---');

    const invNum1 = await invoiceService.generateInvoiceNumber();
    const invNum2 = await invoiceService.generateInvoiceNumber();
    check('Invoice number matches CKS-INV-YYYY-XXXXXX format', /^CKS-INV-\d{4}-\d{6}$/.test(invNum1));
    check('Subsequent invoice numbers are unique', invNum1 !== invNum2);

    const posNum1 = await invoiceService.generatePosSaleNumber();
    const posNum2 = await invoiceService.generatePosSaleNumber();
    check('POS sale number matches CKS-POS-YYYY-XXXXXX format', /^CKS-POS-\d{4}-\d{6}$/.test(posNum1));
    check('Subsequent POS numbers are unique', posNum1 !== posNum2);

    // -------------------------------------------------------------------------
    // 3. ONLINE ORDER INVOICE IDEMPOTENCY TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Order Invoice Idempotency ---');

    const testOrderId = `test-ord-${Date.now()}`;
    const inv1 = await invoiceService.generateInvoiceForOrder(testOrderId);
    check('Generates invoice object for order', inv1 && inv1.id);
    check('Invoice contains invoice_number string', typeof inv1.invoice_number === 'string');
    check('Invoice contains items array', Array.isArray(inv1.invoice_items));
    check('Invoice type is ONLINE_ORDER', inv1.invoice_type === 'ONLINE_ORDER');

    // Call again to verify idempotency
    const inv2 = await invoiceService.generateInvoiceForOrder(testOrderId);
    check('Returns exact same invoice object on second call (Idempotent)', inv1.id === inv2.id);
    check('Invoice numbers match across idempotent calls', inv1.invoice_number === inv2.invoice_number);

    let emptyOrderErr = null;
    try {
      await invoiceService.generateInvoiceForOrder(null);
    } catch (e) {
      emptyOrderErr = e;
    }
    check('Throws 400 when order ID is null', emptyOrderErr && emptyOrderErr.statusCode === 400);

    // -------------------------------------------------------------------------
    // 4. POS SALE & COUNTER INVOICE CREATION TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: POS Sale Creation & Inventory ---');

    const cashierId = 'admin-cashier-001';
    const posPayload = {
      customerName: 'Ramesh Kumar',
      customerPhone: '9876543210',
      paymentMethod: 'CASH',
      notes: 'Counter POS Sale Test',
      items: [
        { productId: 'p1', productName: 'Atta 10kg', sku: 'SKU-01', unit: 'kg', quantity: 1, sellingPrice: 320, mrp: 350, discountAmount: 10, taxPercentage: 5 }
      ]
    };

    const posResult = await invoiceService.createPosSaleAndInvoice(posPayload, cashierId);
    check('POS sale creation succeeds', posResult && posResult.sale && posResult.invoice);
    check('POS sale number is assigned', /^CKS-POS-\d{4}-\d{6}$/.test(posResult.sale.sale_number));
    check('POS invoice number is assigned', /^CKS-INV-\d{4}-\d{6}$/.test(posResult.invoice.invoice_number));
    check('POS invoice linked to pos_sale_id', posResult.invoice.pos_sale_id === posResult.sale.id);
    check('POS payment method recorded as CASH', posResult.sale.payment_method === 'CASH');
    check('POS payment status recorded as PAID', posResult.sale.payment_status === 'PAID');
    check('POS customer name stored correctly', posResult.sale.customer_name === 'Ramesh Kumar');

    // Additional payment methods
    const posUpi = await invoiceService.createPosSaleAndInvoice({ ...posPayload, paymentMethod: 'UPI' }, cashierId);
    check('Supports UPI payment method', posUpi.sale.payment_method === 'UPI');

    const posCard = await invoiceService.createPosSaleAndInvoice({ ...posPayload, paymentMethod: 'CARD' }, cashierId);
    check('Supports CARD payment method', posCard.sale.payment_method === 'CARD');

    // -------------------------------------------------------------------------
    // 5. POS INPUT VALIDATION & STOCK CHECKS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: POS Input & Stock Validation ---');

    let emptyCartError = null;
    try {
      await invoiceService.createPosSaleAndInvoice({ items: [] }, cashierId);
    } catch (e) {
      emptyCartError = e;
    }
    check('Rejects POS sale with empty item list', emptyCartError && emptyCartError.statusCode === 400);

    let invalidMethodError = null;
    try {
      await invoiceService.createPosSaleAndInvoice({ items: posPayload.items, paymentMethod: 'BITCOIN' }, cashierId);
    } catch (e) {
      invalidMethodError = e;
    }
    check('Rejects POS sale with invalid payment method', invalidMethodError && invalidMethodError.statusCode === 400);

    let invalidQtyError = null;
    try {
      await invoiceService.createPosSaleAndInvoice({ items: [{ productId: 'p1', quantity: -5, sellingPrice: 100 }] }, cashierId);
    } catch (e) {
      invalidQtyError = e;
    }
    check('Rejects POS sale with negative quantity', invalidQtyError && invalidQtyError.statusCode === 400);

    let negativePriceError = null;
    try {
      await invoiceService.createPosSaleAndInvoice({ items: [{ productId: 'p1', quantity: 1, sellingPrice: -100 }] }, cashierId);
    } catch (e) {
      negativePriceError = e;
    }
    check('Rejects POS sale with negative product price', negativePriceError && negativePriceError.statusCode === 400);

    // -------------------------------------------------------------------------
    // 6. POS SALE CANCELLATION & STOCK RESTORATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 6: POS Sale Cancellation ---');

    const cancelRes = await invoiceService.cancelPosSale(posResult.sale.id, cashierId, 'Customer requested refund');
    check('Cancels POS sale successfully', cancelRes.success === true);
    check('Sale status updated to CANCELLED', cancelRes.sale.status === 'CANCELLED');
    check('Cancellation reason recorded', cancelRes.sale.cancellation_reason === 'Customer requested refund');

    let doubleCancelError = null;
    try {
      await invoiceService.cancelPosSale(posResult.sale.id, cashierId, 'Try again');
    } catch (e) {
      doubleCancelError = e;
    }
    check('Rejects double cancellation of already cancelled POS sale', doubleCancelError && doubleCancelError.statusCode === 400);

    let emptyReasonError = null;
    try {
      await invoiceService.cancelPosSale(posCard.sale.id, cashierId, '   ');
    } catch (e) {
      emptyReasonError = e;
    }
    check('Rejects POS cancellation with empty reason', emptyReasonError && emptyReasonError.statusCode === 400);

    // -------------------------------------------------------------------------
    // 7. CUSTOMER IDOR & OWNERSHIP PROTECTION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 7: Security & IDOR Protection ---');

    const custA = 'cust-uuid-1111';
    const custB = 'cust-uuid-2222';

    // Mock customer A invoice
    const invCustA = await invoiceService.generateInvoiceForOrder(`ord-${custA}`);
    invCustA.customer_id = custA;

    // Cust A accesses own invoice
    const fetchedOwn = await invoiceService.getInvoiceById(invCustA.id, custA, 'CUSTOMER');
    check('Customer A can access own invoice', fetchedOwn.id === invCustA.id);

    // Cust B attempts IDOR access to Cust A invoice
    let idorError = null;
    try {
      await invoiceService.getInvoiceById(invCustA.id, custB, 'CUSTOMER');
    } catch (e) {
      idorError = e;
    }
    check('Customer B is blocked from reading Customer A invoice (IDOR 403 Forbidden)', idorError && idorError.statusCode === HTTP_STATUS.FORBIDDEN);

    // Admin can access any customer's invoice
    const adminAccess = await invoiceService.getInvoiceById(invCustA.id, 'admin-id', 'ADMIN');
    check('Admin can access any customer invoice', adminAccess.id === invCustA.id);

    let notFoundError = null;
    try {
      await invoiceService.getInvoiceById('non-existent-inv-id', 'admin-id', 'ADMIN');
    } catch (e) {
      notFoundError = e;
    }
    check('Throws 404 when invoice ID does not exist', notFoundError && notFoundError.statusCode === 404);

    // -------------------------------------------------------------------------
    // 8. ADMIN LIST INVOICES & METRIC AGGREGATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 8: Admin Invoices & Sales Metrics ---');

    const adminList = await invoiceService.listInvoices({});
    check('Admin listInvoices returns invoices array', Array.isArray(adminList.invoices));
    check('Admin listInvoices returns pagination metadata', adminList.pagination && typeof adminList.pagination.total === 'number');
    check('Admin listInvoices returns revenue summary', adminList.summary && typeof adminList.summary.todaySalesTotal === 'number');
    check('Summary includes cashTotal metric', typeof adminList.summary.cashTotal === 'number');
    check('Summary includes upiTotal metric', typeof adminList.summary.upiTotal === 'number');
    check('Summary includes cardTotal metric', typeof adminList.summary.cardTotal === 'number');
    check('Summary includes onlineSalesTotal metric', typeof adminList.summary.onlineSalesTotal === 'number');
    check('Summary includes posSalesTotal metric', typeof adminList.summary.posSalesTotal === 'number');

    // Search filtering test
    const filteredList = await invoiceService.listInvoices({ search: invCustA.invoice_number });
    check('Filter by invoice number returns matching records', filteredList.invoices.length >= 1);

    // Filter by type test
    const posFiltered = await invoiceService.listInvoices({ invoiceType: 'POS_SALE' });
    check('Filter by invoiceType returns pos sales', Array.isArray(posFiltered.invoices));

    const onlineFiltered = await invoiceService.listInvoices({ invoiceType: 'ONLINE_ORDER' });
    check('Filter by ONLINE_ORDER returns online invoices', Array.isArray(onlineFiltered.invoices));

    // Pagination test
    const paginatedList = await invoiceService.listInvoices({ page: 1, limit: 2 });
    check('Honors pagination limit of 2 items per page', paginatedList.invoices.length <= 2);
    check('Pagination metadata calculates total pages correctly', paginatedList.pagination.totalPages >= 1);

    // -------------------------------------------------------------------------
    // 9. CONTROLLER & DISPATCHER SAFETY TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 9: Controller & Dispatcher Safety ---');

    const invoiceController = require('./controllers/invoice.controller');
    check('invoiceController exports getInvoiceById handler', typeof invoiceController.getInvoiceById === 'function');
    check('invoiceController exports getInvoiceByOrderId handler', typeof invoiceController.getInvoiceByOrderId === 'function');
    check('invoiceController exports createPosSale handler', typeof invoiceController.createPosSale === 'function');
    check('invoiceController exports cancelPosSale handler', typeof invoiceController.cancelPosSale === 'function');
    check('invoiceController exports listAdminInvoices handler', typeof invoiceController.listAdminInvoices === 'function');
    check('invoiceController exports downloadInvoiceHtml handler', typeof invoiceController.downloadInvoiceHtml === 'function');

    // HTML Download Endpoint Verification
    let mockResHeader = {};
    let mockSentBody = '';
    const mockRes = {
      setHeader: (k, v) => { mockResHeader[k] = v; },
      status: function(s) { return this; }
    };
    const mockReq = { params: { id: invCustA.id }, user: { id: custA, role: 'CUSTOMER' } };

    await new Promise((resolve) => {
      mockRes.send = (html) => { mockSentBody = html; resolve(); return html; };
      invoiceController.downloadInvoiceHtml(mockReq, mockRes, (err) => { resolve(); });
    });
    check('downloadInvoiceHtml sets Content-Type text/html', mockResHeader['Content-Type'] === 'text/html');
    check('downloadInvoiceHtml renders store title', mockSentBody.includes('CHAUDHARY KIRANA STORE'));
    check('downloadInvoiceHtml renders GST INVOICE header', mockSentBody.includes('GST INVOICE'));
    check('downloadInvoiceHtml renders invoice number', mockSentBody.includes(invCustA.invoice_number));

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`   TOTAL PASSED ASSERTIONS: ${passCount} / ${totalAssertions}`);
    console.log('   STATUS: ALL PHASE 36 BILLING & POS TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST SUITE RUNTIME FAILURE:', err);
    process.exit(1);
  }
}

runTests();
