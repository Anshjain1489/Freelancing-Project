import React from 'react';
import { SEO } from '../../components/seo/SEO';
import { Card } from '../../components/ui/Card';
import { Lock, UserCheck, PhoneCall, ShieldCheck, Database } from 'lucide-react';

export const PrivacyPolicy = () => {
  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      <SEO
        title="Privacy Policy | Chaudhary Kirana Store"
        description="Privacy Policy of Chaudhary Kirana Store in Mahruni. Learn how we collect, protect, and use your personal information."
      />

      <div>
        <h1 className="text-h1">Privacy Policy 🔒</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Effective Date: August 2026 | Chaudhary Kirana Store, Mahruni
        </p>
      </div>

      <Card padding="28px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: 1.6, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          
          <p>
            At <strong>Chaudhary Kirana Store</strong>, protecting your privacy is our priority. This Privacy Policy outlines how we collect, use, and safeguard customer personal information when you use our web platform and grocery delivery services in Mahruni.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Section 1: Information We Collect */}
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="var(--color-primary-dark)" />
              1. Information We Collect
            </h3>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Personal Details:</strong> Full Name, Email Address, Phone Number provided during registration or Google OAuth login.</li>
              <li><strong>Delivery Information:</strong> Physical delivery address, landmark, and GPS coordinates (Latitude & Longitude) used strictly for calculating distance-based delivery fees from our Mahruni store.</li>
              <li><strong>Order History:</strong> Product items ordered, subtotal amounts, transaction status, and delivery choices.</li>
            </ul>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Section 2: How We Use Your Data */}
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} color="var(--color-primary-dark)" />
              2. How We Use Your Information
            </h3>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>To process, fulfill, and deliver your grocery orders to your specified address.</li>
              <li>To dispatch automated order notifications, status updates, and delivery alerts via <strong>WhatsApp Cloud API</strong> and in-app notifications.</li>
              <li>To calculate accurate delivery charges based on store distance.</li>
              <li>To provide customer support and respond to order inquiries through Akash Chaudhary (+91 7897837095).</li>
            </ul>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Section 3: Data Protection & Payments */}
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--color-primary-dark)" />
              3. Data Security & Payment Protection
            </h3>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>No Financial Storage:</strong> We do NOT store your credit card numbers, debit card numbers, UPI PINs, or banking credentials on our servers. Online payments are handled securely by <strong>Razorpay Payment Gateway</strong> using PCI-DSS compliant encryption.</li>
              <li><strong>No Data Selling:</strong> We do NOT sell, trade, or rent your personal information to third-party advertisers or external marketing companies.</li>
              <li><strong>Security Measures:</strong> Data transmission is protected using SSL/TLS encryption. User passwords are encrypted using strong bcrypt hashing.</li>
            </ul>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Section 4: Your Choices & Contact */}
          <div style={{ backgroundColor: 'var(--color-mint-light)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--color-primary-dark)', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="var(--color-primary-dark)" />
              Your Rights & Contact Information
            </h4>
            <p style={{ fontSize: '0.85rem' }}>
              You may update your profile details or delivery addresses at any time in your Customer Profile page. For privacy inquiries or data requests, please contact store owner Akash Chaudhary:
            </p>
            <div style={{ marginTop: '8px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary-dark)' }}>
              Chaudhary Kirana Store<br />
              Near Bada Jain Mandir, Tikamgarh Road, Mahruni, UP, India<br />
              Contact Phone: +91 7897837095 / +91 7007550184
            </div>
          </div>

        </div>
      </Card>
    </div>
  );
};
