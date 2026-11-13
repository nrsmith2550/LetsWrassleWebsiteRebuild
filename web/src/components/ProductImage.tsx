import { assetUrl } from '../lib/api';

/** Shows the product photo, or a branded placeholder tee when none is uploaded yet. */
export default function ProductImage({ src, alt, label }: { src?: string; alt: string; label?: string }) {
  if (src) return <img src={assetUrl(src)} alt={alt} loading="lazy" className="h-full w-full object-cover" />;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-2 text-center">
      <span className="font-display text-2xl uppercase leading-none text-ink/80">
        Let's<br /><span className="text-orange">Wrassle</span>
      </span>
      {label && <span className="mt-2 hidden text-[10px] uppercase tracking-widest text-gray-500 sm:block">{label}</span>}
    </div>
  );
}
