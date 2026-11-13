/** Renders YouTube / Vimeo embeds or direct video files. */
export function toEmbed(url: string): { kind: 'iframe' | 'video'; src: string } {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return { kind: 'iframe', src: `https://www.youtube.com/embed/${u.pathname.slice(1)}?autoplay=1` };
    if (host.endsWith('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) return { kind: 'iframe', src: `${url}${url.includes('?') ? '&' : '?'}autoplay=1` };
      const id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
      return { kind: 'iframe', src: `https://www.youtube.com/embed/${id}?autoplay=1` };
    }
    if (host.endsWith('vimeo.com')) {
      if (host === 'player.vimeo.com') return { kind: 'iframe', src: url };
      return { kind: 'iframe', src: `https://player.vimeo.com/video/${u.pathname.split('/').filter(Boolean).pop()}?autoplay=1` };
    }
  } catch {
    /* relative URL (uploaded file) */
  }
  return { kind: 'video', src: url };
}

export function youtubeThumb(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (host.endsWith('youtube.com')) id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop() || '';
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
  } catch {
    return '';
  }
}

export default function VideoEmbed({ url, title }: { url: string; title: string }) {
  const e = toEmbed(url);
  return e.kind === 'iframe' ? (
    <iframe src={e.src} title={title} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
  ) : (
    <video src={e.src} controls autoPlay className="h-full w-full bg-black" />
  );
}
