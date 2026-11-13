import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import HeroSlider, { Slide } from '../components/HeroSlider';
import { LockIcon, PinIcon, ReturnIcon, SOCIALS, TruckIcon } from '../components/Icons';
import { Wordmark } from '../components/Logo';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';
import ProductImage from '../components/ProductImage';
import { Script } from '../components/Title';
import { money } from '../lib/api';
import { useCatalog } from '../lib/catalog';

const SUPPORT = 'support@letswrassleapparel.com';
const firstSentence = (t: string) => (t.match(/^[^\n]*?[.!?](?=\s|$)/)?.[0] || t.split('\n')[0] || '').trim();
const GRID = 'grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8 md:gap-y-14';

export default function Home() {
  const { catalog } = useCatalog();
  const active = useMemo(() => catalog?.products.filter((p) => p.active) ?? [], [catalog]);
  const featured = active.filter((p) => p.featured).slice(0, 6);
  const collabs = active.filter((p) => p.category === 'collabs').slice(0, 3);
  const categories = (catalog?.categories ?? [])
    .map((c) => ({ ...c, items: active.filter((p) => p.category === c.slug) }))
    .filter((c) => c.items.length);
  const settings = catalog?.settings;

  const slides = useMemo<Slide[]>(() => {
    const brand: Slide = {
      image: active.find((p) => p.featured)?.images[0],
      accent: "Let's",
      title: 'Wrassle.',
      tagline: '"Shoot for the stars, even if you can\'t make it to the Launch Pad"',
      text: 'Premium wrestling apparel for athletes who love the sport, built to be worn from the practice room to the final whistle.',
      cta: 'Shop the catalog',
      to: '/shop',
    };
    const picks = [...active]
      .filter((p) => p.images.length && p.variants.some((v) => v.inStock))
      .sort((a, b) => Number(b.isNew) - Number(a.isNew) || +new Date(b.date) - +new Date(a.date))
      .slice(0, 4)
      .map<Slide>((p) => ({
        image: p.images[0],
        accent: p.isNew ? 'New arrival' : catalog?.categories.find((c) => c.slug === p.category)?.name,
        title: p.name,
        text: firstSentence(p.description),
        cta: `View product · ${money(p.minPriceCents)}`,
        to: `/product/${p.slug}`,
      }));
    return [brand, ...picks];
  }, [active, catalog]);

  return (
    <>
      <HeroSlider slides={slides} />

      {/* One-line summary of the policies; the full text lives on /help */}
      <section className="border-y border-white/15" aria-label="Shipping, returns and payment">
        <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-5 px-5 py-6 text-sm md:grid-cols-4 md:px-8">
          <li><Link to="/help#delivery" className="group flex items-center gap-3"><TruckIcon /><span><b className="block font-semibold group-hover:underline">Ships in 2–3 business days</b><span className="text-white/60">{settings ? `${money(settings.shippingFlatCents)} flat rate, tracked` : 'Tracked shipping'}</span></span></Link></li>
          <li><Link to="/help#returns" className="group flex items-center gap-3"><ReturnIcon /><span><b className="block font-semibold group-hover:underline">7-day returns</b><span className="text-white/60">Returns &amp; exchanges</span></span></Link></li>
          <li><Link to="/help#payment" className="group flex items-center gap-3"><LockIcon /><span><b className="block font-semibold group-hover:underline">Secure checkout</b><span className="text-white/60">Card, Apple Pay, Google Pay</span></span></Link></li>
          <li className="flex items-center gap-3"><PinIcon /><span><b className="block font-semibold">Pennsylvania based</b><span className="text-white/60">Founded by a 2x All-American</span></span></li>
        </ul>
      </section>

      <section>
        <div className="section">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4 md:mb-14">
            <h2 className="section-title"><Script>Featured</Script>Products</h2>
            <Link to="/shop" className="btn-outline-light btn-sm">View all</Link>
          </div>
          <div className={GRID}>
            {!catalog ? Array.from({ length: 3 }, (_, k) => <ProductCardSkeleton key={k} />) : featured.map((p) => <ProductCard key={p.slug} p={p} />)}
          </div>
          {catalog && featured.length === 0 && <p className="text-white/60">Products coming soon.</p>}
        </div>
      </section>

      <section id="about" className="scroll-mt-28 bg-white text-ink md:scroll-mt-40">
        <div className="section grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-16">
          <div>
            <h2 className="section-title"><Script>About</Script>Us</h2>
            <Wordmark className="mt-8 hidden text-5xl md:block" />
          </div>
          <div className="prose-store text-lg leading-relaxed text-gray-800">
            <p className="text-2xl font-bold leading-snug text-black md:text-3xl">Let's Wrassle isn't just a brand. The sport of wrestling is a product of individuals who aren't afraid to fight for their love of what they do.</p>
            <p>There is a certain pride that is brought regardless of where your wrestling career is geared towards. The way you interpret this sport, is a dedication to yourself along with an obsession for continuing to improve.</p>
            <p>Let's Wrassle Apparel Co. has a goal of continuing to help athletes to show their love for what they do, along with the comfort and state of mind to continue to the final whistle without hesitation due to your wardrobe.</p>
          </div>
        </div>
      </section>

      {categories.length > 1 && (
        <section>
          <div className="section">
            <h2 className="section-title mb-10 md:mb-14"><Script>Shop by</Script>Category</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {categories.map((c) => (
                <Link key={c.slug} to={`/shop/${c.slug}`} className="group relative block aspect-[3/4] overflow-hidden rounded-sm bg-white">
                  <div className="h-full w-full transition duration-700 group-hover:scale-[1.05]"><ProductImage src={c.items[0].images[0]} alt="" /></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                    <h3 className="text-xl md:text-2xl">{c.name}</h3>
                    <p className="mt-1.5 text-sm text-white/75"><span className="underline-offset-4 group-hover:underline">Shop {c.items.length} {c.items.length === 1 ? 'product' : 'products'}</span> →</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-white/15 bg-coal">
        <div className="section">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4 md:mb-14">
            <div>
              <p className="eyebrow mb-3 text-white/60">Our Collaborations</p>
              <h2 className="section-title"><Script>Built with</Script>The Community</h2>
            </div>
            <Link to="/shop/collabs" className="btn-outline-light btn-sm">Browse collabs</Link>
          </div>
          {collabs.length ? (
            <div className={GRID}>{collabs.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
          ) : (
            <p className="max-w-md text-white/60">Athlete and club collaborations are on the way. New drops land here first.</p>
          )}
        </div>
      </section>

      <section id="story" className="scroll-mt-28 bg-white text-ink md:scroll-mt-40">
        <div className="section grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
          <figure className="md:order-2">
            <img src="/uploads/site/founder.webp" alt="Founder Nate Smith in a Let's Wrassle t-shirt" loading="lazy" width={1170} height={1104} className="w-full rounded-sm object-cover" />
            <figcaption className="mt-3 text-sm text-gray-600">Nate Smith, founder of Let's Wrassle</figcaption>
          </figure>
          <div>
            <h2 className="section-title"><Script>Our</Script>Story</h2>
            <h3 className="mt-10 text-xl">Founder</h3>
            <p className="mt-3 text-[17px] leading-relaxed text-gray-800">Let's Wrassle was founded by former 2x NCAA All-American Nate Smith. Nate was a story of a high school wrestler who peaked in college. After never making it to the Pennsylvania State Tournament, Nate went to The University of Pittsburgh at Johnstown. A Division II school very well known for their Wrestling Team under Legendary Coach Pat Pecora.</p>
            <h3 className="mt-8 text-xl">The Story Behind Let's Wrassle</h3>
            <p className="mt-3 text-[17px] leading-relaxed text-gray-800">Every athlete shoots to be a state champ, national champ, or to be the best in their given sport. However, many fall short and look back with regret. The work put forth, and the dedication that is required to participate, along with the experiences and morals taught along the way are the most important lessons learned. Wrassling was a term used by our founder from the time spent in competition, putting a playful and jovial tone to one of the most intense and serious sports on the planet.</p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden text-center">
        {featured[0]?.images[0] && <img src={featured[0].images[0]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
        <div className="relative mx-auto max-w-3xl px-5 py-24 md:py-36">
          <h2 className="text-5xl md:text-7xl"><Script>Explore</Script>Our Catalog</h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/85">Welcome to the first release of many apparel items to showcase your love for the sport of wrestling. Let's get ready to Wrassle!</p>
          <Link to="/shop" className="btn-light mt-9">Order Now</Link>
        </div>
      </section>

      <section id="contact" className="scroll-mt-28 border-t border-white/15 md:scroll-mt-40">
        <div className="section grid grid-cols-1 gap-10 md:grid-cols-2 md:items-end">
          <div>
            <h2 className="section-title"><Script>Contact</Script>Us</h2>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-white/75">For any questions or concerns please feel free to reach out to us via email. We will be back with you as quickly as possible!</p>
            <a href={`mailto:${SUPPORT}`} className="mt-5 inline-block break-all text-lg font-bold underline underline-offset-4 hover:no-underline">{SUPPORT}</a>
            <p className="mt-3 text-sm text-white/60">Located and formed in the State of Pennsylvania · <Link to="/help" className="underline hover:text-white">Delivery, returns &amp; payment</Link></p>
          </div>
          <div className="md:text-right">
            <p className="eyebrow text-white/60">Follow Let's Wrassle</p>
            <div className="mt-4 flex gap-3 md:justify-end">
              {SOCIALS.map(({ name, href, Icon }) => (
                <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 transition hover:bg-white hover:text-black"><Icon /></a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
