import React from 'react';
import { Link } from 'react-router-dom';
import { PhoneCall, MapPin, Clock, ShieldCheck } from 'lucide-react';

export const Footer = () => {
  return (
    <footer style={{
      backgroundColor: 'var(--color-surface)',
      borderTop: '1px solid var(--color-border)',
      marginTop: '40px',
      padding: '40px 16px 20px 16px',
      color: 'var(--color-text-primary)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '32px'
      }}>
        {/* Brand & Store Info */}
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: '8px' }}>
            Chaudhary Kirana Store
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
            Your trusted local grocery partner in Mahruni. Fresh daily essentials, Atta, Grains, Oils, and Spices delivered directly to your doorstep.
          </p>
          <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} color="var(--color-primary)" />
              <span>Near Bada Jain Mandir, Tikamgarh Road, Mahruni</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PhoneCall size={16} color="var(--color-primary)" />
              <span>Owner: Akash Chaudhary (+91 7897837095 / 7007550184)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="var(--color-primary)" />
              <span>Open Daily: 7:00 AM – 9:30 PM</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Quick Navigation</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
            <li><Link to="/products" style={{ color: 'var(--color-text-secondary)' }}>All Products</Link></li>
            <li><Link to="/categories" style={{ color: 'var(--color-text-secondary)' }}>Browse Categories</Link></li>
            <li><Link to="/offers" style={{ color: 'var(--color-secondary)', fontWeight: 700 }}>Today's Special Offers</Link></li>
            <li><Link to="/about" style={{ color: 'var(--color-text-secondary)' }}>About Our Store</Link></li>
            <li><Link to="/contact" style={{ color: 'var(--color-text-secondary)' }}>Contact Us</Link></li>
          </ul>
        </div>

        {/* Delivery & Security Guarantee */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Hyper-Local Delivery</h4>
          <div style={{ backgroundColor: 'var(--color-mint)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-dark)', display: 'block' }}>
              🛵 Fast Delivery at ₹10 per KM
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              ₹10 per KM rate applied up to 15 KM max delivery radius.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            <ShieldCheck size={16} color="var(--color-primary)" />
            <span>Razorpay Secure Payments (UPI, Cards, NetBanking)</span>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '30px auto 0 auto',
        paddingTop: '16px',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        justifySpace: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        fontSize: '0.8rem',
        color: 'var(--color-text-secondary)'
      }}>
        <span>© {new Date().getFullYear()} Chaudhary Kirana Store. All rights reserved.</span>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/refund-policy">Refund & Replacement Policy</Link>
        </div>
      </div>
    </footer>
  );
};
