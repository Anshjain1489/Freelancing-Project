import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Package, Grid, Layers, ShoppingBag, Users, CreditCard, BarChart2, Tag, Image, Settings, Store } from 'lucide-react';

export const AdminLayout = () => {
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
            backgroundColor: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1rem'
          }}>
            CKS
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Chaudhary Kirana Admin</h2>
            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Store Owner: Akash Chaudhary (+91 7897837095)</span>
          </div>
        </div>
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: 'var(--color-primary)',
          color: '#fff',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          fontWeight: 700,
          textDecoration: 'none'
        }}>
          <Store size={16} />
          <span>View Public Store</span>
        </Link>
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
