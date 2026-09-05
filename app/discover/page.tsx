import { getDiscoverFeed } from '@/lib/reels';
import { DiscoverFeed } from '@/components/DiscoverFeed';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Discover',
  description: 'Scroll through halal restaurants across London, one at a time.',
};

export default async function DiscoverPage() {
  const items = await getDiscoverFeed();
  return <DiscoverFeed items={items} />;
}
