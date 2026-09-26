/* eslint-disable @next/next/no-img-element */
import clsx from 'clsx';
import { HalalBadge } from '../HalalBadge';
import { LogoMark } from '../Logo';
import { SceneMedia, type SceneArt } from '../media/SceneMedia';
import { Free } from '../Free';
import { ChatIcon, InstagramIcon } from '../icons';
import { FounderAvatar } from './FounderAvatar';
import { TrackedLink } from './LiveCount';
import { FOUNDER } from '@/lib/founders';

// The pictures beside each Founder benefit. Rules they follow:
//
//  - The directory is a real screenshot of the live site, captured on
//    2026-09-25 from yepitshalal.com/search near Green Street, and dated where
//    it is shown. Every label and count in it is what the site said that day.
//  - Discover is not open yet, so its picture is marked as a preview, the food
//    in it is the site's own generated kitchen scene (marked "Example", the way
//    the site marks every picture that is not a restaurant's own), and it names
//    no restaurant, shows no halal label and counts nothing.
//  - Nothing here shows an audience size, a follower count or a result.
//
// All served as static files, never through the image optimiser.

const deviceFrame =
  'relative overflow-hidden rounded-[30px] bg-ink p-[7px] shadow-[0_2px_4px_rgba(15,37,43,0.08),0_30px_60px_-30px_rgba(4,24,30,0.55)] ring-1 ring-black/10';

function sources(still: string, widths: number[]) {
  return (ext: string) => widths.map((w) => `${still}-${w}.${ext} ${w}w`).join(', ');
}

// ── 1. The live directory ──────────────────────────────────────────────────

export function DirectoryVisual() {
  const set = sources('/founders/directory-green-street', [640, 960]);
  return (
    <figure className="mx-auto w-full max-w-[340px] lg:max-w-[330px]">
      <div className={deviceFrame}>
        <div className="overflow-hidden rounded-[24px] bg-sand-soft">
          <picture>
            <source type="image/avif" srcSet={set('avif')} sizes="340px" />
            <source type="image/webp" srcSet={set('webp')} sizes="340px" />
            <img
              src="/founders/directory-green-street-640.jpg"
              srcSet={set('jpg')}
              sizes="340px"
              width={390}
              height={740}
              loading="lazy"
              decoding="async"
              alt="YepItsHalal on a phone: halal food near Green Street within 1 mile, 209 places, 35 with halal evidence. The first result, Franzos Green Street, is labelled Fully Halal because the restaurant says all its meat is halal."
              className="block aspect-[390/452] w-full object-cover object-top [mask-image:linear-gradient(to_bottom,#000_88%,transparent)] lg:aspect-[390/740] lg:[mask-image:linear-gradient(to_bottom,#000_92%,transparent)]"
            />
          </picture>
        </div>
      </div>
      <figcaption className="mt-4">
        <span className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <HalalBadge classification="fully_halal" size="sm" />
          <HalalBadge classification="halal_options" size="sm" />
          <HalalBadge classification="unverified" size="sm" />
          <HalalBadge classification="unknown" size="sm" />
        </span>
        <span className="mt-2.5 block text-center text-xs text-subtle">
          The live directory near Green Street, 25 September 2026
        </span>
      </figcaption>
    </figure>
  );
}

// ── 2. Reels on Discover ───────────────────────────────────────────────────

// The site's own kitchen scene, in its 4:3 cut, which crops to a phone's
// upright frame better than the wide one. The loop plays only on a large
// screen: a phone at a festival gets the still, about 30KB.
const KITCHEN_REEL: SceneArt = {
  still: '/media/kitchen-pass',
  widths: [640, 1120],
  alt: 'A plate of grilled lamb chops and saffron rice set down on a kitchen pass',
  video: '/media/kitchen-pass.mp4',
};

export function ReelVisual() {
  return (
    <figure className="mx-auto flex w-full max-w-[360px] items-center gap-5 sm:max-w-[420px] sm:gap-8">
      <div className={clsx(deviceFrame, 'aspect-[9/16] w-[46%] shrink-0 p-[6px] sm:w-[210px]')}>
        <div className="relative h-full w-full overflow-hidden rounded-[24px] bg-ink">
          <SceneMedia
            art={KITCHEN_REEL}
            className="absolute inset-0"
            position="46% 60%"
            sizes="(min-width: 1024px) 520px, 440px"
            videoMinWidth={1024}
            control="bottom-left"
          />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/30" />
          <span className="absolute left-2.5 top-2.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            Preview
          </span>
          <span className="absolute right-2.5 top-2.5 text-[10px] font-medium text-white/80">Example</span>
          <span aria-hidden="true" className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg">
            <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5-11-6.5Z" />
            </svg>
          </span>
          <span className="absolute inset-x-3 bottom-3">
            <span className="block text-[13px] font-semibold leading-tight text-white">Your restaurant</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-white/80">Your best dish, in 15 seconds</span>
          </span>
        </div>
      </div>

      <figcaption className="min-w-0">
        <span className="block font-display text-[5.5rem] font-semibold leading-[0.8] tracking-[-0.04em] text-forest sm:text-[7rem]">
          3
        </span>
        <span className="mt-2 block font-display text-xl font-semibold leading-tight text-ink sm:text-2xl">reel slots</span>
        <span className="mt-1.5 block font-display text-xl font-semibold leading-tight sm:text-2xl">
          <Free>Free.</Free> <Free>Forever.</Free>
        </span>
        <span className="mt-5 block space-y-2 text-[13px] text-muted">
          <SlotRow label="Founder" filled={3} />
          <SlotRow label="Standard" filled={1} />
        </span>
      </figcaption>
    </figure>
  );
}

