import { useState } from 'react';
import ProductImage from '../../components/ProductImage';
import { useCatalog } from '../../lib/catalog';
import { btnPrimary, Card, field, PageTitle } from '../AdminShell';
import { money } from '../adminApi';

/** Product list in the IONOS style. Editing opens the CMS editor (each save becomes a reviewable change). */
export default function Catalog() {
  const { catalog, error } = useCatalog();
  const [q, setQ] = useState('');
  const list = (catalog?.products ?? []).filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageTitle right={<a className={btnPrimary} href="/cms/#/collections/products/new" target="_blank" rel="noreferrer">+ Add new product</a>}>Products</PageTitle>
      <input className={`${field} mb-4`} placeholder="Search product name" value={q} onChange={(e) => setQ(e.target.value)} />
      {error && <p className="text-ionos-red">{error}</p>}
      {!catalog ? <p className="text-ionos-muted">Loading…</p> : (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wide text-ionos-muted">{list.length} of {catalog.products.length} products</div>
          {list.map((p) => {
            const inStock = p.variants.some((v) => v.inStock);
            return (
              <Card key={p.slug} className="flex items-center gap-4 !p-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-ionos-page"><ProductImage src={p.images[0]} alt="" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{p.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm">
                    <span className={`font-semibold ${p.active ? 'text-ionos-green' : 'text-ionos-muted'}`}>{p.active ? 'Enabled' : 'Disabled'}</span>
                    <span className={inStock ? 'text-ionos-text' : 'font-semibold text-ionos-red'}>{inStock ? 'In stock' : 'Out of stock'}</span>
                    <span className="text-ionos-muted">{p.variants.length} option{p.variants.length === 1 ? '' : 's'}</span>
                    {p.featured && <span className="text-ionos-muted">Featured on homepage</span>}
                  </div>
                </div>
                <div className="text-lg font-bold">{money(p.minPriceCents)}</div>
                <a className="rounded border border-ionos-line px-3 py-1.5 text-sm font-semibold hover:bg-ionos-page" href={`/cms/#/collections/products/entries/${p.slug}`} target="_blank" rel="noreferrer">Edit product</a>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
