import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout Wrappers
import { PublicLayout } from '../components/layout/PublicLayout';
import { CustomerLayout } from '../components/layout/CustomerLayout';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Spinner } from '../components/ui/Spinner';

// Core Public Pages (Eager Loading for fast initial paint)
import { Home } from '../pages/public/Home';
import { ProductCatalog } from '../pages/public/ProductCatalog';
import { ProductDetail } from '../pages/public/ProductDetail';
import { CategoryList } from '../pages/public/CategoryList';
import { CartPage } from '../pages/public/CartPage';

// Lazy-Loaded Public & Customer Pages
const SearchPage = lazy(() => import('../pages/public/SearchPage').then(m => ({ default: m.SearchPage })));
const About = lazy(() => import('../pages/public/About').then(m => ({ default: m.About })));
const Contact = lazy(() => import('../pages/public/Contact').then(m => ({ default: m.Contact })));
const RefundPolicy = lazy(() => import('../pages/public/RefundPolicy').then(m => ({ default: m.RefundPolicy })));
const TermsOfService = lazy(() => import('../pages/public/TermsOfService').then(m => ({ default: m.TermsOfService })));
const PrivacyPolicy = lazy(() => import('../pages/public/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const ComponentShowcase = lazy(() => import('../pages/dev/ComponentShowcase').then(m => ({ default: m.ComponentShowcase })));
const OfflinePage = lazy(() => import('../pages/OfflinePage').then(m => ({ default: m.OfflinePage })));
const PublicInvoiceSharePage = lazy(() => import('../pages/public/PublicInvoiceSharePage').then(m => ({ default: m.PublicInvoiceSharePage })));

// Lazy-Loaded Auth Pages
const Login = lazy(() => import('../pages/auth/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('../pages/auth/Register').then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword').then(m => ({ default: m.ResetPassword })));

// Lazy-Loaded Customer Pages
const CheckoutPage = lazy(() => import('../pages/public/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const OrderConfirmationPage = lazy(() => import('../pages/public/OrderConfirmationPage').then(m => ({ default: m.OrderConfirmationPage })));
const Profile = lazy(() => import('../pages/customer/Profile').then(m => ({ default: m.Profile })));
const Addresses = lazy(() => import('../pages/customer/Addresses').then(m => ({ default: m.Addresses })));
const OrdersPage = lazy(() => import('../pages/customer/OrdersPage').then(m => ({ default: m.OrdersPage })));
const OrderDetailsPage = lazy(() => import('../pages/customer/OrderDetailsPage').then(m => ({ default: m.OrderDetailsPage })));
const OrderTrackingPage = lazy(() => import('../pages/customer/OrderTrackingPage').then(m => ({ default: m.OrderTrackingPage })));
const NotificationsPage = lazy(() => import('../pages/customer/NotificationsPage').then(m => ({ default: m.NotificationsPage })));

// Lazy-Loaded Admin Pages (Code Splitting for Admin Bundle Isolation)
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProductsPage = lazy(() => import('../pages/admin/ProductsPage').then(m => ({ default: m.ProductsPage })));
const ProductFormPage = lazy(() => import('../pages/admin/ProductFormPage').then(m => ({ default: m.ProductFormPage })));
const CategoriesPage = lazy(() => import('../pages/admin/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const InventoryPage = lazy(() => import('../pages/admin/InventoryPage').then(m => ({ default: m.InventoryPage })));
const AdminOrdersPage = lazy(() => import('../pages/admin/OrdersPage').then(m => ({ default: m.OrdersPage })));
const CustomersPage = lazy(() => import('../pages/admin/CustomersPage').then(m => ({ default: m.CustomersPage })));
const PaymentsPage = lazy(() => import('../pages/admin/PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const AnalyticsPage = lazy(() => import('../pages/admin/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const PromotionsPage = lazy(() => import('../pages/admin/PromotionsPage').then(m => ({ default: m.PromotionsPage })));
const DeliveryAdminPage = lazy(() => import('../pages/admin/DeliveryAdminPage').then(m => ({ default: m.DeliveryAdminPage })));
const CouponsAdminPage = lazy(() => import('../pages/admin/CouponsAdminPage').then(m => ({ default: m.CouponsAdminPage })));
const DeliveryDashboardPage = lazy(() => import('../pages/delivery/DeliveryDashboardPage').then(m => ({ default: m.DeliveryDashboardPage })));
const DeliveryDashboard = lazy(() => import('../pages/delivery/DeliveryDashboard').then(m => ({ default: m.DeliveryDashboard })));
const DeliveryOrdersPage = lazy(() => import('../pages/delivery/DeliveryOrdersPage').then(m => ({ default: m.DeliveryOrdersPage })));
const DeliveryOrderDetailsPage = lazy(() => import('../pages/delivery/DeliveryOrderDetailsPage').then(m => ({ default: m.DeliveryOrderDetailsPage })));

// Lazy-Loaded Phase 18 Pages
const MyCancellationsPage = lazy(() => import('../pages/customer/MyCancellationsPage').then(m => ({ default: m.MyCancellationsPage })));
const MyReturnsPage = lazy(() => import('../pages/customer/MyReturnsPage').then(m => ({ default: m.MyReturnsPage })));
const MyReplacementsPage = lazy(() => import('../pages/customer/MyReplacementsPage').then(m => ({ default: m.MyReplacementsPage })));

const AdminCancellationsPage = lazy(() => import('../pages/admin/AdminCancellationsPage').then(m => ({ default: m.AdminCancellationsPage })));
const AdminReturnsPage = lazy(() => import('../pages/admin/AdminReturnsPage').then(m => ({ default: m.AdminReturnsPage })));
const AdminReplacementsPage = lazy(() => import('../pages/admin/AdminReplacementsPage').then(m => ({ default: m.AdminReplacementsPage })));
const ActivityPage = lazy(() => import('../pages/admin/ActivityPage').then(m => ({ default: m.ActivityPage })));
const PosBillingPage = lazy(() => import('../pages/admin/PosBillingPage').then(m => ({ default: m.PosBillingPage })));
const AdminInvoicesPage = lazy(() => import('../pages/admin/AdminInvoicesPage').then(m => ({ default: m.AdminInvoicesPage })));
const OperationsDashboardPage = lazy(() => import('../pages/admin/OperationsDashboardPage').then(m => ({ default: m.OperationsDashboardPage })));
const ProcurementPage = lazy(() => import('../pages/admin/ProcurementPage').then(m => ({ default: m.ProcurementPage })));
const InventoryValuationPage = lazy(() => import('../pages/admin/InventoryValuationPage').then(m => ({ default: m.InventoryValuationPage })));

// Lazy-Loaded Phase 41 Pages
const FinancialDashboardPage = lazy(() => import('../pages/admin/FinancialDashboardPage').then(m => ({ default: m.FinancialDashboardPage })));
const ExpenseManagementPage = lazy(() => import('../pages/admin/ExpenseManagementPage').then(m => ({ default: m.ExpenseManagementPage })));
const CashManagementPage = lazy(() => import('../pages/admin/CashManagementPage').then(m => ({ default: m.CashManagementPage })));
const SupplierPayablesPage = lazy(() => import('../pages/admin/SupplierPayablesPage').then(m => ({ default: m.SupplierPayablesPage })));
const ProfitLossPage = lazy(() => import('../pages/admin/ProfitLossPage').then(m => ({ default: m.ProfitLossPage })));

// Lazy-Loaded Phase 42 Pages
const StoreConfigurationPage = lazy(() => import('../pages/admin/StoreConfigurationPage').then(m => ({ default: m.StoreConfigurationPage })));
const ClientOnboardingPage = lazy(() => import('../pages/admin/ClientOnboardingPage').then(m => ({ default: m.ClientOnboardingPage })));
const SystemHealthPage = lazy(() => import('../pages/admin/SystemHealthPage').then(m => ({ default: m.SystemHealthPage })));
const DeploymentStatusPage = lazy(() => import('../pages/admin/DeploymentStatusPage').then(m => ({ default: m.DeploymentStatusPage })));
const SystemStatusPage = lazy(() => import('../pages/admin/SystemStatusPage').then(m => ({ default: m.SystemStatusPage })));

// Lazy-Loaded Phase 44 Pages
const StoreCreditPage = lazy(() => import('../pages/customer/StoreCreditPage'));
const LoyaltyPointsPage = lazy(() => import('../pages/customer/LoyaltyPointsPage'));
const GrocerySubscriptionsPage = lazy(() => import('../pages/customer/GrocerySubscriptionsPage'));

const CustomerKhataLedgerPage = lazy(() => import('../pages/admin/CustomerKhataLedgerPage'));
const LoyaltyManagementPage = lazy(() => import('../pages/admin/LoyaltyManagementPage'));
const SubscriptionsAdminPage = lazy(() => import('../pages/admin/SubscriptionsAdminPage'));
const StoreBranchesPage = lazy(() => import('../pages/admin/StoreBranchesPage'));

// Lazy-Loaded Phase 45 Pages
const CustomerInsightsPage = lazy(() => import('../pages/customer/CustomerInsightsPage'));
const ReferralPage = lazy(() => import('../pages/customer/ReferralPage'));
const MyOffersPage = lazy(() => import('../pages/customer/MyOffersPage'));

const CustomerCRMPage = lazy(() => import('../pages/admin/CustomerCRMPage'));
const CustomerCRMDetailPage = lazy(() => import('../pages/admin/CustomerCRMDetailPage'));
const CustomerSegmentsPage = lazy(() => import('../pages/admin/CustomerSegmentsPage'));
const MarketingCampaignsPage = lazy(() => import('../pages/admin/MarketingCampaignsPage'));
const AbandonedCartPage = lazy(() => import('../pages/admin/AbandonedCartPage'));
const ReferralManagementPage = lazy(() => import('../pages/admin/ReferralManagementPage'));

// Lazy-Loaded Phase 46 Pages
const CustomerPersonalizedHub = lazy(() => import('../pages/customer/CustomerPersonalizedHub'));
const AIBusinessCopilotPage = lazy(() => import('../pages/admin/AIBusinessCopilotPage'));
const AIInsightsDashboardPage = lazy(() => import('../pages/admin/AIInsightsDashboardPage'));
const AIPredictiveAnalyticsPage = lazy(() => import('../pages/admin/AIPredictiveAnalyticsPage'));
const AIRiskIntelligencePage = lazy(() => import('../pages/admin/AIRiskIntelligencePage'));
const AIRecommendationHubPage = lazy(() => import('../pages/admin/AIRecommendationHubPage'));

// Protected Route Guards
import { useAuth } from '../hooks/useAuth';

const ProtectedCustomerRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}><Spinner /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const ProtectedAdminRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}><Spinner /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
};

const ProtectedDeliveryRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}><Spinner /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'DELIVERY_PARTNER') return <Navigate to="/" replace />;
  return children;
};

export const AppRoutes = () => {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}><Spinner /></div>}>
      <Routes>
        {/* Customer / Public Storefront Layout Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/categories" element={<CategoryList />} />
          <Route path="/products" element={<ProductCatalog />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/refund" element={<RefundPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/dev/components" element={<ComponentShowcase />} />
          <Route path="/offline" element={<OfflinePage />} />
          <Route path="/invoice/share/:token" element={<PublicInvoiceSharePage />} />
          <Route path="/invoice/share" element={<PublicInvoiceSharePage />} />

          {/* Auth Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Order Confirmation Screen */}
          <Route path="/orders/:orderId/confirmation" element={
            <ProtectedCustomerRoute>
              <OrderConfirmationPage />
            </ProtectedCustomerRoute>
          } />
        </Route>

        {/* Customer Account & Checkout Protected Routes */}
        <Route element={<CustomerLayout />}>
          <Route path="/checkout" element={
            <ProtectedCustomerRoute>
              <CheckoutPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/profile" element={
            <ProtectedCustomerRoute>
              <Profile />
            </ProtectedCustomerRoute>
          } />
          <Route path="/addresses" element={
            <ProtectedCustomerRoute>
              <Addresses />
            </ProtectedCustomerRoute>
          } />
          <Route path="/orders" element={
            <ProtectedCustomerRoute>
              <OrdersPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/orders/:orderId/tracking" element={
            <ProtectedCustomerRoute>
              <OrderTrackingPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/orders/:orderId" element={
            <ProtectedCustomerRoute>
              <OrderDetailsPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/cancellations" element={
            <ProtectedCustomerRoute>
              <MyCancellationsPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/returns" element={
            <ProtectedCustomerRoute>
              <MyReturnsPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/replacements" element={
            <ProtectedCustomerRoute>
              <MyReplacementsPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedCustomerRoute>
              <NotificationsPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/account/credit" element={
            <ProtectedCustomerRoute>
              <StoreCreditPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/credit" element={
            <ProtectedCustomerRoute>
              <StoreCreditPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/account/loyalty" element={
            <ProtectedCustomerRoute>
              <LoyaltyPointsPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/loyalty" element={
            <ProtectedCustomerRoute>
              <LoyaltyPointsPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/account/subscriptions" element={
            <ProtectedCustomerRoute>
              <GrocerySubscriptionsPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/subscriptions" element={
            <ProtectedCustomerRoute>
              <GrocerySubscriptionsPage />
            </ProtectedCustomerRoute>
          } />

          {/* Phase 45 Customer CRM & Growth Routes */}
          <Route path="/account/insights" element={
            <ProtectedCustomerRoute>
              <CustomerInsightsPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/account/referrals" element={
            <ProtectedCustomerRoute>
              <ReferralPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/account/offers" element={
            <ProtectedCustomerRoute>
              <MyOffersPage />
            </ProtectedCustomerRoute>
          } />
          <Route path="/account/smart-hub" element={
            <ProtectedCustomerRoute>
              <CustomerPersonalizedHub />
            </ProtectedCustomerRoute>
          } />

          {/* Delivery Partner Protected Routes */}
          <Route path="/delivery/dashboard" element={
            <ProtectedDeliveryRoute>
              <DeliveryDashboard />
            </ProtectedDeliveryRoute>
          } />
          <Route path="/delivery/orders" element={
            <ProtectedDeliveryRoute>
              <DeliveryOrdersPage />
            </ProtectedDeliveryRoute>
          } />
          <Route path="/delivery/orders/:orderId" element={
            <ProtectedDeliveryRoute>
              <DeliveryOrderDetailsPage />
            </ProtectedDeliveryRoute>
          } />
        </Route>

        {/* Protected Admin Dashboard & Management Routes */}
        <Route element={
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        }>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<DashboardPage />} />
          <Route path="/admin/products" element={<ProductsPage />} />
          <Route path="/admin/products/new" element={<ProductFormPage />} />
          <Route path="/admin/products/:id/edit" element={<ProductFormPage />} />
          <Route path="/admin/categories" element={<CategoriesPage />} />
          <Route path="/admin/inventory" element={<InventoryPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/cancellations" element={<AdminCancellationsPage />} />
          <Route path="/admin/returns" element={<AdminReturnsPage />} />
          <Route path="/admin/replacements" element={<AdminReplacementsPage />} />
          <Route path="/admin/delivery" element={<DeliveryAdminPage />} />
          <Route path="/admin/deliveries" element={<DeliveryAdminPage />} />
          <Route path="/admin/coupons" element={<CouponsAdminPage />} />
          <Route path="/admin/customers" element={<CustomersPage />} />
          <Route path="/admin/payments" element={<PaymentsPage />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
          <Route path="/admin/promotions" element={<PromotionsPage />} />
          <Route path="/admin/activity" element={<ActivityPage />} />
          <Route path="/admin/pos" element={<PosBillingPage />} />
          <Route path="/admin/invoices" element={<AdminInvoicesPage />} />
          <Route path="/admin/operations" element={<OperationsDashboardPage />} />
          <Route path="/admin/procurement" element={<ProcurementPage />} />
          <Route path="/admin/inventory/valuation" element={<InventoryValuationPage />} />
          <Route path="/admin/finance" element={<FinancialDashboardPage />} />
          <Route path="/admin/expenses" element={<ExpenseManagementPage />} />
          <Route path="/admin/cash-management" element={<CashManagementPage />} />
          <Route path="/admin/payables" element={<SupplierPayablesPage />} />
          <Route path="/admin/profit-loss" element={<ProfitLossPage />} />

          {/* Phase 44 Enterprise Admin Routes */}
          <Route path="/admin/khata" element={<CustomerKhataLedgerPage />} />
          <Route path="/admin/loyalty" element={<LoyaltyManagementPage />} />
          <Route path="/admin/subscriptions" element={<SubscriptionsAdminPage />} />
          <Route path="/admin/branches" element={<StoreBranchesPage />} />

          {/* Phase 45 Enterprise CRM & Growth Admin Routes */}
          <Route path="/admin/crm" element={<CustomerCRMPage />} />
          <Route path="/admin/crm/customers/:id" element={<CustomerCRMDetailPage />} />
          <Route path="/admin/crm/segments" element={<CustomerSegmentsPage />} />
          <Route path="/admin/marketing" element={<MarketingCampaignsPage />} />
          <Route path="/admin/marketing/abandoned-carts" element={<AbandonedCartPage />} />
          <Route path="/admin/referrals" element={<ReferralManagementPage />} />

          {/* Phase 46 Retail Intelligence Admin Routes */}
          <Route path="/admin/ai-copilot" element={<AIBusinessCopilotPage />} />
          <Route path="/admin/ai-insights" element={<AIInsightsDashboardPage />} />
          <Route path="/admin/ai-forecasting" element={<AIPredictiveAnalyticsPage />} />
          <Route path="/admin/ai-risk" element={<AIRiskIntelligencePage />} />
          <Route path="/admin/ai-recommendations" element={<AIRecommendationHubPage />} />

          {/* Phase 42 & 43 Admin Routes */}
          <Route path="/admin/store-configuration" element={<StoreConfigurationPage />} />
          <Route path="/admin/onboarding" element={<ClientOnboardingPage />} />
          <Route path="/admin/system-health" element={<SystemHealthPage />} />
          <Route path="/admin/deployment-status" element={<DeploymentStatusPage />} />
          <Route path="/admin/system-status" element={<SystemStatusPage />} />
        </Route>


        {/* Fallback 404 Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
