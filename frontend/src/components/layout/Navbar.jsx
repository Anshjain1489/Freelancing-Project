import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { Search, ShoppingBag, User, MapPin, Phone } from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';

export const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount, openCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Top Store Info Bar */}
      <div style={{
        backgroundColor: 'var(--color-primary-dark)',
        color: '#ffffff',
        padding: '4px 16px',
        fontSize: '0.75rem',
        fontWeight: 600,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>📍 Near Bada Jain Mandir, Tikamgarh Road, Mahruni</span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span>🛵 Fast Delivery ₹10/KM</span>
          <a href="tel:7897837095" style={{ color: '#ffffff', fontWeight: 800 }}>📞 7897837095</a>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-screen" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        gap: '16px'
      }}>
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', fontWeight: 800 }}>
            🌾
          </div>
          <div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-primary)', display: 'block', lineHeight: 1.1 }}>
              Chaudhary Kirana
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-primary-dark)', fontWeight: 700 }}>
              Store • Mahruni
            </span>
          </div>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: '450px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search daily Kirana items (Atta, Oil, Basmati, Amul...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 40px 10px 14px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-background)',
              fontSize: '0.85rem'
            }}
          />
          <button type="submit" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Search size={18} />
          </button>
        </form>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <NotificationBell />

          {isAuthenticated ? (
            <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
              <User size={20} color="var(--color-primary-dark)" />
              <span>{user?.fullName?.split(' ')[0]}</span>
            </Link>
          ) : (
            <Link to="/login" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
              Login
            </Link>
          )}

          {/* Cart Button */}
          <button
            onClick={openCart}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 800,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <ShoppingBag size={18} />
            <span>Cart ({itemCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
