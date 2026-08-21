import React from 'react';
import { SEO } from '../../components/seo/SEO';
import { Card } from '../../components/ui/Card';
import { FileText, MapPin, Truck, CreditCard, ShieldCheck } from 'lucide-react';

export const TermsOfService = () => {
  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      <SEO
        title="Terms of Service | Chaudhary Kirana Store"
        description="Terms of Service and Conditions for ordering online from Chaudhary Kirana Store in Mahruni, Uttar Pradesh."
      />

      <div>
        <h1 className="text-h1">Terms of Service 📜</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Effective Date: August 2026 | Chaudhary Kirana Store, Mahruni
        </p>
      </div>

      <Card padding="28px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: 1.6, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          
          <p>
            Welcome to <strong>Chaudhary Kirana Store</strong>. By accessing or using our online web application, placing grocery orders, or using our delivery services in Mahruni, Uttar Pradesh, you agree to comply with and be bound by the following Terms of Service.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Section 1: Business Identity & Coverage */}
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} color="var(--color-primary-dark)" />
              1. Store Coverage & Service Radius
            </h3>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Services are operated by <strong>Akash Chaudhary</strong> from Near Bada Jain Mandir, Tikamgarh Road, Mahruni, UP, India.</li>
              <li>Delivery is restricted to addresses within a maximum <strong>15.0 KM radius</strong> from our Mahruni physical store origin.</li>
              <li>Orders placed for delivery locations beyond 15.0 KM will be automatically rejected or subject to store cancellation.</li>
            </ul>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Section 2: Delivery Charges & Order Thresholds */}
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} color="var(--color-primary-dark)" />
              2. Delivery Fee Structure & Minimum Order
            </h3>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Free Delivery Radius:</strong> Delivery within 0.0 to 1.0 KM from the store is FREE (₹0 charge).</li>
              <li><strong>Extra KM Charge:</strong> Beyond 1.0 KM, a delivery fee of ₹10 per additional KM is calculated as <code>ceil(distance - 1.0) × ₹10</code>.</li>
              <li><strong>Minimum Order Amount:</strong> The minimum required subtotal to place a delivery order is <strong>₹199.00</strong>.</li>
            </ul>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Section 3: Pricing, Payment & Razorpay */}
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} color="var(--color-primary-dark)" />
              3. Product Pricing & Payment Methods
            </h3>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>All prices are listed in Indian Rupees (INR ₹) and include applicable taxes unless specified otherwise.</li>
              <li>Online payments are securely processed through <strong>Razorpay Payment Gateway</strong> (supporting PhonePe, Google Pay, Paytm, Cards, Net Banking).</li>
              <li>Cash on Delivery (COD) is available for eligible local delivery addresses in Mahruni.</li>
              <li>In the event of a pricing discrepancy or stock unavailability, the store reserves the right to adjust item quantities or cancel orders with full notification to the buyer.</li>
            </ul>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Section 4: Customer Account & User Conduct */}
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--color-primary-dark)" />
              4. User Account & Conduct
            </h3>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Users are responsible for providing accurate contact numbers, delivery addresses, and landmarks for successful delivery.</li>
              <li>Falsifying order information, creating fake accounts, or refusing valid COD deliveries without cause may lead to account suspension.</li>
              <li>Chaudhary Kirana Store reserves the right to modify prices, delivery rates, or store operating hours at any time.</li>
            </ul>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Section 5: Governing Law & Contact */}
          <div style={{ backgroundColor: 'var(--color-mint-light)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--color-primary-dark)', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--color-primary-dark)" />
              Governing Law & Contact Information
            </h4>
            <p style={{ fontSize: '0.85rem' }}>
              These terms are governed by the laws of Uttar Pradesh, India. For questions or concerns regarding our terms of service, please contact store management:
            </p>
            <div style={{ marginTop: '8px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary-dark)' }}>
              Chaudhary Kirana Store (Owner: Akash Chaudhary)<br />
              Near Bada Jain Mandir, Tikamgarh Road, Mahruni, UP<br />
              Contact Phone: +91 7897837095 / +91 7007550184
            </div>
          </div>

        </div>
      </Card>
    </div>
  );
};
