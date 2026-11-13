import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useCart } from '../lib/cart';
import { useCatalog } from '../lib/catalog';
import CartDrawer from './CartDrawer';
import { BagIcon, CloseIcon, MenuIcon, SOCIALS } from './Icons';
import Logo from './Logo';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Store' },
  { to: '/#about', label: 'About' },
  { to: '/help#delivery', label: 'Delivery' },
  { to: '/#contact', label: 'Contact us' },
  { to: '/shop/collabs', label: 'Collabs' },
  { to: '/interviews', label: 'Interviews' },
];

function scrollToHash(hash: string) {
  const el = hash && document.getElementById(hash.slice(1));
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Layout() {
  const { count, setOpen } = useCart();
  const { catalog } = useCatalog();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();

  // Header links like "About" and "Delivery" jump to sections of the home page.
  useEffect(() => {
    if (!loc.hash) return;
    const timers = [80, 500].map((ms) => window.setTimeout(() => scrollToHash(loc.hash), ms));
    return () => timers.forEach(clearTimeout);
  }, [loc.key, loc.hash]);

  useEffect(() => setMenu(false), [loc.key]);

  const isActive = (to: string) => {
    if (to.includes('#')) return false;
    if (to === '/') return loc.pathname === '/';
    if (to === '/shop') return (loc.pathname.startsWith('/shop') && !loc.pathname.startsWith('/shop/collabs')) || loc.pathname.startsWith('/product');
    return loc.pathname.startsWith(to);
  };
  const onNav = (to: string) => () => {
    setMenu(false);
    const [path, hash] = to.split('#');
    if (hash && loc.pathname === (path || '/')) window.setTimeout(() => scrollToHash(`#${hash}`), 50);
  };

  const socials = (cls: string) =>
    SOCIALS.map(({ name, href, Icon }) => (
      <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name} className={cls}><Icon /></a>
    ));

  // Black is the base; pages with forms or product detail are the white "break".
  const light = /^\/(product|checkout|order-confirmation|help)(\/|$)/.test(loc.pathname);

  return (
    <div className="store flex min-h-screen flex-col bg-black text-white">
      {catalog?.settings.announcement && (
        <div className="bg-white px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-black">
          <Link to="/shop" className="hover:underline">{catalog.settings.announcement}</Link>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-white/15 bg-black text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 pt-2 md:px-8 md:pt-3">
          <div className="flex items-center gap-1">
            <button onClick={() => setMenu((m) => !m)} className="-ml-2 rounded-full p-2.5 hover:bg-white/10 md:hidden" aria-label="Menu" aria-expanded={menu}>
              {menu ? <CloseIcon /> : <MenuIcon />}
            </button>
            <div className="hidden items-center gap-1 md:flex">{socials('rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white')}</div>
          </div>
          <Link to="/" aria-label="Let's Wrassle Apparel home" className="transition hover:opacity-90">
            <span className="md:hidden"><Logo size={56} /></span>
            <span className="hidden md:block"><Logo size={72} /></span>
          </Link>
          <div className="flex items-center justify-end">
            <button onClick={() => setOpen(true)} className="relative -mr-2 rounded-full p-2.5 transition hover:bg-white/10" aria-label={`Open cart${count ? `, ${count} item${count === 1 ? '' : 's'}` : ''}`}>
              <BagIcon />
              {count > 0 && <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-ink">{count}</span>}
            </button>
          </div>
        </div>

        <nav className="mx-auto hidden max-w-7xl items-center justify-center gap-7 px-8 pb-3 pt-2 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.label} to={n.to} onClick={onNav(n.to)}
              className={`border-b-2 py-1 text-[13px] font-bold uppercase tracking-[0.12em] transition hover:text-white ${isActive(n.to) ? 'border-white text-white' : 'border-transparent text-white/70'}`}>{n.label}</Link>
          ))}
        </nav>
        <div className="h-2 md:hidden" />

        {menu && (
          <nav className="border-t border-white/10 px-4 pb-5 pt-2 md:hidden" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.label} to={n.to} onClick={onNav(n.to)} className={`block border-b border-white/10 py-3.5 font-block text-2xl font-extrabold uppercase ${isActive(n.to) ? 'text-white' : 'text-white/70'}`}>{n.label}</Link>
            ))}
            <div className="mt-4 flex gap-2">{socials('rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white')}</div>
          </nav>
        )}
      </header>

      <main className={`flex-1 ${!light ? '' : /^\/(checkout|order-confirmation)/.test(loc.pathname) ? 'bg-mist text-ink' : 'bg-white text-ink'}`}><Outlet /></main>

      <footer className="border-t border-white/15 bg-black text-gray-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 md:grid-cols-4 md:px-8">
          <div className="sm:col-span-2 md:col-span-1">
            <Logo size={64} />
            <p className="mt-4 text-sm text-gray-400">Wrestling apparel, located and formed in the State of Pennsylvania.</p>
            <div className="-ml-2 mt-3 flex gap-1">{socials('rounded-full p-2 text-gray-300 transition hover:bg-white/10 hover:text-white')}</div>
          </div>
          <div className="text-sm">
            <div className="eyebrow mb-4 text-white">Shop</div>
            <ul className="space-y-2">
              <li><Link className="hover:text-white hover:underline" to="/shop">All products</Link></li>
              {catalog?.categories
                .filter((c) => catalog.products.some((p) => p.active && p.category === c.slug))
                .map((c) => <li key={c.slug}><Link className="hover:text-white hover:underline" to={`/shop/${c.slug}`}>{c.name}</Link></li>)}
            </ul>
          </div>
          <div className="text-sm">
            <div className="eyebrow mb-4 text-white">Let's Wrassle</div>
            <ul className="space-y-2">
              <li><Link className="hover:text-white hover:underline" to="/#about" onClick={onNav('/#about')}>About us</Link></li>
              <li><Link className="hover:text-white hover:underline" to="/#story" onClick={onNav('/#story')}>Our story</Link></li>
              <li><Link className="hover:text-white hover:underline" to="/interviews">Interviews</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="eyebrow mb-4 text-white">Help</div>
            <ul className="space-y-2">
              <li><Link className="hover:text-white hover:underline" to="/help#delivery" onClick={onNav('/help#delivery')}>Delivery &amp; returns</Link></li>
              <li><Link className="hover:text-white hover:underline" to="/help#payment" onClick={onNav('/help#payment')}>Payment info</Link></li>
              <li><a className="hover:text-white hover:underline" href="mailto:support@letswrassleapparel.com">support@letswrassleapparel.com</a></li>
            </ul>
            {catalog?.settings.pickupNotice && <p className="mt-3 text-xs text-gray-400">{catalog.settings.pickupNotice}</p>}
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-gray-400">© {new Date().getFullYear()} Let's Wrassle, Co.</div>
      </footer>
      <CartDrawer />
    </div>
  );
}
