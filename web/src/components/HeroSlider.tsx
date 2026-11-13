import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from './Icons';
import ProductImage from './ProductImage';
import { Script } from './Title';

export interface Slide {
  image?: string;
  /** Short handwritten line above the title. */
  accent?: string;
  tagline?: string;
  title: string;
  text?: string;
  cta: string;
  to: string;
}

/** Home page slider, laid out like the current site: photo on the left, message and button on the right. */
export default function HeroSlider({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  const go = (d: number) => setI((x) => (x + d + n) % n);

  useEffect(() => {
    if (i >= n) setI(0);
  }, [n, i]);

  useEffect(() => {
    if (paused || n < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => setI((x) => (x + 1) % n), 6500);
    return () => clearTimeout(t);
  }, [i, paused, n]);

  return (
    <section
      className="relative bg-black text-white"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="grid grid-cols-1 overflow-hidden">
        {slides.map((s, k) => {
          const on = k === i;
          return (
            <div key={k} aria-hidden={!on} className={`col-start-1 row-start-1 grid min-w-0 grid-cols-1 transition-opacity duration-700 md:grid-cols-2 ${on ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
              <div className="aspect-[4/3] bg-white md:aspect-auto md:h-[min(76vh,680px)]"><ProductImage src={s.image} alt="" /></div>
              <div className="flex min-w-0 items-center px-6 pb-24 pt-10 md:px-16 md:py-16">
                <div className="max-w-xl">
                  {s.accent && <p className="mb-1 text-4xl md:text-5xl"><Script>{s.accent}</Script></p>}
                                    {k === 0 ? <h1 className="text-5xl md:text-7xl">{s.title}</h1> : <h2 className="text-4xl md:text-5xl">{s.title}</h2>}
                  {s.tagline && <p className="mt-5 text-lg font-semibold text-white md:text-xl">{s.tagline}</p>}
                  {s.text && <p className="mt-4 line-clamp-3 text-base text-white/70 md:text-lg">{s.text}</p>}
                  <Link to={s.to} tabIndex={on ? 0 : -1} className="btn-light mt-8">{s.cta}</Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {n > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="Previous slide" className="absolute bottom-5 left-3 rounded-full p-3 text-white transition hover:bg-white/15 md:bottom-6 md:left-auto md:right-20"><ChevronLeft /></button>
          <button onClick={() => go(1)} aria-label="Next slide" className="absolute bottom-5 right-3 rounded-full p-3 text-white transition hover:bg-white/15 md:bottom-6 md:right-6"><ChevronRight /></button>
          <div className="absolute inset-x-0 bottom-8 flex justify-center gap-1.5 md:inset-x-auto md:left-[calc(50%+4rem)]">
            {slides.map((s, k) => (
              <button key={k} onClick={() => setI(k)} aria-label={`Show slide ${k + 1}: ${s.title}`} aria-current={k === i} className="group px-0.5 py-2">
                <span className={`block h-0.5 w-8 transition ${k === i ? 'bg-white' : 'bg-white/30 group-hover:bg-white/60'}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
