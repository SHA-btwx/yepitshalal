import { getDiscoverFeed } from '@/lib/discover';
import { DiscoverFeed } from '@/components/DiscoverFeed';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Discover — YepItsHalal',
  description: 'Scroll through halal restaurants across London, one at a time.',
};

export default async function DiscoverPage() {
  const cards = await getDiscoverFeed();
  return <DiscoverFeed cards={cards} />;
}
