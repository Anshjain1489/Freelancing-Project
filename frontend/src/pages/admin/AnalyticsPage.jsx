import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import {
  TrendingUp,
  Award,
  Download,
  Printer,
  ShoppingBag,
  CreditCard,
  Receipt,
  Truck,
  Boxes,
  AlertTriangle,
  FileSpreadsheet,
  PieChart,
  Calendar
} from 'lucide-react';

export const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'products', 'inventory', 'payments', 'gst', 'delivery'
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState('30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [salesData, setSalesData] = useState(null);
  const [productData, setProductData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [gstData, setGstData] = useState(null);
  const [deliveryData, setDeliveryData] = useState(null);

  const fetchAllAnalytics = async (selectedRange, customStart, customEnd) => {
    setLoading(true);
    try {
      const params = { range: selectedRange };
      if (selectedRange === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate = customEnd;
      }

      const [sRes, pRes, iRes, gRes, dRes] = await Promise.all([
        adminService.getSalesAnalytics(params),
        adminService.getProductAnalytics(params),
        adminService.getInventoryAnalytics(),
        adminService.getGstReport(params),
        adminService.getDeliveryAnalytics(params)
      ]);

      setSalesData(sRes.data || null);
      setProductData(pRes.data || null);
      setInventoryData(iRes.data || null);
      setGstData(gRes.data || null);
      setDeliveryData(dRes.data || null);
    } catch (err) {
      console.error('Failed to load BI analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics(range, startDate, endDate);
  }, [range]);

  const handleCsvDownload = (type) => {
    const token = localStorage.getItem('cks_token') || sessionStorage.getItem('cks_token');
    const apiUrl = `/api/v1/admin/analytics/export/${type}?range=${range}&startDate=${startDate}&endDate=${endDate}`;
    window.open(apiUrl, '_blank');
  };

  const handlePdfPrint = () => {
    window.open('/api/v1/admin/analytics/report/pdf?range=30days', '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {/* Header & Date Range Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Store Owner Business Intelligence 📊
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Server-calculated revenue trends, product insights, GST tax reports & inventory valuations (Asia/Kolkata IST)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handlePdfPrint}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontWeight: 700,
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Printer size={16} /> Print Monthly Report
          </button>
        </div>
      </div>

      {/* Date Range Selector Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#F8FAFC', padding: '10px 16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Calendar size={18} color="#06C167" />
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', marginRight: '6px' }}>Period:</span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'custom', label: 'Custom' }
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: range === r.id ? '2px solid #06C167' : '1px solid #CBD5E1',
                background: range === r.id ? '#ECFDF5' : '#FFFFFF',
                color: range === r.id ? '#047857' : '#475569',
                fontWeight: range === r.id ? 800 : 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}
            />
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}
            />
            <button
              type="button"
              onClick={() => fetchAllAnalytics('custom', startDate, endDate)}
              style={{ padding: '6px 14px', background: '#06C167', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation Bar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'sales', label: '📈 Sales & Revenue', icon: TrendingUp },
          { id: 'products', label: '🛒 Product Intelligence', icon: Award },
          { id: 'inventory', label: '📦 Inventory Valuation', icon: Boxes },
          { id: 'payments', label: '💳 Payment Breakdown', icon: CreditCard },
          { id: 'gst', label: '🧾 GST Tax Slabs', icon: Receipt },
          { id: 'delivery', label: '🚚 Delivery Fleet', icon: Truck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              backgroundColor: activeTab === tab.id ? '#06C167' : 'transparent',
              color: activeTab === tab.id ? '#FFFFFF' : '#64748B',
              fontWeight: 800,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton height="350px" borderRadius="12px" />
      ) : (
        <>
          {/* TAB 1: SALES & REVENUE */}
          {activeTab === 'sales' && salesData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* POS vs Online Summary Banner */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <Card padding="20px">
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Revenue</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>
                    {formatCurrency(salesData.posVsOnlineBreakdown?.totalRevenue || 0)}
                  </div>
                </Card>

                <Card padding="20px">
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>🏪 POS Counter Sales</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>
                    {formatCurrency(salesData.posVsOnlineBreakdown?.posRevenue || 0)}
                    <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 700, marginLeft: '6px' }}>({salesData.posVsOnlineBreakdown?.posPct}%)</span>
                  </div>
                </Card>

                <Card padding="20px">
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>🌐 Online Orders</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0284C7', marginTop: '4px' }}>
                    {formatCurrency(salesData.posVsOnlineBreakdown?.onlineRevenue || 0)}
                    <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 700, marginLeft: '6px' }}>({salesData.posVsOnlineBreakdown?.onlinePct}%)</span>
                  </div>
                </Card>
              </div>

              {/* Daily Revenue Table & Export Button */}
              <Card padding="24px">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={18} color="#06C167" /> Daily Sales Performance Breakdown
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleCsvDownload('sales')}
                    style={{ padding: '6px 12px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontWeight: 800, fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <FileSpreadsheet size={14} /> Export Sales CSV
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                        <th style={{ padding: '10px' }}>Date</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Online Sales</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>POS Sales</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Total Revenue</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Orders Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(salesData.dailyRevenueTrend || []).map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '10px', fontWeight: 700 }}>{row.date}</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: '#0284C7' }}>{formatCurrency(row.onlineRevenue)}</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: '#0F172A' }}>{formatCurrency(row.posRevenue)}</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, color: '#047857' }}>{formatCurrency(row.totalRevenue)}</td>
                          <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800 }}>{row.orderCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: PRODUCT INTELLIGENCE */}
          {activeTab === 'products' && productData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* Top Selling Products */}
                <Card padding="24px">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Award size={18} color="#06C167" /> Top Selling Products
                    </h3>
                    <button type="button" onClick={() => handleCsvDownload('products')} style={{ padding: '4px 10px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>CSV</button>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                          <th style={{ padding: '8px' }}>Rank</th>
                          <th style={{ padding: '8px' }}>Product Name</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Units Sold</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(productData.topSellingProducts || []).map((p, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '8px', fontWeight: 800, color: '#64748B' }}>#{i + 1}</td>
                            <td style={{ padding: '8px', fontWeight: 800, color: '#0F172A' }}>{p.name}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{p.quantitySold}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#047857' }}>{formatCurrency(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Slow Moving Products */}
                <Card padding="24px">
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={18} color="#D97706" /> Slow-Moving Products (High Stock / Low Sales)
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                          <th style={{ padding: '8px' }}>Product Name</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Stock Qty</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>30-Day Sales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(productData.slowMovingProducts || []).map((p, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '8px', fontWeight: 700 }}>{p.name}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: '#DC2626' }}>{p.stockQuantity}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{p.quantitySold30Days || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 3: INVENTORY VALUATION */}
          {activeTab === 'inventory' && inventoryData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <Card padding="20px">
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Estimated Retail Inventory Value</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>
                    {formatCurrency(inventoryData.estimatedRetailInventoryValue || 0)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>Total Stock × Selling Price</div>
                </Card>

                <Card padding="20px">
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Active Products</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>
                    {inventoryData.totalProducts} SKUs
                  </div>
                </Card>

                <Card padding="20px">
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Stock Units</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0284C7', marginTop: '4px' }}>
                    {inventoryData.totalStockUnits} units
                  </div>
                </Card>
              </div>

              {/* Low Stock & Out of Stock Tables */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                <Card padding="24px">
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', color: '#D97706' }}>⚠️ Low Stock Items ({inventoryData.lowStockCount})</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                          <th style={{ padding: '8px' }}>Product</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Stock</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Threshold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(inventoryData.lowStockItems || []).map((p, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '8px', fontWeight: 700 }}>{p.name}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: '#D97706' }}>{p.stockQuantity}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{p.threshold}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card padding="24px">
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', color: '#DC2626' }}>🔴 Out of Stock Items ({inventoryData.outOfStockCount})</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                          <th style={{ padding: '8px' }}>Product</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(inventoryData.outOfStockItems || []).map((p, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '8px', fontWeight: 700 }}>{p.name}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: '#DC2626' }}>0</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENT BREAKDOWN */}
          {activeTab === 'payments' && salesData && (
            <Card padding="24px">
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="#06C167" /> Payment Method Revenue Distribution
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {(salesData.paymentMethodDistribution || []).map((p, i) => (
                  <div key={i} style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #CBD5E1' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B' }}>{p.method}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>{formatCurrency(p.amount)}</div>
                    <div style={{ fontSize: '0.8rem', color: '#0284C7', fontWeight: 700, marginTop: '2px' }}>{p.percentage}% of total</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* TAB 5: GST TAX SLAB REPORT */}
          {activeTab === 'gst' && gstData && (
            <Card padding="24px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Receipt size={18} color="#06C167" /> GST Tax Slab Report (Immutable Invoice Items)
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '2px' }}>
                    Aggregated directly from invoice_items records for exact historical tax compliance
                  </p>
                </div>
                <button type="button" onClick={() => handleCsvDownload('gst')} style={{ padding: '6px 12px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontWeight: 800, fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileSpreadsheet size={14} /> Export GST CSV
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#ECFDF5', padding: '14px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                  <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 800 }}>TOTAL GST COLLECTED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#047857', marginTop: '2px' }}>{formatCurrency(gstData.totalGstCollected)}</div>
                </div>
                <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 800 }}>POS COUNTER GST</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>{formatCurrency(gstData.posGstCollected)}</div>
                </div>
                <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 800 }}>ONLINE ORDERS GST</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0284C7', marginTop: '2px' }}>{formatCurrency(gstData.onlineGstCollected)}</div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                      <th style={{ padding: '10px' }}>GST Rate Slab</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Taxable Amount</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>GST Tax Collected</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Line Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(gstData.taxSlabBreakdown || []).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '10px', fontWeight: 800 }}>{row.gstRate}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(row.taxableAmount)}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, color: '#047857' }}>{formatCurrency(row.gstCollected)}</td>
                        <td style={{ padding: '10px', textAlign: 'center', color: '#64748B' }}>{row.itemHits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 6: DELIVERY ANALYTICS */}
          {activeTab === 'delivery' && deliveryData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <Card padding="20px">
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Completed Deliveries</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>
                    {deliveryData.completedDeliveries} / {deliveryData.totalDeliveries}
                  </div>
                </Card>

                <Card padding="20px">
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Avg Delivery Time</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0284C7', marginTop: '4px' }}>
                    {deliveryData.avgDeliveryTimeMinutes} Mins
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>Confirmed to Delivered</div>
                </Card>

                <Card padding="20px">
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Delivery Charges Collected</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>
                    {formatCurrency(deliveryData.totalDeliveryChargesCollected)}
                  </div>
                </Card>
              </div>

              {/* Partner Leaderboard */}
              <Card padding="24px">
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={18} color="#06C167" /> Delivery Partner Performance Leaderboard
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                        <th style={{ padding: '10px' }}>Partner Name</th>
                        <th style={{ padding: '10px' }}>Phone</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Delivered Orders</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Total Distance (km)</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Charges Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(deliveryData.partnerLeaderboard || []).map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '10px', fontWeight: 800 }}>{p.name}</td>
                          <td style={{ padding: '10px', color: '#64748B' }}>{p.phone}</td>
                          <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: '#047857' }}>{p.deliveredCount}</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>{p.totalDistanceKm} km</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800 }}>{formatCurrency(p.totalChargesCollected)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
