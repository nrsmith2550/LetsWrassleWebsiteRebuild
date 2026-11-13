import { ReactNode, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import Layout from './components/Layout';
import { useAuth } from './lib/auth';
import Account from './pages/Account';
import Checkout from './pages/Checkout';
import Home from './pages/Home';
import Interviews from './pages/Interviews';
import { Login, Register } from './pages/AuthPages';
import OrderConfirmation from './pages/OrderConfirmation';
import ProductPage from './pages/ProductPage';
import Shop from './pages/Shop';
import AdminCategories from './pages/admin/AdminCategories';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProductEdit from './pages/admin/AdminProductEdit';
import AdminProducts from './pages/admin/AdminProducts';
import AdminVideos from './pages/admin/AdminVideos';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function RequireAuth({ admin, children }: { admin?: boolean; children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-10 text-center text-gray-500">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (admin && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:categorySlug" element={<Shop />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/interviews" element={<Interviews />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/account" element={<Navigate to="/account/orders" replace />} />
          <Route path="/account/orders" element={<RequireAuth><Account /></RequireAuth>} />
        </Route>

        <Route path="/admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductEdit />} />
          <Route path="products/:id" element={<AdminProductEdit />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="videos" element={<AdminVideos />} />
        </Route>

        <Route path="*" element={<Layout />}>
          <Route path="*" element={<div className="mx-auto max-w-xl p-16 text-center"><h1 className="text-4xl">Page not found</h1></div>} />
        </Route>
      </Routes>
    </>
  );
}
