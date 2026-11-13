import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ProductImage from '../components/ProductImage';
import { api, Product } from '../lib/api';

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [collabs, setCollabs] = useState<Product[]>([]);

  useEffect(() => {
    api<{ products: Product[] }>('/products?featured=true').then((r) => setFeatured(r.products.slice(0, 8))).catch(() => {});
    api<{ products: Product[] }>('/products?category=collabs').then((r) => setCollabs(r.products.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-orange">Wrestling Apparel Co.</p>
            <h1 className="text-5xl leading-[0.95] md:text-7xl">Let's<br />Wrassle.</h1>
            <p className="mt-5 max-w-md text-lg text-gray-300">
              Gear for athletes who love the sport — comfortable enough to compete in all the way to the final whistle.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-orange">Shop the collection</Link>
              <Link to="/interviews" className="btn border-2 border-white text-white hover:bg-white hover:text-ink">Watch interviews</Link>
            </div>
          </div>
          <div className="aspect-square overflow-hidden rounded-lg bg-white/5 md:aspect-[4/3]">
            <ProductImage src={featured[0]?.images[0]} alt="Featured apparel" />
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-3xl">Featured Apparel</h2>
          <Link to="/shop" className="text-sm font-bold uppercase tracking-widest text-orange hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
        {featured.length === 0 && <p className="text-gray-500">Products coming soon.</p>}
      </section>

      {/* Collab spotlight */}
      <section className="bg-bone">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange">Collab Spotlight</p>
            <h2 className="text-3xl">Built With The Community</h2>
          </div>
          {collabs.length ? (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">{collabs.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-10 text-center text-gray-500">
              Athlete and club collaborations are on the way. Follow along — new drops land here first.
              <div><Link to="/shop/collabs" className="btn-outline btn-sm mt-4">Browse collabs</Link></div>
            </div>
          )}
        </div>
      </section>

      {/* Our story */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange">Our Story</p>
          <h2 className="mt-1 text-3xl">Fight for what you love</h2>
          <p className="mt-4 text-gray-700">
            Let's Wrassle isn't just a brand — the sport of wrestling is a product of individuals who aren't afraid to fight for their love of what they do.
            It's a dedication to yourself along with an obsession for continuing to improve.
          </p>
        </div>
        <div>
          <h3 className="text-xl">The founder</h3>
          <p className="mt-3 text-gray-700">
            Let's Wrassle was founded by former 2x NCAA All-American Nate Smith — a high school wrestler who peaked in college at the University of Pittsburgh at Johnstown under legendary coach Pat Pecora.
            "Wrassling" was the playful, jovial word he used for one of the most intense sports on the planet.
          </p>
        </div>
      </section>
    </>
  );
}
