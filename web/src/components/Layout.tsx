import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useCart } from '../lib/cart';
import { useCatalog } from '../lib/catalog';
import CartDrawer from './CartDrawer';

const navCls = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-bold uppercase tracking-widest transition hover:text-orange ${isActive ? 'text-orange' : 'text-white'}`;

export default function Layout() {
  const { count, setOpen } = useCart();
  const { catalog } = useCatalog();
  const [menu, setMenu] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      {catalog?.settings.announcement && (
        <div className="bg-orange px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-white">{catalog.settings.announcement}</div>
      )}
      <header className="sticky top-0 z-30 bg-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-xl uppercase tracking-wide text-white">Let's <span className="text-orange">Wrassle</span></Link>
          <nav className="hidden items-center gap-7 md:flex">
            <NavLink to="/shop" className={navCls}>Shop</NavLink>
            <NavLink to="/interviews" className={navCls}>Interviews</NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="relative rounded p-2 text-white hover:text-orange" aria-label="Open cart">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" /></svg>
              {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange px-1 text-[11px] font-bold text-white">{count}</span>}
            </button>
            <button onClick={() => setMenu((m) => !m)} className="p-2 text-white md:hidden" aria-label="Menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            </button>
          </div>
        </div>
        {menu && (
          <nav className="flex flex-col gap-4 border-t border-white/10 px-4 py-4 md:hidden" onClick={() => setMenu(false)}>
            <NavLink to="/shop" className={navCls}>Shop</NavLink>
            <NavLink to="/interviews" className={navCls}>Interviews</NavLink>
          </nav>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="bg-ink text-gray-300">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
          <div>
            <div className="font-display text-lg uppercase text-white">Let's <span className="text-orange">Wrassle</span></div>
            <p className="mt-2 text-sm">Located and formed in the State of Pennsylvania.</p>
          </div>
          <div className="text-sm">
            <div className="mb-2 font-bold uppercase tracking-widest text-white">Delivery &amp; Returns</div>
            <p>Orders process within 2–3 business days. Returns &amp; exchanges within 7 days of delivery for unworn, unwashed items.</p>
            <p className="mt-2 font-semibold text-orange">{catalog?.settings.pickupNotice}</p>
          </div>
          <div className="text-sm">
            <div className="mb-2 font-bold uppercase tracking-widest text-white">Contact</div>
            <a className="hover:text-orange" href="mailto:support@letswrassleapparel.com">support@letswrassleapparel.com</a>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-gray-500">© {new Date().getFullYear()} Let's Wrassle, Co.</div>
      </footer>
      <CartDrawer />
    </div>
  );
}
