import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Boxes,
  Truck,
  Users,
  CreditCard,
  TrendingUp,
  Tag,
  History,
  Menu,
  X,
  LogOut,
  Store,
  Printer,
  FileText,
  DollarSign,
  Wallet,
  Receipt,
  Building2,
  ShieldCheck,
  BookOpen,
  Award,
  Calendar
} from 'lucide-react';

const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'AI Copilot 🤖', to: '/admin/ai-copilot', icon: LayoutDashboard },
  { label: 'AI Retail Insights 🧠', to: '/admin/ai-insights', icon: TrendingUp },
  { label: 'Predictive Analytics 📈', to: '/admin/ai-forecasting', icon: TrendingUp },
  { label: 'Risk Intelligence 🛡️', to: '/admin/ai-risk', icon: ShieldCheck },
  { label: 'AI Recommendation Queue 🎯', to: '/admin/ai-recommendations', icon: Tag },
  { label: 'Customer CRM 👥', to: '/admin/crm', icon: Users },
  { label: 'Customer Segments 🏷️', to: '/admin/crm/segments', icon: FolderTree },
  { label: 'Marketing Campaigns 📣', to: '/admin/marketing', icon: Tag },
  { label: 'Cart Recovery 🛒', to: '/admin/marketing/abandoned-carts', icon: ShoppingBag },
  { label: 'Referral Program 🎁', to: '/admin/referrals', icon: Award },
  { label: 'System Status 🛡️', to: '/admin/system-status', icon: ShieldCheck },
  { label: 'Udhar Khata 📖', to: '/admin/khata', icon: BookOpen },
  { label: 'Loyalty Rewards ⭐', to: '/admin/loyalty', icon: Award },
  { label: 'Subscriptions 🥛', to: '/admin/subscriptions', icon: Calendar },
  { label: 'Store Branches 🏪', to: '/admin/branches', icon: Building2 },
  { label: 'Finance 💰', to: '/admin/finance', icon: DollarSign },
  { label: 'Profit & Loss 📈', to: '/admin/profit-loss', icon: TrendingUp },
  { label: 'Expenses 💸', to: '/admin/expenses', icon: Receipt },
  { label: 'Cash Register 💵', to: '/admin/cash-management', icon: Wallet },
  { label: 'Supplier Payables 🏭', to: '/admin/payables', icon: Building2 },
  { label: 'POS Billing 🧾', to: '/admin/pos', icon: Printer },
  { label: 'Invoices', to: '/admin/invoices', icon: FileText },
  { label: 'Procurement 🛒', to: '/admin/procurement', icon: Package },
  { label: 'Products', to: '/admin/products', icon: Package },
  { label: 'Categories', to: '/admin/categories', icon: FolderTree },
  { label: 'Orders', to: '/admin/orders', icon: ShoppingBag },
  { label: 'Inventory', to: '/admin/inventory', icon: Boxes },
  { label: 'Delivery Management', to: '/admin/delivery', icon: Truck },
  { label: 'Customers', to: '/admin/customers', icon: Users },
  { label: 'Payments', to: '/admin/payments', icon: CreditCard },
  { label: 'Analytics', to: '/admin/analytics', icon: TrendingUp },
  { label: 'Promotions', to: '/admin/promotions', icon: Tag },
  { label: 'Activity Logs', to: '/admin/activity', icon: History }
];


export const AdminLayout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 998 }}
        />
      )}

      {/* Admin Sidebar */}
      <aside className="admin-sidebar" style={{
        width: '240px',
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 999,
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease'
      }}>
        {/* Sidebar Brand Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/logo.png"
            alt="Chaudhary Kirana Logo"
            style={{
              width: '40px',
              height: '40px',
              objectFit: 'contain',
              borderRadius: '50%',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
            }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-text-primary)' }}>Chaudhary Kirana</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-primary-dark)', fontWeight: 700 }}>Admin Portal</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          {ADMIN_NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.85rem',
                  color: isActive ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
                  backgroundColor: isActive ? 'var(--color-mint-light)' : 'transparent',
                  textDecoration: 'none'
                })}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <Store size={16} /> View Customer Store
          </button>
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: 'none', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <LogOut size={16} /> Logout Admin
          </button>
        </div>
      </aside>

      {/* Main Admin Body Area */}
      <div className="admin-main-content" style={{ flex: 1, marginLeft: '0px', display: 'flex', flexDirection: 'column' }}>
        {/* Admin Topbar */}
        <header style={{ height: '60px', backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', sticky: 'top', top: 0, zIndex: 900 }}>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
          >
            <Menu size={22} />
          </button>

          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
            Welcome back, <strong style={{ color: 'var(--color-text-primary)' }}>{user?.fullName || 'Akash Chaudhary'}</strong> (Owner)
          </div>
        </header>

        {/* Content View Container */}
        <main style={{ flex: 1, padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