function SlotRow({ label, filled }: { label: string; filled: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="w-[4.6rem] shrink-0 font-medium">{label}</span>
      <span aria-hidden="true" className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={clsx(
              'h-[18px] w-[11px] rounded-[3px]',
              i < filled ? 'bg-forest' : 'bg-transparent ring-1 ring-inset ring-sand-line'
            )}
          />
        ))}
      </span>
      <span className="sr-only">
        {filled} reel {filled === 1 ? 'slot' : 'slots'}
      </span>
    </span>
  );
}

// ── 3. Promotion ───────────────────────────────────────────────────────────

export function CollabVisual() {
  const set = sources('/media/shared-table', [640, 1120]);
  return (
    <figure className="mx-auto w-full max-w-[340px]">
      <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_1px_2px_rgba(15,37,43,0.06),0_24px_50px_-28px_rgba(4,24,30,0.45)] ring-1 ring-line">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex shrink-0 -space-x-2.5" aria-hidden="true">
            <LogoMark size={34} className="h-[34px] w-[34px] rounded-full ring-2 ring-white" />
            <span className="h-[34px] w-[34px] rounded-full bg-sand ring-2 ring-white [background-image:repeating-linear-gradient(135deg,rgba(18,68,82,0.12)_0_2px,transparent_2px_6px)]" />
          </span>
          <span className="min-w-0 text-[13px] leading-snug text-ink">
            <span className="font-semibold">YepItsHalal</span> and <span className="font-semibold">your restaurant</span>
            <span className="block text-xs text-subtle">A shared post, on both your pages</span>
          </span>
        </div>
        <div className="relative">
          <picture>
            <source type="image/avif" srcSet={set('avif')} sizes="340px" />
            <source type="image/webp" srcSet={set('webp')} sizes="340px" />
            <img
              src="/media/shared-table-640.jpg"
              srcSet={set('jpg')}
              sizes="340px"
              width={640}
              height={360}
              loading="lazy"
              decoding="async"
              alt=""
              className="block aspect-[16/10] w-full object-cover sm:aspect-[4/3]"
            />
          </picture>
          <span className="absolute bottom-2 left-3 text-[10px] font-medium text-white/85 [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">
            Example
          </span>
        </div>
        <figcaption className="px-4 py-3 text-[13px] leading-snug text-muted">
          Your food videos, reposted and co-promoted by YepItsHalal.
        </figcaption>
      </div>
    </figure>
  );
}

// ── 4. The direct line ─────────────────────────────────────────────────────

export function DirectLineVisual() {
  return (
    <div className="mx-auto w-full max-w-[340px] rounded-[24px] bg-forest-deep p-6 text-white shadow-[0_24px_50px_-28px_rgba(4,24,30,0.6)] ground-dark">
      <div className="flex items-center gap-4">
        <FounderAvatar size={64} decorative />
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold leading-tight">{FOUNDER.name}</p>
          <p className="truncate text-sm text-white/70">@{FOUNDER.instagramHandle}</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2 text-sm text-white/85">
        <li className="flex items-center gap-2.5">
          <InstagramIcon className="h-[18px] w-[18px] text-accent-onDark" />
          Instagram, for anyone, any time
        </li>
        <li className="flex items-center gap-2.5">
          <ChatIcon className="h-[18px] w-[18px] text-accent-onDark" />
          WhatsApp, for Founders
        </li>
      </ul>
      <TrackedLink
        href={FOUNDER.instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        event="founders_instagram_clicked"
        props={{ where: 'direct_line' }}
        className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-forest-deep transition duration-200 hover:-translate-y-px hover:bg-accent-onDark active:translate-y-0 active:scale-[0.985]"
      >
        <InstagramIcon className="h-4 w-4" />
        Message me on Instagram
      </TrackedLink>
    </div>
  );
}
