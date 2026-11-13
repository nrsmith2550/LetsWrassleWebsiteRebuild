import { Link, useNavigate } from 'react-router-dom';
import { money } from '../lib/api';
import { useCart } from '../lib/cart';
import ProductImage from './ProductImage';

export default function CartDrawer() {
  const { open, setOpen, lines, setQty, remove, subtotalCents } = useCart();
  const nav = useNavigate();

  return (
    <>
      <div onClick={() => setOpen(false)} className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-xl">Your Cart</h2>
          <button onClick={() => setOpen(false)} className="p-1 text-2xl leading-none" aria-label="Close cart">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <p>Your cart is empty.</p>
              <Link to="/shop" onClick={() => setOpen(false)} className="btn-primary mt-4">Shop now</Link>
            </div>
          ) : (
            <ul className="divide-y">
              {lines.map((l) => (
                <li key={l.variantId} className="flex gap-3 py-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-bone"><ProductImage src={l.image} alt={l.name} label={l.variantLabel} /></div>
                  <div className="flex-1 text-sm">
                    <Link to={`/product/${l.slug}`} onClick={() => setOpen(false)} className="font-semibold hover:text-orange">{l.name}</Link>
                    <div className="text-gray-500">{l.variantLabel}</div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center rounded border">
                        <button className="px-2.5 py-1" onClick={() => setQty(l.variantId, l.quantity - 1)} aria-label="Decrease">−</button>
                        <span className="w-6 text-center">{l.quantity}</span>
                        <button className="px-2.5 py-1" onClick={() => setQty(l.variantId, l.quantity + 1)} aria-label="Increase">+</button>
                      </div>
                      <button onClick={() => remove(l.variantId)} className="text-xs text-gray-500 underline hover:text-red-600">Remove</button>
                    </div>
                  </div>
                  <div className="text-sm font-bold">{money(l.unitPriceCents * l.quantity)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {lines.length > 0 && (
          <div className="border-t px-5 py-4">
            <div className="mb-1 flex justify-between font-bold"><span>Subtotal</span><span>{money(subtotalCents)}</span></div>
            <p className="mb-3 text-xs text-gray-500">Shipping and tax calculated at checkout.</p>
            <button className="btn-orange w-full" onClick={() => { setOpen(false); nav('/checkout'); }}>Checkout</button>
          </div>
        )}
      </aside>
    </>
  );
}
