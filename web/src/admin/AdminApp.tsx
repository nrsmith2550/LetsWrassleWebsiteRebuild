import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import AdminShell from './AdminShell';
import { adminApi, AuthError } from './adminApi';
import Catalog from './pages/Catalog';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import OrderDetail from './pages/OrderDetail';
import Orders from './pages/Orders';

function SignIn() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ionos-page px-4 font-sans">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow">
        <div className="font-display text-2xl uppercase text-ionos-text">Let's <span className="text-orange">Wrassle</span></div>
        <div className="mt-1 text-xs font-semibold tracking-[0.25em] text-ionos-muted">STORE ADMIN</div>
        <p className="mt-6 text-sm text-ionos-muted">Sign in with the GitHub account that has been given access to this store.</p>
        <a href="/api/auth?mode=hub" className="mt-5 flex items-center justify-center gap-2 rounded bg-ionos-primary px-4 py-3 text-sm font-bold text-white hover:bg-ionos-primaryDark">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" /></svg>
          Sign in with GitHub
        </a>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [login, setLogin] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    adminApi<{ login: string }>('/me')
      .then((r) => setLogin(r.login))
      .catch((e) => setLogin(e instanceof AuthError ? null : null));
  }, []);

  if (login === undefined) return <div className="p-10 text-center font-sans text-ionos-muted">Loading…</div>;
  if (!login) return <SignIn />;

  return (
    <AdminShell login={login}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="*" element={<div className="p-10 text-center text-ionos-muted">Page not found.</div>} />
      </Routes>
    </AdminShell>
  );
}
