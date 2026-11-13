import { Link, useNavigate } from 'react-router-dom';
import { money } from '../lib/api';
import { useCart } from '../lib/cart';
import ProductImage from './ProductImage';

export default function CartDrawer() {
  const { open, setOpen, lines, setQty, remove, subtotalCents, count } = useCart();
  const nav = useNavigate();

  return (
    <>
      <div onClick={() => setOpen(false)} className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-xl">Your Cart{lines.length > 0 && <span className="ml-2 text-sm font-normal text-gray-500">{count} {count === 1 ? 'item' : 'items'}</span>}</h2>
          <button onClick={() => setOpen(false)} className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none hover:bg-fog" aria-label="Close cart">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <div className="py-16 text-center text-gray-600">
              <p className="text-lg font-semibold text-ink">Your cart is empty</p>
              <p className="mt-1 text-sm">Find something to wear to the next practice.</p>
              <Link to="/shop" onClick={() => setOpen(false)} className="btn-primary mt-6">Shop now</Link>
            </div>
          ) : (
            <ul className="divide-y">
              {lines.map((l) => (
                <li key={l.variantId} className="flex gap-3 py-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white"><ProductImage src={l.image} alt={l.name} label={l.variantLabel} /></div>
                  <div className="flex-1 text-sm">
                    <Link to={`/product/${l.slug}`} onClick={() => setOpen(false)} className="font-semibold hover:underline">{l.name}</Link>
                    <div className="text-gray-500">{l.variantLabel}</div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center rounded-full border border-gray-300">
                        <button className="rounded-full px-3 py-1.5" onClick={() => setQty(l.variantId, l.quantity - 1)} aria-label="Decrease">−</button>
                        <span className="w-6 text-center">{l.quantity}</span>
                        <button className="rounded-full px-3 py-1.5" onClick={() => setQty(l.variantId, l.quantity + 1)} aria-label="Increase">+</button>
                      </div>
                      <button onClick={() => remove(l.variantId)} className="text-xs text-gray-600 underline hover:text-red-700">Remove</button>
                    </div>
                  </div>
                  <div className="text-sm font-bold">{money(l.unitPriceCents * l.quantity)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {lines.length > 0 && (
          <div className="border-t bg-mist px-5 py-5">
            <div className="mb-1 flex justify-between text-lg font-bold"><span>Subtotal</span><span>{money(subtotalCents)}</span></div>
            <p className="mb-4 text-sm text-gray-600">Shipping and tax calculated at checkout.</p>
            <button className="btn-primary w-full" onClick={() => { setOpen(false); nav('/checkout'); }}>Checkout</button>
            <button className="mt-3 w-full text-center text-sm text-gray-600 underline hover:text-ink" onClick={() => setOpen(false)}>Continue shopping</button>
          </div>
        )}
      </aside>
    </>
  );
}
