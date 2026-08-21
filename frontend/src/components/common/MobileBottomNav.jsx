import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Grid, Search, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../../hooks/useCart';

export const MobileBottomNav = () => {
  const { itemCount, setIsCartOpen } = useCart();

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/categories', label: 'Categories', icon: Grid },
    { to: '/search', label: 'Search', icon: Search },
    { to: '/account/profile', label: 'Profile', icon: User }
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '64px',
      backgroundColor: 'var(--color-surface)',
      borderTop: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 100,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
    }}>
      {navItems.slice(0, 3).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            textDecoration: 'none'
          })}
        >
          <item.icon size={20} />
          <span style={{ marginTop: '2px' }}>{item.label}</span>
        </NavLink>
      ))}

      {/* Cart Trigger Tab */}
      <button
        onClick={() => setIsCartOpen(true)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          position: 'relative'
        }}
      >
        <ShoppingBag size={20} />
        <span style={{ marginTop: '2px' }}>Cart</span>
        {itemCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '8px',
            backgroundColor: 'var(--color-secondary)',
            color: '#fff',
            fontSize: '0.65rem',
            fontWeight: 800,
            borderRadius: '999px',
            padding: '1px 6px'
          }}>
            {itemCount}
          </span>
        )}
      </button>

      {/* Profile Tab */}
      <NavLink
        to="/account/profile"
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          textDecoration: 'none'
        })}
      >
        <User size={20} />
        <span style={{ marginTop: '2px' }}>Profile</span>
      </NavLink>
    </nav>
  );
};
