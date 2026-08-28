import React, { useState, useEffect, useRef } from 'react';
import { productService } from '../../services/product.service';
import { invoiceService } from '../../services/invoice.service';
import { formatCurrency } from '../../utils/formatting';
import { InvoiceView } from '../../components/invoice/InvoiceView';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { Search, ShoppingBag, Plus, Minus, Trash2, User, CreditCard, Banknote, QrCode, Printer, CheckCircle, AlertCircle, X } from 'lucide-react';

export const PosBillingPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [cartItems, setCartItems] = useState([]);
  const [customerType, setCustomerType] = useState('WALK_IN'); // 'WALK_IN' or 'REGISTERED'
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH', 'UPI', 'CARD'
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Debounced product search
  useEffect(() => {
    const clean = searchQuery.trim();
    if (!clean) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await productService.searchProducts(clean, { limit: 10 });
        setSearchResults(res.data?.products || []);
      } catch (err) {
        console.error('POS product search failed:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            sku: product.sku || 'SKU-POS',
            unit: product.unit || 'kg',
            sellingPrice: parseFloat(product.sellingPrice || product.mrp || 0),
            mrp: parseFloat(product.mrp || product.sellingPrice || 0),
            discountAmount: 0,
            taxPercentage: parseFloat(product.taxPercentage || 5),
            quantity: 1,
            availableStock: product.stockQuantity || 50
          }
        ];
      }
    });
    setSearchQuery('');
    setSearchResults([]);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const handleUpdateQuantity = (productId, delta) => {
    setCartItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const handleRemoveItem = (productId) => {
    setCartItems(prev => prev.filter(i => i.productId !== productId));
  };

  // Compute Bill Summary
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  cartItems.forEach(item => {
    const lineSubtotal = item.quantity * item.sellingPrice;
    const lineDiscount = item.discountAmount || 0;
    const taxable = Math.max(0, lineSubtotal - lineDiscount);
    const lineTax = taxable * (item.taxPercentage / 100);

    subtotal += lineSubtotal;
    totalDiscount += lineDiscount;
    totalTax += lineTax;
  });

  const rawGrand = Math.max(0, subtotal - totalDiscount + totalTax);
  const grandTotal = Math.round(rawGrand);
  const roundOff = Math.round((grandTotal - rawGrand) * 100) / 100;

  const handleCompleteSale = async () => {
    if (submitting || cartItems.length === 0) {
      if (cartItems.length === 0) {
        setErrorMsg('Please add at least one product to the POS bill');
      }
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const posPayload = {
        customerName: customerType === 'WALK_IN' ? (customerName || 'Walk-in Customer') : customerName,
        customerPhone,
        paymentMethod,
        notes,
        items: cartItems.map(i => ({
          productId: i.productId,
          productName: i.productName,
          sku: i.sku,
          unit: i.unit,
          quantity: i.quantity,
          sellingPrice: i.sellingPrice,
          mrp: i.mrp,
          discountAmount: i.discountAmount,
          taxPercentage: i.taxPercentage
        }))
      };

      const res = await invoiceService.createPosSale(posPayload);
      setCreatedInvoice(res.data?.invoice || res.invoice);
      setCartItems([]);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setNotes('');
    } catch (err) {
      console.error('POS Sale completion error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to complete POS sale');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      <Breadcrumbs items={[{ label: 'Admin', path: '/admin' }, { label: 'POS Billing' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Store POS Counter Billing 🧾
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
            Search products, manage cart items, select customer details, and issue GST counter receipts instantly.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 700 }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#B91C1C', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* Grid Layout: Left Product Search (60%) & Right Cart Summary (40%) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Section: Product Search & Quick Add */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '16px', border: '1px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={18} color="#06C167" /> Product Catalog & Scanner
          </h2>

          <div style={{ position: 'relative' }}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name, SKU or scan barcode..."
              style={{
                width: '100%',
                minHeight: '44px',
                paddingLeft: '38px',
                paddingRight: '12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                fontSize: '0.92rem',
                outline: 'none'
              }}
            />
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
          </div>

          {/* Search Live Results */}
          {searchLoading ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>
              Searching product inventory...
            </div>
          ) : searchResults.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
              {searchResults.map(prod => (
                <div
                  key={prod.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>{prod.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      SKU: {prod.sku || 'N/A'} · {formatCurrency(prod.sellingPrice)} per {prod.unit || 'kg'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(prod)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#06C167',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} /> ADD
                  </button>
                </div>
              ))}
            </div>
          ) : searchQuery.trim().length > 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.88rem' }}>
              No products found matching "{searchQuery}".
            </div>
          ) : (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94A3B8', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1', fontSize: '0.85rem' }}>
              Type product name or SKU above to start building bill.
            </div>
          )}
        </div>

        {/* Right Section: Bill Cart Items & Payment Checkout */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '16px', border: '1px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} color="#06C167" /> Current Bill ({cartItems.length} items)
          </h2>

          {/* Cart Item List */}
          {cartItems.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1', fontSize: '0.88rem' }}>
              Your bill is currently empty.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
              {cartItems.map(item => (
                <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.productName}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{formatCurrency(item.sellingPrice)} × {item.quantity} = {formatCurrency(item.quantity * item.sellingPrice)}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #CBD5E1', borderRadius: '6px', overflow: 'hidden' }}>
                      <button type="button" onClick={() => handleUpdateQuantity(item.productId, -1)} style={{ width: '28px', height: '28px', border: 'none', backgroundColor: '#E2E8F0', cursor: 'pointer' }}><Minus size={14} /></button>
                      <span style={{ padding: '0 8px', fontWeight: 800, fontSize: '0.85rem' }}>{item.quantity}</span>
                      <button type="button" onClick={() => handleUpdateQuantity(item.productId, 1)} style={{ width: '28px', height: '28px', border: 'none', backgroundColor: '#E2E8F0', cursor: 'pointer' }}><Plus size={14} /></button>
                    </div>
                    <button type="button" onClick={() => handleRemoveItem(item.productId)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Customer Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Customer Details</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer Name"
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
              />
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone (Optional)"
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Payment Method</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: paymentMethod === 'CASH' ? '2px solid #06C167' : '1px solid #CBD5E1',
                  backgroundColor: paymentMethod === 'CASH' ? '#ECFDF5' : '#FFFFFF',
                  color: paymentMethod === 'CASH' ? '#047857' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <Banknote size={16} /> CASH
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: paymentMethod === 'UPI' ? '2px solid #06C167' : '1px solid #CBD5E1',
                  backgroundColor: paymentMethod === 'UPI' ? '#ECFDF5' : '#FFFFFF',
                  color: paymentMethod === 'UPI' ? '#047857' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <QrCode size={16} /> UPI
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: paymentMethod === 'CARD' ? '2px solid #06C167' : '1px solid #CBD5E1',
                  backgroundColor: paymentMethod === 'CARD' ? '#ECFDF5' : '#FFFFFF',
                  color: paymentMethod === 'CARD' ? '#047857' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <CreditCard size={16} /> CARD
              </button>
            </div>
          </div>

          {/* Financial Totals Summary */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal:</span><span>{formatCurrency(subtotal)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}><span>Discount:</span><span>-{formatCurrency(totalDiscount)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>GST Tax:</span><span>+{formatCurrency(totalTax)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.78rem' }}><span>Round Off:</span><span>{formatCurrency(roundOff)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 900, color: '#047857', borderTop: '2px solid #06C167', paddingTop: '6px', marginTop: '2px' }}>
              <span>TOTAL PAYABLE:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            disabled={submitting || cartItems.length === 0}
            onClick={handleCompleteSale}
            style={{
              width: '100%',
              minHeight: '48px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: cartItems.length === 0 ? '#CBD5E1' : '#06C167',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <Printer size={18} /> {submitting ? 'Processing Bill...' : 'COMPLETE PAYMENT & PRINT RECEIPT'}
          </button>
        </div>
      </div>

      {/* Invoice Receipt Modal */}
      {createdInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1200, backgroundColor: 'rgba(15,23,42,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '820px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '20px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setCreatedInvoice(null)}
              style={{ position: 'absolute', right: '16px', top: '16px', background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} />
            </button>
            <InvoiceView invoice={createdInvoice} onClose={() => setCreatedInvoice(null)} />
          </div>
        </div>
      )}
    </div>
  );
};
