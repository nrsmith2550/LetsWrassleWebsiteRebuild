import { Link } from 'react-router-dom';
import { money, Product } from '../lib/api';
import ProductImage from './ProductImage';

export default function ProductCard({ p }: { p: Product }) {
  const soldOut = p.totalStock <= 0;
  const ranged = new Set(p.variants.map((v) => v.priceCents)).size > 1;
  return (
    <Link to={`/product/${p.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded bg-bone">
        <div className="h-full w-full transition duration-300 group-hover:scale-105">
          <ProductImage src={p.images[0]} alt={p.name} label={p.variants[0]?.color} />
        </div>
        {soldOut && <span className="badge absolute left-2 top-2 bg-ink text-white">Out of stock</span>}
      </div>
      <h3 className="mt-3 font-sans text-sm font-semibold normal-case tracking-normal group-hover:text-orange">{p.name}</h3>
      <div className="text-sm text-gray-700">{ranged ? 'From ' : ''}{money(p.minPriceCents)}</div>
    </Link>
  );
}
