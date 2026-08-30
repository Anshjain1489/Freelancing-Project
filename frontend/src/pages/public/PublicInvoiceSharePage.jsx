import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import apiClient from '../../api/client';
import { formatCurrency } from '../../utils/formatting';
import { Store, FileText, Printer, AlertTriangle } from 'lucide-react';
import { Spinner } from '../../components/ui/Spinner';

export const PublicInvoiceSharePage = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const token = params.token || searchParams.get('token');

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSharedInvoice = async () => {
      if (!token) {
        setError('Invoice sharing token is missing');
        setLoading(false);
        return;
      }

      try {
        const res = await apiClient.get(`/invoices/share/${token}`);
        const data = res.data?.data?.invoice || res.data?.invoice || res.data;
        setInvoice(data);
      } catch (err) {
        console.error('Failed to load shared invoice:', err);
        setError(err.response?.data?.message || 'This invoice sharing link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedInvoice();
  }, [token]);

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <Spinner />
        <p style={{ marginTop: '12px', color: '#64748B', fontSize: '0.9rem' }}>Loading secure GST invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ maxWidth: '480px', margin: '60px auto', padding: '24px', textAlign: 'center', backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #CBD5E1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <AlertTriangle size={48} color="#EF4444" style={{ marginBottom: '12px' }} />
        <h2 style={{ fontSize: '1.25rem', color: '#0F172A', fontWeight: 800 }}>Invoice Link Unavailable</h2>
        <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '8px' }}>
          {error || 'This invoice link is invalid, expired, or has been revoked for security.'}
        </p>
      </div>
    );
  }

  const items = invoice.items || invoice.invoice_items || [];

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #CBD5E1',
        padding: '24px',
        maxWidth: '800px',
        margin: '0 auto',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
      }}>
        {/* Print Button Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#047857', fontSize: '1.05rem' }}>
            <FileText size={20} /> Verified Tax Invoice
          </div>
          <button
            type="button"
            onClick={() => window.print()}
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
            <div style={{ fontSize: '0.9rem', color: '#047857', fontWeight: 800 }}>#{invoice.invoiceNumber}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
              Issued: {new Date(invoice.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Invoice Meta Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '0.88rem' }}>
          <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontWeight: 800, color: '#475569', marginBottom: '4px', fontSize: '0.78rem', textTransform: 'uppercase' }}>Billed To</div>
            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>{invoice.customerName}</div>
            {invoice.customerPhone && <div style={{ color: '#64748B' }}>Phone: {invoice.customerPhone}</div>}
          </div>

          <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'right' }}>
            <div style={{ fontWeight: 800, color: '#475569', marginBottom: '4px', fontSize: '0.78rem', textTransform: 'uppercase' }}>Payment Details</div>
            <div>Payment Method: <strong>{invoice.paymentMethod}</strong></div>
            <div style={{ marginTop: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#ECFDF5', color: '#047857' }}>
                Status: {invoice.paymentStatus}
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
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '10px', fontWeight: 700, color: '#0F172A' }}>{item.productName}</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#64748B', fontSize: '0.8rem' }}>{item.sku}</td>
                  <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>{item.quantity} {item.unit}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(item.sellingPrice)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#DC2626' }}>
                    {item.discountAmount > 0 ? `-${formatCurrency(item.discountAmount)}` : '₹0'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#0369A1' }}>
                    {item.taxPercentage}% ({formatCurrency(item.taxAmount)})
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                    {formatCurrency(item.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748B', maxWidth: '320px' }}>
            Thank you for shopping at Chaudhary Kirana Store! ❤️<br />
            <em>Guaranteed fresh groceries delivered to your doorstep.</em>
          </div>
          <table style={{ width: '280px', fontSize: '0.88rem' }}>
            <tbody>
              <tr><td style={{ padding: '4px 0', color: '#64748B' }}>Subtotal:</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(invoice.subtotal)}</td></tr>
              <tr><td style={{ padding: '4px 0', color: '#64748B' }}>Discount:</td><td style={{ textAlign: 'right', color: '#DC2626', fontWeight: 700 }}>-{formatCurrency(invoice.discountAmount)}</td></tr>
              <tr><td style={{ padding: '4px 0', color: '#64748B' }}>GST Tax:</td><td style={{ textAlign: 'right', fontWeight: 700 }}>+{formatCurrency(invoice.taxAmount)}</td></tr>
              {invoice.deliveryCharge > 0 && (
                <tr><td style={{ padding: '4px 0', color: '#64748B' }}>Delivery Charge:</td><td style={{ textAlign: 'right', fontWeight: 700 }}>+{formatCurrency(invoice.deliveryCharge)}</td></tr>
              )}
              <tr style={{ fontSize: '1.05rem', fontWeight: 900, borderTop: '2px solid #06C167' }}>
                <td style={{ padding: '8px 0', color: '#047857' }}>Grand Total:</td>
                <td style={{ textAlign: 'right', color: '#047857' }}>{formatCurrency(invoice.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
