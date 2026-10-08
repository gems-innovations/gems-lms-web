const YOUTUBE_HOSTS = new Set(['youtube.com', 'm.youtube.com', 'youtube-nocookie.com']);
const ID = /^[\w-]+$/;

function youtubeId(url: URL, host: string): string | null {
  if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null;
  if (!YOUTUBE_HOSTS.has(host)) return null;
  if (url.pathname === '/watch') return url.searchParams.get('v');
  return /^\/(?:embed|v)\/([^/]+)/.exec(url.pathname)?.[1] ?? null;
}

function vimeoId(url: URL, host: string): string | null {
  if (host === 'vimeo.com') return /^\/(\d+)/.exec(url.pathname)?.[1] ?? null;
  if (host === 'player.vimeo.com') return /^\/video\/(\d+)/.exec(url.pathname)?.[1] ?? null;
  return null;
}

/**
 * Embeddable address of a YouTube or Vimeo video, or null when the address is anything else.
 * The result is built from the validated video id, never from the text the author typed, so it
 * is the only value that may be trusted as an iframe source.
 */
export function toVideoEmbedUrl(raw: string): string | null {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.replace(/^www\./, '');

  const youtube = youtubeId(url, host);
  if (youtube !== null) {
    return ID.test(youtube)
      ? `https://www.youtube.com/embed/${youtube}?rel=0&modestbranding=1&enablejsapi=1&cc_load_policy=1&cc_lang_pref=es&hl=es`
      : null;
  }
  const vimeo = vimeoId(url, host);
  return vimeo ? `https://player.vimeo.com/video/${vimeo}?title=0&byline=0&api=1&texttrack=es` : null;
}
