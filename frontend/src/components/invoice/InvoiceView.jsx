import React from 'react';
import { formatCurrency } from '../../utils/formatting';
import { Printer, Download, Store, CheckCircle, FileText } from 'lucide-react';
import { invoiceService } from '../../services/invoice.service';

export const InvoiceView = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const items = invoice.invoice_items || invoice.items || [];
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const url = invoiceService.getDownloadUrl(invoice.id);
    window.open(url, '_blank');
  };

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '16px',
      border: '1px solid #CBD5E1',
      padding: '24px',
      maxWidth: '800px',
      margin: '0 auto',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
    }} className="invoice-print-container">
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#047857', fontSize: '1.1rem' }}>
          <FileText size={20} /> Tax Invoice Preview
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              color: '#1E293B',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Printer size={16} /> Print
          </button>
          <button
            type="button"
            onClick={handleDownload}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#06C167',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Download size={16} /> Download HTML / PDF
          </button>
        </div>
      </div>

      {/* Printable Invoice Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #06C167', paddingBottom: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#06C167', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Store size={22} /> CHAUDHARY KIRANA STORE
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '4px' }}>
            Near Bada Jain Mandir, Tikamgarh Road, Mahruni (284405)<br />
            Phone: +91 7897837095 | GSTIN: 09ABCDE1234F1Z5
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A' }}>GST INVOICE</div>
          <div style={{ fontSize: '0.9rem', color: '#047857', fontWeight: 800 }}>#{invoice.invoice_number}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
            Issued: {new Date(invoice.issued_at || invoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Invoice Meta Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '0.88rem' }}>
        <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontWeight: 800, color: '#475569', marginBottom: '4px', fontSize: '0.78rem', textTransform: 'uppercase' }}>Billed To</div>
          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>{invoice.customer_name || 'Walk-in Customer'}</div>
          {invoice.customer_phone && <div style={{ color: '#64748B' }}>Phone: {invoice.customer_phone}</div>}
          <div style={{ marginTop: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#E0F2FE', color: '#0369A1' }}>
              Type: {invoice.invoice_type}
            </span>
          </div>
        </div>

        <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'right' }}>
          <div style={{ fontWeight: 800, color: '#475569', marginBottom: '4px', fontSize: '0.78rem', textTransform: 'uppercase' }}>Payment Details</div>
          <div>Payment Method: <strong>{invoice.payment_method}</strong></div>
          <div style={{ marginTop: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#ECFDF5', color: '#047857' }}>
              Status: {invoice.payment_status}
            </span>
          </div>
        </div>
      </div>

      {/* Item Table */}
      <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
              <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>Product Item</th>
              <th style={{ padding: '10px', textAlign: 'center', color: '#475569' }}>SKU</th>
              <th style={{ padding: '10px', textAlign: 'center', color: '#475569' }}>Qty</th>
              <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>Rate</th>
              <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>Discount</th>
              <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>GST %</th>
              <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const productName = item.product_name || item.productName || item.name || 'Grocery Item';
              const sku = item.sku || 'N/A';
              const sellingPrice = item.selling_price ?? item.sellingPrice ?? item.unit_price ?? item.price ?? 0;
              const discount = item.discount_amount ?? item.discountAmount ?? 0;
              const taxPct = item.tax_percentage ?? item.taxPercentage ?? 0;
              const taxAmt = item.tax_amount ?? item.taxAmount ?? 0;
              const lineTotal = item.total_amount ?? item.totalAmount ?? item.subtotal ?? (sellingPrice * item.quantity);

              return (
                <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '10px', fontWeight: 700, color: '#0F172A' }}>{productName}</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#64748B', fontSize: '0.8rem' }}>{sku}</td>
                  <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>{item.quantity} {item.unit || 'kg'}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(sellingPrice)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#DC2626' }}>
                    {discount > 0 ? `-${formatCurrency(discount)}` : '₹0'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#0369A1' }}>
                    {taxPct}% ({formatCurrency(taxAmt)})
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                    {formatCurrency(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: '0.78rem', color: '#64748B', maxWidth: '320px' }}>
          Thank you for choosing Chaudhary Kirana Store! ❤️<br />
          <em>Guaranteed fresh groceries delivered to your doorstep.</em>
        </div>

        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.88rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <strong>{formatCurrency(invoice.subtotal)}</strong>
          </div>
          {invoice.discount_amount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}>
              <span>Total Discount:</span>
              <strong>-{formatCurrency(invoice.discount_amount)}</strong>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total GST Tax:</span>
            <strong>+{formatCurrency(invoice.tax_amount)}</strong>
          </div>
          {invoice.delivery_charge > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Delivery Charge:</span>
              <strong>+{formatCurrency(invoice.delivery_charge)}</strong>
            </div>
          )}
          {invoice.round_off !== 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.8rem' }}>
              <span>Round Off:</span>
              <span>{formatCurrency(invoice.round_off)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 900, color: '#047857', borderTop: '2px solid #06C167', paddingTop: '8px', marginTop: '4px' }}>
            <span>Grand Total:</span>
            <span>{formatCurrency(invoice.total_amount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
