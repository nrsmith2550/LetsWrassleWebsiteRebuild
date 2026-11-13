import type { Catalog, PricedLine } from './types';

export interface Parcel {
  weightOz: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
}

/** Validates a package from the admin form. Throws Error(message). */
export function parseParcel(body: any): Parcel {
  const n = (v: unknown) => Number(v);
  const p = { weightOz: n(body?.weightOz), lengthIn: n(body?.lengthIn), widthIn: n(body?.widthIn), heightIn: n(body?.heightIn) };
  for (const [k, v] of Object.entries(p)) {
    if (!Number.isFinite(v) || v <= 0 || v > 1500) throw new Error(`Enter a valid ${k.replace(/([A-Z])/g, ' $1').toLowerCase()}.`);
  }
  return p;
}

/**
 * Suggested package for an order: item weights add up, footprint comes from Store settings,
 * and the box gets a little taller for each extra item. The admin can edit all of it.
 */
export function defaultParcel(catalog: Catalog, lines: PricedLine[]): Parcel {
  const s = catalog.settings;
  let weight = 0;
  let qty = 0;
  for (const l of lines) {
    const p = catalog.products.find((x) => x.variants.some((v) => v.id === l.variantId)) || catalog.products.find((x) => x.name === l.productName);
    weight += (p?.weightOz ?? s.itemWeightOz) * l.quantity;
    qty += l.quantity;
  }
  return {
    weightOz: Math.round(Math.max(weight, 1) * 10) / 10,
    lengthIn: s.pkgLengthIn,
    widthIn: s.pkgWidthIn,
    heightIn: Math.round(Math.max(s.pkgHeightIn, 0.75 * qty) * 10) / 10,
  };
}
