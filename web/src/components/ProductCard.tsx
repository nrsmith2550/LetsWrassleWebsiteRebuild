import { Link } from 'react-router-dom';
import { CatProduct, money } from '../lib/api';
import ProductImage from './ProductImage';

export default function ProductCard({ p }: { p: CatProduct }) {
  const soldOut = !p.variants.some((v) => v.inStock);
  const ranged = new Set(p.variants.map((v) => v.priceCents)).size > 1;
  return (
    <Link to={`/product/${p.slug}`} className="group flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-white">
        <div className={`h-full w-full transition duration-500 group-hover:scale-[1.04] ${soldOut ? 'opacity-60' : ''}`}>
          <ProductImage src={p.images[0]} alt={p.name} label={p.variants[0]?.color} />
        </div>
        {p.isNew && <span className="badge absolute right-2 top-2 bg-flag text-white">New</span>}
        {soldOut && <span className="badge absolute left-2 top-2 bg-ink text-white">Out of stock</span>}
      </div>
      <div className="flex flex-1 flex-col items-center gap-1 border-t border-gray-100 px-3 py-4 text-center">
        <h3 className="text-[15px] font-normal leading-snug tracking-normal group-hover:underline">{p.name}</h3>
        <div className="mt-auto pt-1 text-[15px] font-bold">{ranged ? 'From ' : ''}{money(p.minPriceCents)}</div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white" aria-hidden>
      <div className="skeleton aspect-square rounded-none" />
      <div className="flex flex-col items-center gap-2 px-3 py-4"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-4 w-1/4" /></div>
    </div>
  );
}
