import { useEffect, useState } from 'react';
import VideoEmbed, { youtubeThumb } from '../components/VideoEmbed';
import type { CatVideo } from '../lib/api';
import { useCatalog } from '../lib/catalog';

export default function Interviews() {
  const { catalog } = useCatalog();
  const videos = catalog?.videos.filter((v) => v.published) ?? [];
  const [active, setActive] = useState<CatVideo | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActive(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange">Media</p>
      <h1 className="mt-1 text-4xl">Interviews</h1>
      <p className="mt-2 max-w-xl text-gray-600">Conversations with wrestlers, coaches and the people who live the sport.</p>

      {!catalog ? <p className="py-16 text-center text-gray-500">Loading…</p> : videos.length === 0 ? <p className="py-16 text-center text-gray-500">New interviews coming soon.</p> : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => {
            const thumb = v.thumbnail || youtubeThumb(v.url);
            return (
              <button key={v.id} onClick={() => setActive(v)} className="group text-left">
                <div className="relative aspect-video overflow-hidden rounded bg-ink">
                  {thumb && <img src={thumb} alt={v.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />}
                  <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange text-2xl text-white shadow-lg">▶</span></span>
                </div>
                {v.featuredName && <span className="badge mt-3 bg-orange/15 text-orange-dark">{v.featuredName}</span>}
                <h3 className="mt-2 font-sans text-base font-bold normal-case tracking-normal group-hover:text-orange">{v.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{v.description}</p>
              </button>
            );
          })}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setActive(null)}>
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video overflow-hidden rounded bg-black"><VideoEmbed url={active.url} title={active.title} /></div>
            <div className="mt-3 flex items-start justify-between gap-4 text-white">
              <div>
                <h3 className="text-xl">{active.title}</h3>
                {active.featuredName && <div className="text-sm text-orange">{active.featuredName}</div>}
                <p className="mt-1 text-sm text-gray-300">{active.description}</p>
              </div>
              <button onClick={() => setActive(null)} className="text-3xl leading-none" aria-label="Close">×</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
