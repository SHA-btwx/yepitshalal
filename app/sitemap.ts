import type { MetadataRoute } from 'next';
import { getAreasWithPages, getListedRestaurantSlugs } from '@/lib/areas';
import { getCuisines } from '@/lib/cuisines';
import { SITE_URL as siteUrl } from '@/lib/site';

export const revalidate = 3600;

// Only pages worth landing on: listed places and areas with enough of them.
// Unlisted places, search results and Discover (still a holding page) are left out.

/**
 * When the fixed pages last actually changed. Bump it when one of them does.
 *
 * A crawler has no other way to know the homepage was rewritten, and a sitemap
 * that claims a change every hour (build time would) gets its dates ignored,
 * so this is a date somebody sets on purpose.
 */
const CONTENT_UPDATED = new Date('2026-09-19');
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [areas, restaurants, cuisines] = await Promise.all([
    getAreasWithPages(),
    getListedRestaurantSlugs(),
    getCuisines(),
  ]);

  return [
    { url: `${siteUrl}/`, lastModified: CONTENT_UPDATED, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/halal-restaurants`, lastModified: CONTENT_UPDATED, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/halal-restaurants/cuisine`, lastModified: CONTENT_UPDATED, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/prayer-spaces`, lastModified: CONTENT_UPDATED, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/how-we-check`, lastModified: CONTENT_UPDATED, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/image-credits`, lastModified: CONTENT_UPDATED, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${siteUrl}/submit-restaurant`, lastModified: CONTENT_UPDATED, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${siteUrl}/yep-plus`, lastModified: CONTENT_UPDATED, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${siteUrl}/partners`, changeFrequency: 'monthly', priority: 0.3 },
    ...areas.map((a) => ({
      url: `${siteUrl}/halal-restaurants/${a.slug}`,
      ...(a.last_checked_at ? { lastModified: new Date(a.last_checked_at) } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...cuisines.map((c) => ({
      url: `${siteUrl}/halal-restaurants/cuisine/${c.slug}`,
      lastModified: CONTENT_UPDATED,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...restaurants.map((r) => ({
      url: `${siteUrl}/restaurant/${r.slug}`,
      ...(r.updated ? { lastModified: new Date(r.updated) } : {}),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
