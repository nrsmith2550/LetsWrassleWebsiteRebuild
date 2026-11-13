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
  useEffect(() => window.scrollTo(0, 0), [pathname]);
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
          <Route path="*" element={<div className="mx-auto max-w-xl p-16 text-center"><h1 className="text-4xl">Page not found</h1></div>} />
        </Route>
      </Routes>
    </>
  );
}
