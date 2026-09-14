const PRODUCTION_URL = 'https://yepitshalal.com';

/**
 * The address the site is known by, for canonical links, the sitemap, structured
 * data, emails and payment return links.
 *
 * In production a deployment address (*.vercel.app) in NEXT_PUBLIC_SITE_URL is
 * ignored: search engines would take it for the real site and index that
 * instead of yepitshalal.com. Elsewhere (local, previews) the setting is used
 * as given.
 */
function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  if (!configured) return PRODUCTION_URL;
  let host: string;
  try {
    host = new URL(configured).hostname;
  } catch {
    return PRODUCTION_URL;
  }
  if (process.env.VERCEL_ENV === 'production' && /\.vercel\.app$/i.test(host)) return PRODUCTION_URL;
  return configured;
}

export const SITE_URL = resolveSiteUrl();
