import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const link = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded px-3 py-2 text-sm font-bold uppercase tracking-wider ${isActive ? 'bg-orange text-white' : 'text-gray-300 hover:bg-white/10'}`;

export default function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/admin" className="font-display text-lg uppercase text-white">Admin <span className="text-orange">Hub</span></Link>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            <NavLink to="/admin/orders" className={link}>Orders</NavLink>
            <NavLink to="/admin/products" className={link}>Products</NavLink>
            <NavLink to="/admin/categories" className={link}>Categories</NavLink>
            <NavLink to="/admin/videos" className={link}>Videos</NavLink>
          </nav>
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <Link to="/" className="hover:text-white">View store ↗</Link>
            <button onClick={() => logout().then(() => (window.location.href = '/'))} className="hover:text-white">Log out ({user?.name})</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8"><Outlet /></main>
    </div>
  );
}
