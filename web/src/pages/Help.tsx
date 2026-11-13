import { Link } from 'react-router-dom';
import { Script } from '../components/Title';
import { money } from '../lib/api';
import { useCatalog } from '../lib/catalog';

const SUPPORT = 'support@letswrassleapparel.com';

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-gray-200 py-10 md:scroll-mt-40 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-12 md:py-14">
      <h2 className="text-3xl md:text-4xl">{title}</h2>
      <div className="prose-store mt-4 max-w-2xl text-[17px] leading-relaxed text-gray-800 md:mt-0">{children}</div>
    </section>
  );
}

/** Delivery, returns, payment and contact details (moved off the home page). */
export default function Help() {
  const { catalog } = useCatalog();
  const settings = catalog?.settings;
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
      <h1 className="text-5xl md:text-7xl"><Script>Need</Script>Help?</h1>
      <p className="mt-5 max-w-xl text-lg text-gray-700">Everything about shipping, returns and paying for your order. Still stuck? Email us and we will get back to you quickly.</p>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="On this page">
        {[['delivery', 'Delivery'], ['returns', 'Returns'], ['payment', 'Payment'], ['contact', 'Contact']].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="btn-outline btn-sm">{label}</a>
        ))}
      </nav>

      <div className="mt-10">
        <Block id="delivery" title="Delivery">
          <p>All apparel from Let's Wrassle is available through <b>shipping or Local Pickup</b>. {settings && <>Standard shipping is a flat {money(settings.shippingFlatCents)} per order. </>}Orders are processed within 2–3 business days, and shipping times may vary based on your location.</p>
          <p>Once your order ships, you will receive a confirmation email with tracking information.</p>
          {settings?.pickupNotice && <p className="rounded-sm border border-gray-300 bg-mist px-4 py-3 text-[15px] font-semibold">{settings.pickupNotice}</p>}
        </Block>

        <Block id="returns" title="Returns & Exchanges">
          <p>We want you to be happy with your purchase! If there's an issue with your order, you can request a return or exchange within <b>7 days</b> of delivery.</p>
          <p>To start a return, please contact our support team at <a className="font-semibold underline" href={`mailto:${SUPPORT}`}>{SUPPORT}</a>. Be sure to include your order number and a brief description of the issue.</p>
          <p>Items must be unworn, unwashed, and in original condition. Return shipping costs may apply unless the item arrived damaged or there was an error on our part.</p>
        </Block>

        <Block id="payment" title="Payment">
          <p>Card transactions are powered and processed by <b>Square</b>. Let's Wrassle accepts <b>most major credit and debit cards</b>, plus <b>Apple Pay and Google Pay</b> on supported devices.</p>
          <p>Payments are processed using secure, encrypted technology that protects your information. You never leave this site to pay, and you'll receive a confirmation email as soon as your order is placed.</p>
        </Block>

        <Block id="contact" title="Contact">
          <p>For any questions or concerns please feel free to reach out to us via email. We will be back with you as quickly as possible!</p>
          <p><a className="font-semibold underline" href={`mailto:${SUPPORT}`}>{SUPPORT}</a></p>
          <p className="text-gray-600">Located and formed in the State of Pennsylvania.</p>
        </Block>
      </div>

      <div className="mt-6 border-t border-gray-200 pt-10 text-center"><Link to="/shop" className="btn-primary">Back to the store</Link></div>
    </div>
  );
}
