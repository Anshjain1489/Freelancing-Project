import React from 'react';
import { SEO } from '../../components/seo/SEO';
import { Card } from '../../components/ui/Card';
import { ShieldAlert, RefreshCw, CheckCircle2, PhoneCall, AlertTriangle } from 'lucide-react';

export const RefundPolicy = () => {
  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      <SEO
        title="Refund & Replacement Policy | Chaudhary Kirana Store"
        description="Official Refund & Replacement Policy for Chaudhary Kirana Store in Mahruni. Learn about our strict No Refund policy for grocery items."
      />

      <div>
        <h1 className="text-h1">Refund & Replacement Policy 📦</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Last Updated: August 2026 | Chaudhary Kirana Store, Mahruni
        </p>
      </div>

      {/* Highlight Box for Strict No Refund Policy */}
      <div style={{
        backgroundColor: '#fff5f5',
        border: '1px solid #feb2b2',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start'
      }}>
        <ShieldAlert size={28} color="#c53030" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#9b2c2c', marginBottom: '6px' }}>
            Strict No Refund Policy
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#742a2a', lineHeight: 1.5 }}>
            Due to the perishable nature of fresh groceries, food grains, oil, milk, and daily kitchen essentials, <strong>Chaudhary Kirana Store follows a strict NO REFUND policy</strong> once an order has been successfully delivered and accepted by the customer.
          </p>
        </div>
      </div>

      <Card padding="28px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: 1.6, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          
          {/* Section 1: Order Cancellation */}
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={18} color="var(--color-primary-dark)" />
              1. Order Cancellation Policy
            </h3>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Orders can only be cancelled before they are marked as <strong>Dispatched / Out for Delivery</strong>.</li>
              <li>Once an order is handed over to our delivery executive or marked <em>Out for Delivery</em>, cancellations are no longer accepted.</li>
              <li>To cancel an active order prior to dispatch, please contact Akash Chaudhary directly at <a href="tel:7897837095" style={{ color: 'var(--color-primary-dark)', fontWeight: 700 }}>+91 7897837095</a> immediately with your Order Number.</li>
            </ul>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Section 2: Inspection Upon Delivery */}
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--color-primary-dark)" />
              2. Mandatory Inspection Upon Delivery
            </h3>
            <p style={{ marginBottom: '8px' }}>
              To ensure 100% customer satisfaction, we request all customers to thoroughly inspect all items (quantity, freshness, packaging seal, and outer condition) at the moment of delivery in front of our store delivery agent.
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>If any item is damaged, wrong, or defective upon inspection, you may decline that specific item with the delivery agent before accepting delivery.</li>
              <li>Once delivery is accepted and signed for, items cannot be returned, exchanged, or refunded.</li>
            </ul>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Section 3: Damaged or Missing Items */}
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="var(--color-primary-dark)" />
              3. Damaged / Missing Item Resolution
            </h3>
            <p>
              In rare circumstances where a prepaid order item is unavailable or rejected at delivery inspection:
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              <li><strong>Item Replacement:</strong> The store will replace the damaged item with a fresh stock unit at no additional delivery fee within Mahruni.</li>
              <li><strong>Prepaid Refunds:</strong> For Razorpay online payments where an item cannot be replaced by the store, the refund for that specific item amount will be processed back to the original payment method (UPI / Card / NetBanking) within 5–7 business days.</li>
            </ul>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Section 4: Contact Us */}
          <div style={{ backgroundColor: 'var(--color-mint-light)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--color-primary-dark)', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PhoneCall size={18} color="var(--color-primary-dark)" />
              Need Assistance with your Order?
            </h4>
            <p style={{ fontSize: '0.85rem' }}>
              For any urgent queries regarding order delivery, cancellations, or damaged items, please call or WhatsApp store owner <strong>Akash Chaudhary</strong>:
            </p>
            <div style={{ marginTop: '8px', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary-dark)' }}>
              📞 Primary: +91 7897837095 | 📞 Secondary: +91 7007550184<br />
              📍 Location: Near Bada Jain Mandir, Tikamgarh Road, Mahruni, UP
            </div>
          </div>

        </div>
      </Card>
    </div>
  );
};
