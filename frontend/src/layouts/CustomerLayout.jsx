import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { MobileBottomNav } from '../components/common/MobileBottomNav';
import { CartDrawer } from '../components/cart/CartDrawer';
import { User, Package, MapPin, Bell } from 'lucide-react';

export const CustomerLayout = () => {
  const menuItems = [
    { to: '/account/profile', label: 'My Profile', icon: User },
    { to: '/orders', label: 'My Orders', icon: Package },
    { to: '/addresses', label: 'Saved Addresses', icon: MapPin },
    { to: '/notifications', label: 'Notifications', icon: Bell }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
          {/* Customer Sidebar Navigation */}
          <aside style={{ backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--color-primary-dark)' }}>Customer Account</h3>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {menuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: isActive ? 'var(--color-primary-dark)' : 'var(--color-text-primary)',
                    backgroundColor: isActive ? 'var(--color-mint)' : 'transparent',
                    textDecoration: 'none'
                  })}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>

          {/* Customer Page Outlet */}
          <section style={{ flex: 1 }}>
            <Outlet />
          </section>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
      <CartDrawer />
    </div>
  );
};
