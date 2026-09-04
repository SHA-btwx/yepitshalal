import type { RestaurantVideo } from '@/lib/types';

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return match ? match[1] : null;
}

const PROVIDER_LABEL: Record<RestaurantVideo['provider'], string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

const PROVIDER_ICON: Record<RestaurantVideo['provider'], string> = {
  youtube: '▶️',
  instagram: '📸',
  tiktok: '🎵',
};

export function VideoEmbed({ video }: { video: RestaurantVideo }) {
  if (video.provider === 'youtube') {
    const id = extractYouTubeId(video.embed_url);
    if (id) {
      return (
        <div className="overflow-hidden rounded-2xl">
          <div className="aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${id}`}
              title={video.caption ?? 'Restaurant video'}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {video.caption && <p className="mt-1.5 text-xs text-ink/50">{video.caption}</p>}
        </div>
      );
    }
  }

  return (
    <a
      href={video.embed_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 transition hover:border-ink/20"
    >
      <span className="text-2xl">{PROVIDER_ICON[video.provider]}</span>
      <div>
        <p className="text-sm font-semibold text-ink">Watch on {PROVIDER_LABEL[video.provider]}</p>
        {video.caption && <p className="text-xs text-ink/50">{video.caption}</p>}
      </div>
    </a>
  );
}
