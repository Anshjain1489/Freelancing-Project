const invoiceService = require('../services/invoice.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(req.params.id, req.user.id, req.user.role);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Invoice retrieved successfully', { invoice });
});

const getInvoiceByOrderId = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoiceByOrderId(req.params.id, req.user.id, req.user.role);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Order invoice retrieved successfully', { invoice });
});

const createPosSale = asyncHandler(async (req, res) => {
  const { sale, invoice } = await invoiceService.createPosSaleAndInvoice(req.body, req.user.id, req);
  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'POS Sale completed & Invoice issued', { sale, invoice });
});

const getPosSaleById = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(req.params.id, req.user.id, req.user.role);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'POS sale invoice details retrieved', { invoice });
});

const cancelPosSale = asyncHandler(async (req, res) => {
  const result = await invoiceService.cancelPosSale(req.params.id, req.user.id, req.body.reason, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'POS Sale cancelled and inventory restored', result);
});

const listAdminInvoices = asyncHandler(async (req, res) => {
  const result = await invoiceService.listInvoices(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Invoices retrieved', result);
});

const downloadInvoiceHtml = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(req.params.id, req.user?.id, req.user?.role || 'CUSTOMER');
  
  const itemsHtml = (invoice.invoice_items || []).map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${item.product_name || item.productName}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: center;">${item.sku}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: center;">${item.quantity} ${item.unit || 'kg'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right;">₹${item.selling_price || item.sellingPrice}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right;">₹${item.discount_amount || item.discountAmount || 0}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right;">${item.tax_percentage || item.taxPercentage || 0}% (₹${item.tax_amount || item.taxAmount || 0})</td>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: bold;">₹${item.total_amount || item.totalAmount}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice #${invoice.invoice_number}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #0F172A; margin: 0; padding: 24px; background-color: #F8FAFC; }
        .invoice-card { max-width: 800px; margin: 0 auto; background: #FFF; padding: 32px; border-radius: 12px; border: 1px solid #CBD5E1; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #06C167; padding-bottom: 16px; margin-bottom: 24px; }
        .store-title { font-size: 24px; font-weight: 800; color: #06C167; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #ECFDF5; color: #047857; font-weight: bold; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #F1F5F9; padding: 10px; text-align: left; font-size: 13px; color: #475569; }
        .totals-table { width: 300px; margin-left: auto; font-size: 14px; }
        .totals-table td { padding: 6px 0; }
        .grand-total { font-size: 18px; font-weight: 800; color: #047857; border-top: 2px solid #06C167; padding-top: 8px; }
        @media print { body { padding: 0; background: #FFF; } .invoice-card { border: none; box-shadow: none; } }
      </style>
    </head>
    <body>
      <div class="invoice-card">
        <div class="header">
          <div>
            <div class="store-title">CHAUDHARY KIRANA STORE 🧾</div>
            <div style="font-size: 13px; color: #64748B; margin-top: 4px;">Near Bada Jain Mandir, Mahruni, UP (284405) | Phone: 7897837095</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 20px; font-weight: 800;">GST INVOICE</div>
            <div style="font-size: 14px; color: #334155; font-weight: bold;">#${invoice.invoice_number}</div>
            <div style="font-size: 12px; color: #64748B;">Date: ${new Date(invoice.issued_at || invoice.created_at).toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 14px;">
          <div>
            <strong>Billed To:</strong><br>
            ${invoice.customer_name || 'Walk-in Customer'}<br>
            Phone: ${invoice.customer_phone || 'N/A'}<br>
            Type: <span class="badge">${invoice.invoice_type}</span>
          </div>
          <div style="text-align: right;">
            <strong>Payment Info:</strong><br>
            Method: <strong>${invoice.payment_method}</strong><br>
            Status: <span class="badge" style="background: #D1FAE5; color: #065F46;">${invoice.payment_status}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">SKU</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">Disc</th>
              <th style="text-align: right;">GST</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="font-size: 12px; color: #64748B; max-width: 300px;">
            Thank you for shopping at Chaudhary Kirana Store! ❤️<br>
            <em>Goods once sold can be returned per store return policy within 3 days.</em>
          </div>
          <table class="totals-table">
            <tr><td>Subtotal:</td><td style="text-align: right;">₹${invoice.subtotal}</td></tr>
            <tr><td>Discount:</td><td style="text-align: right; color: #DC2626;">-₹${invoice.discount_amount}</td></tr>
            <tr><td>GST Tax:</td><td style="text-align: right;">+₹${invoice.tax_amount}</td></tr>
            ${invoice.delivery_charge > 0 ? `<tr><td>Delivery Charge:</td><td style="text-align: right;">+₹${invoice.delivery_charge}</td></tr>` : ''}
            <tr><td>Round Off:</td><td style="text-align: right;">₹${invoice.round_off || 0}</td></tr>
            <tr class="grand-total"><td>Grand Total:</td><td style="text-align: right;">₹${invoice.total_amount}</td></tr>
          </table>
        </div>
      </div>
      <script>
        if (window.location.search.includes('print=true')) {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  return res.send(htmlContent);
});

module.exports = {
  getInvoiceById,
  getInvoiceByOrderId,
  createPosSale,
  getPosSaleById,
  cancelPosSale,
  listAdminInvoices,
  downloadInvoiceHtml
};
