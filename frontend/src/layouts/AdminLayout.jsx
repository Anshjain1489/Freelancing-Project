import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Package, Grid, Layers, ShoppingBag, Users, CreditCard, BarChart2, Tag, Image, Settings, Store, Volume2, VolumeX, BellRing } from 'lucide-react';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { useNotifications } from '../hooks/useNotifications';

export const AdminLayout = () => {
  const { soundEnabled, toggleSound, autoplayBlocked, unlockAudio } = useNotifications();

  const adminMenuItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/products', label: 'Products', icon: Package },
    { to: '/admin/categories', label: 'Categories', icon: Grid },
    { to: '/admin/inventory', label: 'Inventory', icon: Layers },
    { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { to: '/admin/customers', label: 'Customers', icon: Users },
    { to: '/admin/payments', label: 'Payments', icon: CreditCard },
    { to: '/admin/sales', label: 'Sales & Analytics', icon: BarChart2 },
    { to: '/admin/promotions', label: 'Promotions', icon: Tag },
    { to: '/admin/banners', label: 'Banners', icon: Image },
    { to: '/admin/settings', label: 'Store Settings', icon: Settings }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F3F4F6' }}>
      {/* Admin Top Header */}
      <header style={{
        backgroundColor: '#1F2937',
        color: '#ffffff',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: '#06C167',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1rem',
            color: '#ffffff'
          }}>
            CKS
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Chaudhary Kirana Admin</h2>
            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Store Owner: Akash Chaudhary (+91 7897837095)</span>
          </div>
        </div>

        {/* Right Actions Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Autoplay Unlock Prompt if browser blocked audio */}
          {autoplayBlocked && (
            <button
              onClick={unlockAudio}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#FF6B00',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(255, 107, 0, 0.4)'
              }}
            >
              <BellRing size={16} />
              <span>🔔 Enable notification sound</span>
            </button>
          )}

          {/* Sound Toggle Button */}
          <button
            onClick={toggleSound}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: soundEnabled ? '#E8F7F0' : '#374151',
              color: soundEnabled ? '#06C167' : '#9CA3AF',
              border: soundEnabled ? '1px solid #06C167' : '1px solid #4B5563',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title={soundEnabled ? 'Order Sound is Enabled' : 'Order Sound is Disabled'}
          >
            {soundEnabled ? <Volume2 size={16} color="#06C167" /> : <VolumeX size={16} color="#9CA3AF" />}
            <span>Sound {soundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Admin Notification Bell */}
          <NotificationBell />

          <Link to="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: '#06C167',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 700,
            textDecoration: 'none'
          }}>
            <Store size={16} />
            <span>View Public Store</span>
          </Link>
        </div>
      </header>

      {/* Admin Body Sidebar + Content */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Sidebar */}
        <aside style={{
          width: '240px',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #E5E7EB',
          padding: '16px 8px'
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {adminMenuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: isActive ? '#ffffff' : '#374151',
                  backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                  textDecoration: 'none'
                })}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
