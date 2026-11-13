import { useEffect, useState } from 'react';
import VideoEmbed, { youtubeThumb } from '../components/VideoEmbed';
import type { CatVideo } from '../lib/api';
import { Script } from '../components/Title';
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
    <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-16">
      <div>
        <h1 className="text-5xl md:text-7xl"><Script>Let's Wrassle</Script>Interviews</h1>
        <p className="mt-4 max-w-2xl text-lg text-white/70">Check out all of our interviews with high level wrestlers, giving their 2 cents on mindset, the sport, and everything else!</p>
      </div>

      {!catalog ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>{Array.from({ length: 3 }, (_, k) => <div key={k}><div className="skeleton aspect-video" /><div className="skeleton mt-3 h-4 w-2/3" /></div>)}</div>
      ) : videos.length === 0 ? <p className="py-16 text-white/60">New interviews coming soon.</p> : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => {
            const thumb = v.thumbnail || youtubeThumb(v.url);
            return (
              <button key={v.id} onClick={() => setActive(v)} className="group text-left">
                <div className="relative aspect-video overflow-hidden rounded-sm bg-coal">
                  {thumb && <img src={thumb} alt={v.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />}
                  <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 pl-1 text-xl text-ink shadow-lg transition group-hover:scale-110">▶</span></span>
                </div>
                {v.featuredName && <span className="badge mt-4 bg-white text-black">{v.featuredName}</span>}
                <h3 className="mt-2 font-sans text-lg font-bold normal-case leading-snug tracking-normal group-hover:underline">{v.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-white/60">{v.description}</p>
              </button>
            );
          })}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setActive(null)}>
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video overflow-hidden rounded-sm bg-black"><VideoEmbed url={active.url} title={active.title} /></div>
            <div className="mt-3 flex items-start justify-between gap-4 text-white">
              <div>
                <h3 className="text-xl">{active.title}</h3>
                {active.featuredName && <div className="text-sm text-gray-300">{active.featuredName}</div>}
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
