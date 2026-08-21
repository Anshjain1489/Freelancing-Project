import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Clock, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer style={{
      backgroundColor: 'var(--color-surface)',
      borderTop: '1px solid var(--color-border)',
      marginTop: 'auto',
      padding: '40px 16px 80px 16px', // Extra bottom padding for MobileBottomNav
      fontSize: '0.85rem',
      color: 'var(--color-text-secondary)'
    }}>
      <div className="max-w-screen" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '32px'
      }}>
        {/* Store Identity */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem', fontWeight: 800 }}>
              🌾
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Chaudhary Kirana Store
            </span>
          </div>
          <p style={{ lineHeight: 1.6 }}>
            Your trusted local grocery partner in Mahruni. Fresh daily essentials, fair prices, and fast neighborhood delivery.
          </p>
        </div>

        {/* Store Address & Contact */}
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
            Store Location & Contact
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <MapPin size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Near Bada Jain Mandir, Tikamgarh Road, Mahruni, Uttar Pradesh 274702</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Phone size={16} color="var(--color-primary)" />
              <a href="tel:7897837095" style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>7897837095</a> / <a href="tel:7007550184" style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>7007550184</a>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Clock size={16} color="var(--color-primary)" />
              <span>Open 7 Days: 7:00 AM – 9:30 PM</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
            Quick Links
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Link to="/products">All Products</Link>
            <Link to="/categories">Categories</Link>
            <Link to="/cart">Cart</Link>
            <Link to="/profile">My Account</Link>
            <Link to="/addresses">Saved Addresses</Link>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid var(--color-border)', fontSize: '0.75rem' }}>
        © {new Date().getFullYear()} Chaudhary Kirana Store • Store Owner: Akash Chaudhary • All Rights Reserved.
      </div>
    </footer>
  );
};
