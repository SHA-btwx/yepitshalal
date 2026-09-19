// The site answers on www and permanently redirects the bare domain to it, so
// www is the address it is actually known by. Every canonical link, sitemap
// entry and structured-data URL has to say the same thing, or a crawler is told
// the page's real address is one that redirects somewhere else.
const PRODUCTION_URL = 'https://www.yepitshalal.com';

/**
 * The address the site is known by, for canonical links, the sitemap, structured
 * data, emails and payment return links.
 *
 * In production a deployment address (*.vercel.app) in NEXT_PUBLIC_SITE_URL is
 * ignored: search engines would take it for the real site and index that
 * instead of yepitshalal.com. The bare domain is corrected to www for the
 * reason above. Elsewhere (local, previews) the setting is used as given.
 */
function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  if (!configured) return PRODUCTION_URL;
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    return PRODUCTION_URL;
  }
  if (process.env.VERCEL_ENV === 'production') {
    if (/\.vercel\.app$/i.test(url.hostname)) return PRODUCTION_URL;
    if (url.hostname === 'yepitshalal.com') return PRODUCTION_URL;
  }
  return configured;
}

export const SITE_URL = resolveSiteUrl();
