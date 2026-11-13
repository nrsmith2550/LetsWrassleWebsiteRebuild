import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import AdminApp from './admin/AdminApp';
import Layout from './components/Layout';
import Checkout from './pages/Checkout';
import Home from './pages/Home';
import Interviews from './pages/Interviews';
import OrderConfirmation from './pages/OrderConfirmation';
import ProductPage from './pages/ProductPage';
import Shop from './pages/Shop';

function ScrollToTop() {
  const { pathname } = useLocation();
  // Braces matter: newer Chrome returns a Promise from scrollTo, and React crashes if an effect returns one.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:categorySlug" element={<Shop />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/interviews" element={<Interviews />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="*" element={<div className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="text-4xl">Page not found</h1><p className="mt-3 text-gray-600">That page doesn't exist or has moved.</p><a href="/shop" className="btn-primary mt-6">Go to the store</a></div>} />
        </Route>
      </Routes>
    </>
  );
}
