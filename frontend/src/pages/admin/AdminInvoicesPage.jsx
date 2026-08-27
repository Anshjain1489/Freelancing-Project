import React, { useState, useEffect } from 'react';
import { invoiceService } from '../../services/invoice.service';
import { formatCurrency } from '../../utils/formatting';
import { InvoiceView } from '../../components/invoice/InvoiceView';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { FileText, Search, Printer, Download, Eye, DollarSign, ShoppingBag, Banknote, QrCode, CreditCard, RefreshCw, X } from 'lucide-react';

export const AdminInvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({
    todaySalesTotal: 0,
    onlineSalesTotal: 0,
    posSalesTotal: 0,
    cashTotal: 0,
    upiTotal: 0,
    cardTotal: 0
  });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [invoiceType, setInvoiceType] = useState('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (invoiceType !== 'ALL') params.invoiceType = invoiceType;

      const res = await invoiceService.listAdminInvoices(params);
      setInvoices(res.data?.invoices || res.invoices || []);
      if (res.data?.summary || res.summary) {
        setSummary(res.data?.summary || res.summary);
      }
    } catch (err) {
      console.error('Failed to list invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [invoiceType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      <Breadcrumbs items={[{ label: 'Admin', path: '/admin' }, { label: 'Invoices' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            GST Invoices & Revenue Management 🧾
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
            Audit all online order invoices, store counter POS sales, revenue summary, and payment breakdowns.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchInvoices}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={16} /> Refresh Data
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '14px', border: '1px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Today's Sales Total</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>{formatCurrency(summary.todaySalesTotal)}</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '14px', border: '1px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Online Sales</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0284C7', marginTop: '4px' }}>{formatCurrency(summary.onlineSalesTotal)}</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '14px', border: '1px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>POS Sales</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#D97706', marginTop: '4px' }}>{formatCurrency(summary.posSalesTotal)}</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '14px', border: '1px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Cash vs UPI vs Card</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginTop: '4px' }}>
            Cash: {formatCurrency(summary.cashTotal)}<br />
            UPI: {formatCurrency(summary.upiTotal)}
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '14px', border: '1px solid #CBD5E1', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '240px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: '#64748B' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number or customer name..."
            style={{ width: '100%', paddingLeft: '38px', paddingRight: '12px', height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
          />
        </form>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B' }}>Type:</span>
          <select
            value={invoiceType}
            onChange={(e) => setInvoiceType(e.target.value)}
            style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem', backgroundColor: '#FFFFFF', fontWeight: 700 }}
          >
            <option value="ALL">All Types</option>
            <option value="ONLINE_ORDER">Online Order</option>
            <option value="POS_SALE">POS Sale</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #CBD5E1', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>No invoices found matching criteria.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #CBD5E1' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Invoice #</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Customer</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>Payment Method</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#475569' }}>Total Amount</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '12px', fontWeight: 800, color: '#06C167' }}>{inv.invoice_number}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: inv.invoice_type === 'POS_SALE' ? '#FEF3C7' : '#E0F2FE', color: inv.invoice_type === 'POS_SALE' ? '#92400E' : '#0369A1' }}>
                        {inv.invoice_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{inv.customer_name || 'Walk-in Customer'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#64748B', fontSize: '0.8rem' }}>
                      {new Date(inv.issued_at || inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700 }}>{inv.payment_method}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: '#047857' }}>{formatCurrency(inv.total_amount)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(inv)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#F8FAFC',
                          color: '#1E293B',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={14} /> View Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1200, backgroundColor: 'rgba(15,23,42,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '820px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '20px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setSelectedInvoice(null)}
              style={{ position: 'absolute', right: '16px', top: '16px', background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} />
            </button>
            <InvoiceView invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
          </div>
        </div>
      )}
    </div>
  );
};
