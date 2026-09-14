import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yepitshalal.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private or per-visitor pages. Search results are noindexed as well;
        // the area pages are the indexable version of "halal near X".
        disallow: ['/admin', '/api/', '/account', '/manage/', '/sign-in', '/search', '/restaurant/*/verify'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
