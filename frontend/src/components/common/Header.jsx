import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, User, PhoneCall, MapPin } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';

export const Header = () => {
  const { itemCount, setIsCartOpen } = useCart();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Top Banner Notice */}
      <div style={{
        backgroundColor: 'var(--color-mint)',
        color: 'var(--color-primary-dark)',
        padding: '6px 16px',
        fontSize: '0.85rem',
        fontWeight: 600,
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={14} />
          <span>Near Bada Jain Mandir, Tikamgarh Road, Mahruni</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="badge-orange">Free Delivery ≤ 1 KM</span>
          <a href="tel:7897837095" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <PhoneCall size={13} /> 7897837095
          </a>
        </div>
      </div>

      {/* Main Navbar */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        {/* Store Logo & Title */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.2rem'
          }}>
            CKS
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>
              Chaudhary Kirana
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-dark)', fontWeight: 600 }}>
              Mahruni Grocery Store
            </span>
          </div>
        </Link>

        {/* Search Bar Input Placeholder */}
        <div style={{
          flex: 1,
          maxWidth: '500px',
          position: 'relative',
          display: 'none',
          smDisplay: 'block'
        }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
          <input
            type="text"
            placeholder="Search groceries (e.g. Atta, Oil, Ghee, Spices)..."
            onClick={() => navigate('/search')}
            readOnly
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-background)',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAdmin && (
            <Link to="/admin" style={{
              padding: '6px 12px',
              backgroundColor: 'var(--color-secondary)',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 700
            }}>
              Admin Portal
            </Link>
          )}

          {isAuthenticated ? (
            <Link to="/account/profile" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
              <User size={20} color="var(--color-primary)" />
              <span style={{ display: 'none', mdDisplay: 'inline' }}>{user?.fullName?.split(' ')[0] || 'Account'}</span>
            </Link>
          ) : (
            <Link to="/login" style={{
              padding: '8px 16px',
              border: '1px solid var(--color-primary)',
              color: 'var(--color-primary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 700
            }}>
              Login
            </Link>
          )}

          {/* Cart Drawer Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}
          >
            <ShoppingBag size={18} />
            <span>Cart</span>
            {itemCount > 0 && (
              <span style={{
                backgroundColor: 'var(--color-secondary)',
                color: '#fff',
                borderRadius: '999px',
                padding: '2px 8px',
                fontSize: '0.75rem'
              }}>
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
