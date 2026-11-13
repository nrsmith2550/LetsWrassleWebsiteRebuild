import type { Catalog, CartItem, Fulfillment, Quote } from './types';

export const MAX_QTY_PER_LINE = 10;
export const MAX_LINES = 15;

/**
 * Prices a cart from the catalog. Used by the browser (to display totals) and by
 * the payment functions (to decide what is actually charged).
 * Throws an Error with a customer-friendly message when something is unavailable.
 */
export function priceCart(catalog: Catalog, items: CartItem[], fulfillment: Fulfillment): Quote {
  if (!items.length) throw new Error('Your cart is empty.');
  if (items.length > MAX_LINES) throw new Error('Too many different items in one order.');

  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.variantId, (merged.get(i.variantId) || 0) + i.quantity);

  const lines = [...merged.entries()].map(([variantId, quantity]) => {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
      throw new Error(`Quantity must be between 1 and ${MAX_QTY_PER_LINE}.`);
    }
    for (const p of catalog.products) {
      if (!p.active) continue;
      const v = p.variants.find((x) => x.id === variantId);
      if (!v) continue;
      const label = [v.size && `Size: ${v.size}`, v.color && `Color: ${v.color}`].filter(Boolean).join(' / ');
      if (!v.inStock) throw new Error(`${p.name}${label ? ` (${label})` : ''} is out of stock. Please remove it from your cart.`);
      return { variantId, productName: p.name, variantSummary: label, quantity, unitPriceCents: v.priceCents };
    }
    throw new Error('An item in your cart is no longer available. Please remove it and try again.');
  });

  const { shippingFlatCents, freeShippingOverCents, taxRate } = catalog.settings;
  const subtotalCents = lines.reduce((n, l) => n + l.unitPriceCents * l.quantity, 0);
  const free = freeShippingOverCents > 0 && subtotalCents >= freeShippingOverCents;
  const shippingCents = fulfillment === 'LOCAL_PICKUP' || free ? 0 : shippingFlatCents;
  const taxCents = Math.round(subtotalCents * taxRate);
  return { lines, subtotalCents, shippingCents, taxCents, totalCents: subtotalCents + shippingCents + taxCents };
}
