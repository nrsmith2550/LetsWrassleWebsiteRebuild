import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductImage from '../../components/ProductImage';
import { api, money, Product } from '../../lib/api';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [err, setErr] = useState('');
  const load = () => api<{ products: Product[] }>('/admin/products').then((r) => setProducts(r.products)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.name}"? Products with past orders are archived (hidden) instead.`)) return;
    const r = await api<{ archived: boolean }>(`/admin/products/${p.id}`, { method: 'DELETE' });
    if (r.archived) alert('This product has past orders, so it was hidden instead of deleted.');
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl">Products</h1>
        <Link to="/admin/products/new" className="btn-orange">+ New product</Link>
      </div>
      {err && <p className="text-red-600">{err}</p>}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-gray-100 text-xs uppercase tracking-wider text-gray-600"><tr>
            {['', 'Product', 'Category', 'Price', 'Stock', 'Status', ''].map((h, i) => <th key={i} className="px-3 py-3">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y">
            {products?.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="w-14 px-3 py-2"><div className="h-10 w-10 overflow-hidden rounded bg-bone"><ProductImage src={p.images[0]} alt="" /></div></td>
                <td className="px-3 py-2 font-semibold"><Link className="hover:text-orange" to={`/admin/products/${p.id}`}>{p.name}</Link></td>
                <td className="px-3 py-2">{p.category?.name}</td>
                <td className="px-3 py-2">{money(p.basePriceCents)}</td>
                <td className="px-3 py-2">{p.totalStock <= 0 ? <span className="badge bg-red-100 text-red-800">Out</span> : p.totalStock}</td>
                <td className="px-3 py-2 space-x-1">
                  <span className={`badge ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>{p.isActive ? 'Active' : 'Hidden'}</span>
                  {p.isFeatured && <span className="badge bg-orange/20 text-orange-dark">Featured</span>}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Link to={`/admin/products/${p.id}`} className="btn-outline btn-sm">Edit</Link>{' '}
                  <button onClick={() => remove(p)} className="btn btn-sm text-red-600 hover:bg-red-50">Delete</button>
                </td>
              </tr>
            ))}
            {products?.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-500">No products yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
