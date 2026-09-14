import type { MetadataRoute } from 'next';
import { getAreasWithPages, getListedRestaurantSlugs } from '@/lib/areas';
import { SITE_URL as siteUrl } from '@/lib/site';

export const revalidate = 3600;

// Only pages worth landing on: listed places and areas with enough of them.
// Unlisted places, search results and Discover (still a holding page) are left out.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [areas, restaurants] = await Promise.all([getAreasWithPages(), getListedRestaurantSlugs()]);

  return [
    { url: `${siteUrl}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/halal-restaurants`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/how-we-check`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/submit-restaurant`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${siteUrl}/yep-plus`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${siteUrl}/partners`, changeFrequency: 'monthly', priority: 0.3 },
    ...areas.map((a) => ({
      url: `${siteUrl}/halal-restaurants/${a.slug}`,
      ...(a.last_checked_at ? { lastModified: new Date(a.last_checked_at) } : {}),
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
