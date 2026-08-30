const express = require('express');
const invoiceController = require('../controllers/invoice.controller');
const { authenticate, authorizeAdmin, optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Public Secure Invoice Share Endpoints (Token Protected, No Auth Required)
router.get('/invoices/share/:token', invoiceController.getSharedInvoiceByToken);
router.get('/invoice/share/:token', invoiceController.getSharedInvoiceByToken);

// Customer / Authenticated Invoice Lookup
router.get('/invoices/:id', authenticate, invoiceController.getInvoiceById);
router.get('/orders/:id/invoice', authenticate, invoiceController.getInvoiceByOrderId);
router.get('/invoices/:id/download', optionalAuth, invoiceController.downloadInvoiceHtml);

// Admin POS & Invoices Management
router.post('/admin/pos/sales', authenticate, authorizeAdmin, invoiceController.createPosSale);
router.get('/admin/pos/sales/:id', authenticate, authorizeAdmin, invoiceController.getPosSaleById);
router.post('/admin/pos/sales/:id/cancel', authenticate, authorizeAdmin, invoiceController.cancelPosSale);
router.get('/admin/invoices', authenticate, authorizeAdmin, invoiceController.listAdminInvoices);

module.exports = router;
