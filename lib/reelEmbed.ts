import type { VideoProvider } from './reels';

/**
 * Turns a public reel URL into the platform's own iframe embed URL.
 *
 * Every provider here publishes a plain-iframe embed endpoint, so none of this
 * needs their JS SDK or an API token, and the creator deleting the post breaks
 * the embed exactly as it should. We only ever embed URLs a restaurant has
 * handed us for their own content — nothing is discovered by crawling.
 */
export function toEmbedUrl(provider: VideoProvider, url: string, autoplay = false): string | null {
  try {
    const u = new URL(url);

    if (provider === 'youtube') {
      const id =
        u.hostname.includes('youtu.be')
          ? u.pathname.slice(1)
          : u.searchParams.get('v') ?? u.pathname.split('/').filter(Boolean).pop();
      if (!id) return null;
      const params = new URLSearchParams({ rel: '0', playsinline: '1' });
      if (autoplay) {
        // Autoplay is only permitted while muted; browsers block it otherwise.
        params.set('autoplay', '1');
        params.set('mute', '1');
      }
      return `https://www.youtube.com/embed/${id}?${params}`;
    }

    if (provider === 'instagram') {
      // /reel/{code}/ and /p/{code}/ both embed through the same endpoint.
      const parts = u.pathname.split('/').filter(Boolean);
      const i = parts.findIndex((p) => p === 'reel' || p === 'reels' || p === 'p');
      const code = i >= 0 ? parts[i + 1] : null;
      if (!code) return null;
      return `https://www.instagram.com/p/${code}/embed`;
    }

    if (provider === 'tiktok') {
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (!id || !/^\d+$/.test(id)) return null;
      return `https://www.tiktok.com/embed/v2/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

/** Instagram and TikTok will not autoplay in an iframe; YouTube will, muted. */
export function canAutoplay(provider: VideoProvider | null, kind: 'upload' | 'embed' | null): boolean {
  if (kind === 'upload') return true;
  return provider === 'youtube';
}
