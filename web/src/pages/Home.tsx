import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import HeroSlider, { Slide } from '../components/HeroSlider';
import { LockIcon, PinIcon, ReturnIcon, SOCIALS, TruckIcon } from '../components/Icons';
import { Wordmark } from '../components/Logo';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';
import ProductImage from '../components/ProductImage';
import { money } from '../lib/api';
import { useCatalog } from '../lib/catalog';

const SUPPORT = 'support@letswrassleapparel.com';
const firstSentence = (t: string) => (t.match(/^[^\n]*?[.!?](?=\s|$)/)?.[0] || t.split('\n')[0] || '').trim();

/** Heading on the left, copy on the right: the layout the current site uses for its text sections. */
function Split({ id, title, tone = 'bg-mist', children }: { id: string; title: string; tone?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-28 md:scroll-mt-36 ${tone}`}>
      <div className="section grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-12">
        <h2 className="section-title">{title}</h2>
        <div className="prose-store max-w-2xl text-[17px] leading-relaxed text-gray-800">{children}</div>
      </div>
    </section>
  );
}

export default function Home() {
  const { catalog } = useCatalog();
  const active = useMemo(() => catalog?.products.filter((p) => p.active) ?? [], [catalog]);
  const featured = active.filter((p) => p.featured).slice(0, 8);
  const collabs = active.filter((p) => p.category === 'collabs').slice(0, 3);
  const categories = (catalog?.categories ?? [])
    .map((c) => ({ ...c, items: active.filter((p) => p.category === c.slug) }))
    .filter((c) => c.items.length);
  const settings = catalog?.settings;

  const slides = useMemo<Slide[]>(() => {
    const brand: Slide = {
      image: active.find((p) => p.featured)?.images[0],
      tagline: '"Shoot for the stars, even if you can\'t make it to the Launch Pad"',
      title: "Let's Wrassle, Co.",
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
        tagline: p.isNew ? 'New arrival' : catalog?.categories.find((c) => c.slug === p.category)?.name,
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

      <section className="border-y border-gray-200 bg-white" aria-label="Why shop with us">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-5 px-5 py-6 text-sm md:grid-cols-4">
          <li className="flex items-center gap-3"><TruckIcon /><span><b className="block font-semibold">Ships in 2–3 business days</b><span className="text-gray-600">{settings ? `${money(settings.shippingFlatCents)} flat rate, tracked` : 'Tracked shipping'}</span></span></li>
          <li className="flex items-center gap-3"><ReturnIcon /><span><b className="block font-semibold">7-day returns</b><span className="text-gray-600">Returns &amp; exchanges</span></span></li>
          <li className="flex items-center gap-3"><LockIcon /><span><b className="block font-semibold">Secure checkout</b><span className="text-gray-600">Card, Apple Pay, Google Pay</span></span></li>
          <li className="flex items-center gap-3"><PinIcon /><span><b className="block font-semibold">Pennsylvania based</b><span className="text-gray-600">Founded by a 2x All-American</span></span></li>
        </ul>
      </section>

      <Split id="about" title="About Us">
        <p>Let's Wrassle isn't just a brand, the sport of wrestling is a product of individuals who aren't afraid to fight for their love of what they do. There is a certain pride that is brought regardless of where your wrestling career is geared towards. The way you interpret this sport, is a dedication to yourself along with an obsession for continuing to improve.</p>
        <p>Let's Wrassle Apparel Co. has a goal of continuing to help athletes to show their love for what they do, along with the comfort and state of mind to continue to the final whistle without hesitation due to your wardrobe.</p>
      </Split>

      <section className="bg-fog">
        <div className="section">
          <h2 className="section-title text-center">Featured Products</h2>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {!catalog ? Array.from({ length: 4 }, (_, k) => <ProductCardSkeleton key={k} />) : featured.map((p) => <ProductCard key={p.slug} p={p} />)}
          </div>
          {catalog && featured.length === 0 && <p className="mt-6 text-center text-gray-600">Products coming soon.</p>}
          <div className="mt-10 text-center"><Link to="/shop" className="btn-primary">View all products</Link></div>
        </div>
      </section>

      {categories.length > 1 && (
        <section className="bg-mist">
          <div className="section">
            <h2 className="section-title text-center">Shop by Category</h2>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
              {categories.map((c) => (
                <Link key={c.slug} to={`/shop/${c.slug}`} className="group overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="aspect-[4/3] overflow-hidden bg-white"><div className="h-full w-full transition duration-500 group-hover:scale-[1.04]"><ProductImage src={c.items[0].images[0]} alt="" /></div></div>
                  <div className="border-t border-gray-100 px-3 py-4 text-center">
                    <h3 className="text-base font-semibold group-hover:underline">{c.name}</h3>
                    <p className="mt-0.5 text-sm text-gray-600">{c.items.length} {c.items.length === 1 ? 'product' : 'products'}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-slate px-5 py-20 text-center md:py-28" aria-label="Let's Wrassle">
        <Wordmark invert className="text-[clamp(34px,9vw,110px)]" />
      </section>

      <section className="bg-mist">
        <div className="section">
          <p className="eyebrow text-center">Our Collaborations</p>
          <h2 className="section-title mt-2 text-center">Built With The Community</h2>
          {collabs.length ? (
            <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">{collabs.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
          ) : (
            <p className="mx-auto mt-6 max-w-md text-center text-gray-600">Athlete and club collaborations are on the way. New drops land here first.</p>
          )}
          <div className="mt-10 text-center"><Link to="/shop/collabs" className="btn-outline">Browse collabs</Link></div>
        </div>
      </section>

      <section id="story" className="scroll-mt-28 bg-[#c9c9c9] md:scroll-mt-36">
        <div className="section grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className="section-title">Our Story</h2>
            <h3 className="mt-8 text-lg">Founder</h3>
            <p className="mt-2 text-[17px] leading-relaxed text-gray-900">Let's Wrassle was founded by former 2x NCAA All-American Nate Smith. Nate was a story of a high school wrestler who peaked in college. After never making it to the Pennsylvania State Tournament, Nate went to The University of Pittsburgh at Johnstown. A Division II school very well known for their Wrestling Team under Legendary Coach Pat Pecora.</p>
            <h3 className="mt-8 text-lg">The Story Behind Let's Wrassle</h3>
            <p className="mt-2 text-[17px] leading-relaxed text-gray-900">Every athlete shoots to be a state champ, national champ, or to be the best in their given sport. However, many fall short and look back with regret. The work put forth, and the dedication that is required to participate, along with the experiences and morals taught along the way are the most important lessons learned. Wrassling was a term used by our founder from the time spent in competition, putting a playful and jovial tone to one of the most intense and serious sports on the planet.</p>
          </div>
          <figure>
            <img src="/uploads/site/founder.webp" alt="Founder Nate Smith in a Let's Wrassle t-shirt" loading="lazy" width={1170} height={1104} className="w-full rounded-lg object-cover" />
            <figcaption className="mt-3 text-sm text-gray-700">Nate Smith, founder of Let's Wrassle</figcaption>
          </figure>
        </div>
      </section>

      <Split id="delivery" title="Delivery & Returns">
        <h3 className="text-base">Shipping Information</h3>
        <p className="!mt-1">All apparel from Let's Wrassle is available through <b>shipping or Local Pickup</b>. Orders are processed within 2–3 business days, and shipping times may vary based on your location. Once your order ships, you will receive a confirmation email with tracking information.</p>
        {settings?.pickupNotice && <p className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-[15px] font-medium">{settings.pickupNotice}</p>}
        <h3 className="mt-8 text-base">Returns &amp; Exchanges</h3>
        <p className="!mt-1">We want you to be happy with your purchase! If there's an issue with your order, you can request a return or exchange within <b>7 days</b> of delivery. To start a return, please contact our support team at <a className="font-semibold underline" href={`mailto:${SUPPORT}`}>{SUPPORT}</a>. Be sure to include your order number and a brief description of the issue.</p>
        <p>Items must be unworn, unwashed, and in original condition. Return shipping costs may apply unless the item arrived damaged or there was an error on our part.</p>
      </Split>

      <Split id="payment" title="Payment Info" tone="bg-white">
        <p>Card transactions are powered and processed by <b>Square</b>. Let's Wrassle accepts <b>most major credit and debit cards</b>, plus <b>Apple Pay and Google Pay</b> on supported devices, to provide a smooth and secure checkout experience.</p>
        <p>Payments are processed using secure, encrypted technology that protects your information and ensures safe transactions every time. You never leave this site to pay, and you'll receive a confirmation email as soon as your order is placed.</p>
        <p>If you have any questions or run into issues during checkout, feel free to contact us at <a className="font-semibold underline" href={`mailto:${SUPPORT}`}>{SUPPORT}</a>.</p>
      </Split>

      <section className="relative overflow-hidden bg-ink text-center text-white">
        {featured[0]?.images[0] && <img src={featured[0].images[0]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
        <div className="relative mx-auto max-w-2xl px-5 py-24 md:py-32">
          <h2 className="section-title">Explore Our Catalog</h2>
          <p className="mt-5 text-lg text-white/90">Welcome to the first release of many apparel items to showcase your love for the sport of wrestling. Let's get ready to Wrassle!</p>
          <Link to="/shop" className="btn-light mt-8">Order Now</Link>
        </div>
      </section>

      <section id="contact" className="scroll-mt-28 bg-fog md:scroll-mt-36">
        <div className="section max-w-2xl text-center">
          <h2 className="section-title">Contact Us</h2>
          <p className="mt-6 text-[17px] leading-relaxed text-gray-800">For any questions or concerns please feel free to reach out to us via email. We will be back with you as quickly as possible!</p>
          <p className="mt-4 text-gray-700">Located and formed in the State of Pennsylvania</p>
          <a href={`mailto:${SUPPORT}`} className="btn-primary mt-7 max-w-full break-all">{SUPPORT}</a>
          <div className="mt-12">
            <h3 className="text-xl">Follow Let's Wrassle</h3>
            <div className="mt-4 flex justify-center gap-3">
              {SOCIALS.map(({ name, href, Icon }) => (
                <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name} className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white transition hover:bg-black"><Icon /></a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
