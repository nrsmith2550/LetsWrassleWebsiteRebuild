import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { api, Category, Product } from '../lib/api';

const SORTS = [
  ['featured', 'Featured'],
  ['newest', 'Newest'],
  ['price-asc', 'Price: Low to High'],
  ['price-desc', 'Price: High to Low'],
];

export default function Shop() {
  const { categorySlug } = useParams();
  const nav = useNavigate();
  const [cats, setCats] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sort, setSort] = useState('featured');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ categories: Category[] }>('/categories').then((r) => setCats(r.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ sort });
    if (categorySlug) qs.set('category', categorySlug);
    api<{ products: Product[] }>(`/products?${qs}`)
      .then((r) => setProducts(r.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [categorySlug, sort]);

  const tab = (active: boolean) =>
    `whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold uppercase tracking-wider transition ${active ? 'bg-ink text-white' : 'bg-bone text-ink hover:bg-orange hover:text-white'}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-4xl">{cats.find((c) => c.slug === categorySlug)?.name || 'Shop All'}</h1>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Link to="/shop" className={tab(!categorySlug)}>All</Link>
          {cats.map((c) => (
            <Link key={c.id} to={`/shop/${c.slug}`} className={tab(categorySlug === c.slug)}>{c.name}</Link>
          ))}
        </div>
        <select className="input md:w-56" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="py-20 text-center text-gray-500">Loading…</p>
      ) : products.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          <p>No products here yet.</p>
          <button className="btn-outline btn-sm mt-4" onClick={() => nav('/shop')}>See everything</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
