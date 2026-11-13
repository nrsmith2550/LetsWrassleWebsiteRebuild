import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CatProduct, money } from '../lib/api';
import ProductImage from './ProductImage';

/** Dot colors for the color names used in the catalog. Unknown names simply get no dot. */
const SWATCH: Record<string, string> = {
  black: '#111111', white: '#ffffff', gray: '#9a9a9a', grey: '#9a9a9a', blue: '#2f5fd0', 'light blue': '#8fc7ee', red: '#d62f2f',
  green: '#3d9a5b', pink: '#f3a6c0', orange: '#e8731f', navy: '#1c2b4a', yellow: '#f2c94c', purple: '#7b4bc4',
};

/** Product tile for the black sections: large borderless photo, second photo on hover, color dots. */
export default function ProductCard({ p }: { p: CatProduct }) {
  const [hovered, setHovered] = useState(false);
  const soldOut = !p.variants.some((v) => v.inStock);
  const ranged = new Set(p.variants.map((v) => v.priceCents)).size > 1;
  const colors = [...new Set(p.variants.map((v) => v.color).filter(Boolean))];
  const dots = colors.length > 1 ? colors.filter((c) => SWATCH[c.toLowerCase()]) : [];
  return (
    <Link to={`/product/${p.slug}`} className="group block" onMouseEnter={() => setHovered(true)} onFocus={() => setHovered(true)}>
      <div className="relative aspect-square overflow-hidden rounded-sm bg-white">
        <div className={`h-full w-full transition duration-700 group-hover:scale-[1.03] ${soldOut ? 'opacity-60' : ''}`}>
          <ProductImage src={p.images[0]} alt={p.name} label={p.variants[0]?.color} />
        </div>
        {hovered && p.images[1] && (
          <img src={p.images[1]} alt="" className="absolute inset-0 hidden h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 [@media(hover:hover)]:block" />
        )}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {p.isNew && <span className="badge bg-flag text-white">New</span>}
          {soldOut && <span className="badge bg-black text-white">Out of stock</span>}
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1 sm:mt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h3 className="font-sans text-[15px] font-semibold normal-case leading-snug tracking-normal underline-offset-4 group-hover:underline md:text-base">{p.name}</h3>
        <div className="whitespace-nowrap text-[15px] font-bold md:text-base">{ranged ? 'From ' : ''}{money(p.minPriceCents)}</div>
      </div>
      {dots.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5" aria-label={`${colors.length} colors`}>
          {dots.map((c) => <span key={c} title={c} className="h-3.5 w-3.5 rounded-full ring-1 ring-white/40" style={{ background: SWATCH[c.toLowerCase()] }} />)}
          <span className="ml-1 text-xs opacity-60">{colors.length} colors</span>
        </div>
      )}
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton aspect-square" />
      <div className="mt-4 flex justify-between gap-4"><div className="skeleton h-4 w-2/3" /><div className="skeleton h-4 w-12" /></div>
    </div>
  );
}
