import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { Home, LayoutGrid, Search, ShoppingBag, User, ShieldCheck } from 'lucide-react';

export const MobileBottomNav = () => {
  const { itemCount } = useCart();
  const { user } = useAuth();
  const location = useLocation();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Categories', path: '/categories', icon: LayoutGrid },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Cart', path: '/cart', icon: ShoppingBag, badge: itemCount },
    ...(isAdmin ? [{ label: 'Admin', path: '/admin', icon: ShieldCheck }] : [{ label: 'Profile', path: '/profile', icon: User }])
  ];

  return (
    <nav
      className="mobile-only"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
        padding: '6px 0 10px 0'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={idx}
              to={item.path}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                color: isActive ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
                position: 'relative',
                fontSize: '0.7rem',
                fontWeight: isActive ? 800 : 500
              }}
            >
              <div style={{ position: 'relative' }}>
                <Icon size={20} />
                {item.badge > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-8px',
                    backgroundColor: 'var(--color-secondary)',
                    color: '#ffffff',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    borderRadius: '999px',
                    padding: '1px 4px'
                  }}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
