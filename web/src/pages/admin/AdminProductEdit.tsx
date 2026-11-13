import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, assetUrl, Category, Product } from '../../lib/api';

interface VRow { id?: number; sku: string; size: string; color: string; price: string; stock: string }
const SIZE_PRESETS: Record<string, string[]> = { Adult: ['S', 'M', 'L', 'XL', '2XL'], Youth: ['YS', 'YM', 'YL'], 'One size': ['One Size'] };

export default function AdminProductEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = !id;
  const [cats, setCats] = useState<Category[]>([]);
  const [f, setF] = useState({ name: '', slug: '', description: '', price: '25.00', categoryId: 0, isFeatured: false, isActive: true, wt: '6', l: '10', w: '8', h: '1' });
  const [images, setImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<VRow[]>([]);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api<{ categories: Category[] }>('/admin/categories').then((r) => {
      setCats(r.categories);
      if (isNew && r.categories[0]) setF((x) => ({ ...x, categoryId: r.categories[0].id }));
    });
    if (id) {
      api<{ product: Product }>(`/admin/products/${id}`).then(({ product: p }) => {
        setF({ name: p.name, slug: p.slug, description: p.description, price: (p.basePriceCents / 100).toFixed(2), categoryId: p.categoryId, isFeatured: p.isFeatured, isActive: p.isActive, wt: String(p.defaultWeightOz), l: String(p.defaultLengthIn), w: String(p.defaultWidthIn), h: String(p.defaultHeightIn) });
        setImages(p.images);
        setVariants(p.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size, color: v.color, price: v.priceOverrideCents == null ? '' : (v.priceOverrideCents / 100).toFixed(2), stock: String(v.stockQuantity) })));
      }).catch((e) => setErr(e.message));
    }
  }, [id, isNew]);

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setV = (i: number, k: keyof VRow, v: string) => setVariants((rows) => rows.map((r, n) => (n === i ? { ...r, [k]: v } : r)));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setErr('');
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const r = await api<{ url: string }>('/admin/upload', { form: fd });
        setImages((cur) => [...cur, r.url]);
      }
    } catch (e: any) { setErr(e.message); } finally { setUploading(false); }
  }

  function addPreset(name: string) {
    const color = variants[variants.length - 1]?.color || '';
    setVariants((rows) => [...rows, ...SIZE_PRESETS[name].filter((s) => !rows.some((r) => r.size === s && r.color === color)).map((size) => ({ sku: '', size, color, price: '', stock: '10' }))]);
  }

  async function save() {
    setSaving(true); setErr('');
    const cents = (s: string) => Math.round(parseFloat(s || '0') * 100);
    const body = {
      name: f.name, slug: f.slug || undefined, description: f.description, basePriceCents: cents(f.price), categoryId: Number(f.categoryId),
      images, isFeatured: f.isFeatured, isActive: f.isActive,
      defaultWeightOz: Number(f.wt) || 0, defaultLengthIn: Number(f.l) || 0, defaultWidthIn: Number(f.w) || 0, defaultHeightIn: Number(f.h) || 0,
      variants: variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size, color: v.color, priceOverrideCents: v.price === '' ? null : cents(v.price), stockQuantity: Math.max(0, parseInt(v.stock || '0', 10) || 0) })),
    };
    try {
      if (isNew) await api('/admin/products', { body });
      else await api(`/admin/products/${id}`, { method: 'PUT', body });
      nav('/admin/products');
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  return (
    <div className="max-w-4xl">
      <Link to="/admin/products" className="text-sm text-gray-500 hover:text-orange">← Products</Link>
      <h1 className="mb-6 mt-2 text-3xl">{isNew ? 'New product' : 'Edit product'}</h1>

      <div className="space-y-6">
        <section className="card grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Name *</label><input className="input" value={f.name} onChange={set('name')} /></div>
          <div><label className="label">Category *</label>
            <select className="input" value={f.categoryId} onChange={set('categoryId')}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label">Base price (USD) *</label><input className="input" type="number" min="0" step="0.01" value={f.price} onChange={set('price')} /></div>
          <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input" rows={4} value={f.description} onChange={set('description')} /></div>
          <div><label className="label">URL slug (auto)</label><input className="input" value={f.slug} onChange={set('slug')} placeholder="generated from name" /></div>
          <div className="flex items-end gap-6 pb-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.isActive} onChange={set('isActive')} /> Active (visible)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.isFeatured} onChange={set('isFeatured')} /> Featured</label>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-3 text-lg">Photos</h2>
          <div className="flex flex-wrap gap-3">
            {images.map((u, i) => (
              <div key={u + i} className="relative h-24 w-24 overflow-hidden rounded border">
                <img src={assetUrl(u)} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 text-xs text-white">
                  <button className="px-1.5 py-0.5" disabled={i === 0} onClick={() => setImages((a) => { const b = [...a]; [b[i - 1], b[i]] = [b[i], b[i - 1]]; return b; })} title="Move earlier">←</button>
                  <button className="px-1.5 py-0.5 text-red-300" onClick={() => setImages((a) => a.filter((_, n) => n !== i))} title="Remove">✕</button>
                </div>
                {i === 0 && <span className="absolute left-0 top-0 bg-orange px-1 text-[10px] font-bold text-white">MAIN</span>}
              </div>
            ))}
            <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded border-2 border-dashed text-center text-xs text-gray-500 hover:border-orange hover:text-orange">
              {uploading ? 'Uploading…' : '+ Add photos'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
            </label>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-1 text-lg">Shipping defaults</h2>
          <p className="mb-3 text-xs text-gray-500">Pre-fills the shipping label form for orders containing this product.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><label className="label">Weight (oz)</label><input className="input" type="number" min="0" step="0.1" value={f.wt} onChange={set('wt')} /></div>
            <div><label className="label">Length (in)</label><input className="input" type="number" min="0" step="0.1" value={f.l} onChange={set('l')} /></div>
            <div><label className="label">Width (in)</label><input className="input" type="number" min="0" step="0.1" value={f.w} onChange={set('w')} /></div>
            <div><label className="label">Height (in)</label><input className="input" type="number" min="0" step="0.1" value={f.h} onChange={set('h')} /></div>
          </div>
        </section>

        <section className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg">Variants &amp; stock</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500">Quick add:</span>
              {Object.keys(SIZE_PRESETS).map((k) => <button key={k} className="btn-outline btn-sm" onClick={() => addPreset(k)}>{k} sizes</button>)}
              <button className="btn-outline btn-sm" onClick={() => setVariants((r) => [...r, { sku: '', size: '', color: r[r.length - 1]?.color || '', price: '', stock: '0' }])}>+ Row</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-gray-500"><tr><th className="pb-2">Size</th><th>Color</th><th>SKU (auto)</th><th>Price override</th><th>Stock</th><th /></tr></thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={i}>
                    <td className="pr-2 pb-2"><input className="input" value={v.size} onChange={(e) => setV(i, 'size', e.target.value)} /></td>
                    <td className="pr-2 pb-2"><input className="input" value={v.color} onChange={(e) => setV(i, 'color', e.target.value)} /></td>
                    <td className="pr-2 pb-2"><input className="input" value={v.sku} onChange={(e) => setV(i, 'sku', e.target.value)} placeholder="auto" /></td>
                    <td className="pr-2 pb-2"><input className="input" type="number" min="0" step="0.01" value={v.price} onChange={(e) => setV(i, 'price', e.target.value)} placeholder="base" /></td>
                    <td className="pr-2 pb-2"><input className="input" type="number" min="0" value={v.stock} onChange={(e) => setV(i, 'stock', e.target.value)} /></td>
                    <td className="pb-2"><button className="px-2 text-red-600" onClick={() => setVariants((r) => r.filter((_, n) => n !== i))} aria-label="Remove variant">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {variants.length === 0 && <p className="py-4 text-sm text-gray-500">Add at least one variant so customers can buy this product.</p>}
          </div>
        </section>

        {err && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <div className="flex gap-3">
          <button className="btn-orange" disabled={saving || !f.name} onClick={save}>{saving ? 'Saving…' : 'Save product'}</button>
          <Link to="/admin/products" className="btn-outline">Cancel</Link>
        </div>
      </div>
    </div>
  );
}
