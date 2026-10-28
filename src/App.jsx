import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Core UI Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import PageLoader from './components/PageLoader';

// Customer Pages (Lazy Loaded for Production Performance & Fast Initial Paint)
const HomePage = lazy(() => import('./pages/HomePage'));
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Admin Pages (Lazy Loaded separately so store shoppers do not download admin code)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));
const AdminOperations = lazy(() => import('./pages/admin/AdminOperations'));

function AppLayout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="app-container">
      {/* Accessibility Skip Link (Req 120) */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Scroll restoration on route change */}
      <ScrollToTop />

      {/* Global Navbar */}
      <Navbar />

      {/* Main Content View with Suspense Chunk Loading Fallback */}
      <main className="main-content" id="main-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Storefront Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<CatalogPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/terms" element={<LegalPage />} />
            <Route path="/privacy" element={<LegalPage />} />
            <Route path="/shipping-policy" element={<LegalPage />} />
            <Route path="/returns-policy" element={<LegalPage />} />
            <Route path="/bis-certification" element={<LegalPage />} />

            {/* Customer Dashboard Routes */}
            <Route path="/account" element={<UserDashboard />} />
            <Route path="/account/orders" element={<UserDashboard />} />
            <Route path="/account/wishlist" element={<UserDashboard />} />
            <Route path="/account/addresses" element={<UserDashboard />} />

            {/* Admin Management Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/coupons" element={<AdminCoupons />} />
            <Route path="/admin/operations" element={<AdminOperations />} />

            {/* Dedicated 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {/* Slide-over Cart Drawer */}
      <CartDrawer />

      {/* Storefront Footer */}
      {!isAdminRoute && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <CartProvider>
            <AppLayout />
          </CartProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
