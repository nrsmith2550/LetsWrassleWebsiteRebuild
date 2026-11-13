import { Wordmark } from './Logo';

/** Shows the product photo, or a branded placeholder when none is uploaded yet. */
export default function ProductImage({ src, alt, label, fit = 'cover' }: { src?: string; alt: string; label?: string; fit?: 'cover' | 'contain' }) {
  if (src) return <img src={src} alt={alt} loading="lazy" className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`} />;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-fog p-2 text-center">
      <Wordmark className="text-[clamp(10px,2.2vw,22px)] opacity-70" />
      {label && <span className="mt-2 hidden text-[10px] uppercase tracking-widest text-gray-500 sm:block">{label}</span>}
    </div>
  );
}
