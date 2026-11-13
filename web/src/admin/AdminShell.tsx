import { ReactNode, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { adminApi } from './adminApi';

const item = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-5 py-2.5 text-[15px] font-semibold ${isActive ? 'bg-ionos-sideActive text-white' : 'text-white/90 hover:bg-ionos-sideDeep'}`;
const sub = ({ isActive }: { isActive: boolean }) =>
  `block py-1.5 pl-12 pr-4 text-[14px] ${isActive ? 'font-bold text-white' : 'text-white/80 hover:text-white'}`;

const Icon = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

export default function AdminShell({ login, children }: { login: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  async function signOut() {
    await adminApi('/logout', { method: 'POST', body: {} }).catch(() => {});
    window.location.href = '/admin/';
  }

  return (
    <div className="min-h-screen bg-ionos-page font-sans text-ionos-text print:bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 bg-ionos-top px-4 text-white print:hidden">
        <button className="rounded p-1.5 hover:bg-white/10 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <Link to="/admin" className="flex items-baseline gap-2">
          <span className="font-display text-lg uppercase tracking-wide">Let's <span className="text-orange">Wrassle</span></span>
          <span className="hidden text-sm font-semibold tracking-[0.2em] text-white/70 sm:inline">STORE ADMIN</span>
        </Link>
        <div className="ml-auto flex items-center gap-5 text-sm">
          <a href="/" target="_blank" rel="noreferrer" className="hidden font-semibold text-white/90 hover:text-white sm:inline">View store ↗</a>
          <span className="hidden text-white/70 md:inline">{login}</span>
          <button onClick={signOut} className="rounded border border-white/40 px-3 py-1 font-semibold hover:bg-white/10">Sign out</button>
        </div>
      </header>

      <div className="flex">
        {/* Left menu */}
        <nav className={`${open ? 'block' : 'hidden'} fixed inset-y-14 left-0 z-20 w-60 overflow-y-auto bg-ionos-side py-3 lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-3.5rem)] lg:shrink-0 print:hidden`} onClick={close}>
          <NavLink to="/admin" end className={item}><Icon d="M3 10.5 12 3l9 7.5V21H3z" /> Dashboard</NavLink>
          <div className="mt-1">
            <div className="flex items-center gap-3 px-5 py-2.5 text-[15px] font-semibold text-white"><Icon d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21 7H6" /> My Sales</div>
            <NavLink to="/admin/orders" className={sub}>Orders</NavLink>
            <NavLink to="/admin/customers" className={sub}>Customers</NavLink>
          </div>
          <div className="mt-1">
            <div className="flex items-center gap-3 px-5 py-2.5 text-[15px] font-semibold text-white"><Icon d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /> Catalog</div>
            <NavLink to="/admin/catalog" className={sub}>Products</NavLink>
            <a href="/cms/#/collections/catalog/entries/categories" target="_blank" rel="noreferrer" className="block py-1.5 pl-12 pr-4 text-[14px] text-white/80 hover:text-white">Categories ↗</a>
            <a href="/cms/#/collections/catalog/entries/videos" target="_blank" rel="noreferrer" className="block py-1.5 pl-12 pr-4 text-[14px] text-white/80 hover:text-white">Interview videos ↗</a>
          </div>
          <a href="/cms/#/collections/catalog/entries/settings" target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-3 px-5 py-2.5 text-[15px] font-semibold text-white/90 hover:bg-ionos-sideDeep">
            <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /> Settings ↗
          </a>
        </nav>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}

/** Shared bits so every admin page looks like one product. */
export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-lg bg-white p-5 shadow-sm ${className}`}>{children}</section>
);
export const PageTitle = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <h1 className="font-sans text-[28px] font-bold normal-case tracking-normal text-ionos-text">{children}</h1>
    {right}
  </div>
);
export const btnPrimary = 'inline-flex items-center justify-center rounded bg-ionos-primary px-4 py-2 text-sm font-bold text-white hover:bg-ionos-primaryDark disabled:cursor-not-allowed disabled:opacity-50';
export const btnOutline = 'inline-flex items-center justify-center rounded border border-ionos-line bg-white px-4 py-2 text-sm font-semibold text-ionos-text hover:bg-ionos-page disabled:cursor-not-allowed disabled:opacity-50';
export const field = 'w-full rounded border border-ionos-line bg-white px-3 py-2 text-sm text-ionos-text outline-none focus:border-ionos-primary focus:ring-2 focus:ring-ionos-primary/20';
export const label = 'mb-1 block text-xs font-bold uppercase tracking-wide text-ionos-muted';
