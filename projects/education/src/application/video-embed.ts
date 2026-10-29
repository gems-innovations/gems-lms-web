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


const SEG = /^[\w.-]+$/;

/**
 * Embeddable address of a StackBlitz, CodePen or CodeSandbox project (live code editors), or null for anything else.
 * Like the video one, it is rebuilt from validated path segments, never from the typed text.
 */
export function toEditorEmbedUrl(raw: string): string | null {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.replace(/^www\./, '');
  const parts = url.pathname.split('/').filter(Boolean);
  if (!parts.every(p => SEG.test(p))) return null;

  if (host === 'stackblitz.com' && (parts[0] === 'edit' || parts[0] === 'github') && parts.length >= 2) {
    return `https://stackblitz.com/${parts.join('/')}?embed=1&view=editor`;
  }
  if (host === 'codepen.io' && parts.length === 3 && (parts[1] === 'pen' || parts[1] === 'embed')) {
    return `https://codepen.io/${parts[0]}/embed/${parts[2]}?default-tab=js,result`;
  }
  if (host === 'codesandbox.io') {
    const id = parts[0] === 's' || parts[0] === 'embed' ? parts[1] : parts[0] === 'p' && parts[1] === 'sandbox' ? parts[2] : null;
    if (id && parts.length <= 3) return `https://codesandbox.io/embed/${id}`;
  }
  return null;
}
