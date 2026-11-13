import { useEffect, useState } from 'react';
import { api, Category } from '../../lib/api';

export default function AdminCategories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [err, setErr] = useState('');

  const load = () => api<{ categories: Category[] }>('/admin/categories').then((r) => setCats(r.categories)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const run = async (fn: () => Promise<any>) => { setErr(''); try { await fn(); await load(); } catch (e: any) { setErr(e.message); } };

  const move = (i: number, d: number) => {
    const next = [...cats];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setCats(next);
    run(() => api('/admin/categories/reorder', { method: 'PUT', body: { ids: next.map((c) => c.id) } }));
  };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-3xl">Categories</h1>
      {err && <p className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <div className="card mb-6 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
        <input className="input" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button className="btn-orange" disabled={!name.trim()} onClick={() => run(async () => { await api('/admin/categories', { body: { name, description: desc } }); setName(''); setDesc(''); })}>Add</button>
      </div>

      <ul className="space-y-2">
        {cats.map((c, i) => (
          <li key={c.id} className="card flex flex-wrap items-center gap-3 !p-3">
            <div className="flex flex-col">
              <button disabled={i === 0} onClick={() => move(i, -1)} className="px-1 text-xs disabled:opacity-30" aria-label="Move up">▲</button>
              <button disabled={i === cats.length - 1} onClick={() => move(i, 1)} className="px-1 text-xs disabled:opacity-30" aria-label="Move down">▼</button>
            </div>
            {editing?.id === c.id ? (
              <div className="flex flex-1 flex-wrap gap-2">
                <input className="input flex-1" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <input className="input flex-[2]" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                <button className="btn-primary btn-sm" onClick={() => run(async () => { await api(`/admin/categories/${c.id}`, { method: 'PUT', body: { name: editing.name, description: editing.description } }); setEditing(null); })}>Save</button>
                <button className="btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <div className="font-semibold">{c.name} <span className="text-xs font-normal text-gray-500">/{c.slug} · {c._count?.products ?? 0} products</span></div>
                  {c.description && <div className="text-xs text-gray-500">{c.description}</div>}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={c.isActive} onChange={(e) => run(() => api(`/admin/categories/${c.id}`, { method: 'PUT', body: { isActive: e.target.checked } }))} /> Active
                </label>
                <button className="btn-outline btn-sm" onClick={() => setEditing(c)}>Edit</button>
                <button className="btn btn-sm text-red-600 hover:bg-red-50" onClick={() => confirm(`Delete "${c.name}"?`) && run(() => api(`/admin/categories/${c.id}`, { method: 'DELETE' }))}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
