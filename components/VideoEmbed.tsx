import { ArrowUpRightIcon } from './icons';
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

function PlayIcon() {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M8 5.5v13l11-6.5-11-6.5Z" />
      </svg>
    </span>
  );
}

export function VideoEmbed({ video }: { video: RestaurantVideo }) {
  if (video.provider === 'youtube') {
    const id = extractYouTubeId(video.embed_url);
    if (id) {
      return (
        <div>
          <div className="aspect-video overflow-hidden rounded-2xl bg-ink">
            <iframe
              src={`https://www.youtube.com/embed/${id}`}
              title={video.caption ?? 'Restaurant video'}
              className="h-full w-full"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {video.caption && <p className="mt-1.5 text-xs text-muted">{video.caption}</p>}
        </div>
      );
    }
  }

  return (
    <a
      href={video.embed_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-ink/20 hover:shadow-sm"
    >
      <PlayIcon />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">
          Watch on {PROVIDER_LABEL[video.provider]}
        </span>
        {video.caption && <span className="block truncate text-xs text-muted">{video.caption}</span>}
      </span>
      <ArrowUpRightIcon className="h-4 w-4 shrink-0 text-subtle" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
