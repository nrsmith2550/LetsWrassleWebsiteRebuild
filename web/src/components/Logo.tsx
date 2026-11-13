/**
 * The official "Let's WRASSLE" wordmark (black on white artwork). Sized by the font size of its container.
 * Blend modes drop the white background: multiply on light sections, inverted + screen on dark ones.
 */
export function Wordmark({ className = '', invert = false }: { className?: string; invert?: boolean }) {
  return (
    <img
      src="/uploads/site/wordmark.png"
      alt="Let's Wrassle"
      width={900}
      height={176}
      className={`inline-block h-[1.3em] w-auto max-w-full object-contain ${invert ? 'mix-blend-screen invert' : 'mix-blend-multiply'} ${className}`}
    />
  );
}

/** The round logo from the current site, used in the header and footer. */
export default function Logo({ size = 64 }: { size?: number }) {
  return <img src="/uploads/site/logo.webp" alt="Let's Wrassle" width={size} height={size} className="block shrink-0 rounded-full bg-white" style={{ width: size, height: size }} />;
}
