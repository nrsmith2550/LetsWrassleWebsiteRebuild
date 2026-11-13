import { useEffect, useState } from 'react';
import { api, assetUrl, Video } from '../../lib/api';

const blank = { title: '', description: '', videoUrl: '', thumbnailUrl: '', featuredName: '', isPublished: true };

export default function AdminVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [form, setForm] = useState<any>(null); // null = closed
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api<{ videos: Video[] }>('/admin/videos').then((r) => setVideos(r.videos)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const run = async (fn: () => Promise<any>) => { setErr(''); try { await fn(); await load(); } catch (e: any) { setErr(e.message); } };

  const move = (i: number, d: number) => {
    const next = [...videos];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setVideos(next);
    run(() => api('/admin/videos/reorder', { method: 'PUT', body: { ids: next.map((v) => v.id) } }));
  };

  async function upload(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api<{ url: string }>('/admin/upload', { form: fd });
      setForm((f: any) => ({ ...f, thumbnailUrl: r.url }));
    } catch (er: any) { setErr(er.message); } finally { setBusy(false); e.target.value = ''; }
  }

  async function save() {
    setBusy(true); setErr('');
    try {
      const { id, sortOrder, ...body } = form;
      if (id) await api(`/admin/videos/${id}`, { method: 'PUT', body });
      else await api('/admin/videos', { body });
      setForm(null);
      await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl">Interview videos</h1>
        <button className="btn-orange" onClick={() => setForm({ ...blank })}>+ Add video</button>
      </div>
      {err && <p className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      {form && (
        <div className="card mb-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Title *</label><input className="input" value={form.title} onChange={set('title')} /></div>
          <div className="sm:col-span-2"><label className="label">Video URL * (YouTube, Vimeo or direct .mp4)</label><input className="input" value={form.videoUrl} onChange={set('videoUrl')} placeholder="https://www.youtube.com/watch?v=…" /></div>
          <div><label className="label">Featured athlete / guest</label><input className="input" value={form.featuredName} onChange={set('featuredName')} /></div>
          <div>
            <label className="label">Thumbnail (optional — YouTube auto-detects)</label>
            <div className="flex items-center gap-2">
              <input className="input" value={form.thumbnailUrl} onChange={set('thumbnailUrl')} placeholder="https://… or upload →" />
              <label className="btn-outline btn-sm cursor-pointer">Upload<input type="file" accept="image/*" hidden onChange={upload} /></label>
            </div>
          </div>
          <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={set('description')} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished} onChange={set('isPublished')} /> Published</label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button className="btn-outline" onClick={() => setForm(null)}>Cancel</button>
            <button className="btn-orange" disabled={busy || !form.title || !form.videoUrl} onClick={save}>{busy ? 'Saving…' : 'Save video'}</button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {videos.map((v, i) => (
          <li key={v.id} className="card flex flex-wrap items-center gap-3 !p-3">
            <div className="flex flex-col">
              <button disabled={i === 0} onClick={() => move(i, -1)} className="px-1 text-xs disabled:opacity-30" aria-label="Move up">▲</button>
              <button disabled={i === videos.length - 1} onClick={() => move(i, 1)} className="px-1 text-xs disabled:opacity-30" aria-label="Move down">▼</button>
            </div>
            {v.thumbnailUrl && <img src={assetUrl(v.thumbnailUrl)} alt="" className="h-12 w-20 rounded object-cover" />}
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{v.title}</div>
              <div className="truncate text-xs text-gray-500">{v.featuredName && `${v.featuredName} · `}{v.videoUrl}</div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.isPublished} onChange={(e) => run(() => api(`/admin/videos/${v.id}`, { method: 'PUT', body: { isPublished: e.target.checked } }))} /> Published</label>
            <button className="btn-outline btn-sm" onClick={() => setForm({ ...v })}>Edit</button>
            <button className="btn btn-sm text-red-600 hover:bg-red-50" onClick={() => confirm(`Delete "${v.title}"?`) && run(() => api(`/admin/videos/${v.id}`, { method: 'DELETE' }))}>Delete</button>
          </li>
        ))}
        {videos.length === 0 && <p className="py-10 text-center text-gray-500">No videos yet.</p>}
      </ul>
    </div>
  );
}
