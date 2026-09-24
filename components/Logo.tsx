// The YepItsHalal logo, chosen by Shabir on 2026-09-24 from five variations:
// "YEP ITS" set straight, YEP in white and ITS in lime, over a lime location
// pin that holds حلال in white, on a deep teal disc inside a white ring. It
// reads as one sentence, "Yep, it's halal", with the Arabic word as the pin.
//
// The files in /public/brand are traced from that artwork, not redrawn, so the
// lettering and the calligraphy are exactly as designed; only the ring was
// replaced by a true circle. Built by ~/.claude/tools/brand/trace-logo.mjs and
// build-logo.mjs.
//
// Three forms of it, each used where it can be read:
//
//  - LogoMark: the pin and حلال on the teal disc, no English, for 32 to 64px
//    (the header). The favicon's two smallest sizes drop the Arabic too.
//  - LogoLockup: the mark beside YEP ITS HALAL, for navigation. The logo
//    writes halal in Arabic; the lockup spells it out so the name reads.
//  - LogoBadge: the whole logo, from about 96px up (the footer, the support
//    card, social profiles, app icons).
//
// Still no tick, and no seal wording round the edge: a round حلال badge with
// either would read as a halal certification, and YepItsHalal certifies
// nothing (see /terms).

/* eslint-disable @next/next/no-img-element */

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/yepitshalal-mark.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      decoding="async"
      className={className}
    />
  );
}

/** YEP ITS HALAL on its own. `tone` is the ground it sits on. */
export function LogoWordmark({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    // 711 by 90: the wordmark's own proportions.
    <img
      src={tone === 'dark' ? '/brand/yepitshalal-wordmark-on-dark.svg' : '/brand/yepitshalal-wordmark-on-light.svg'}
      alt="YepItsHalal"
      width={126}
      height={16}
      decoding="async"
      className={className}
    />
  );
}

/** The mark and the wordmark. `tone` is the ground it sits on. */
export function LogoLockup({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={34} className="h-[34px] w-[34px] shrink-0" />
      <LogoWordmark tone={tone} className="h-[14px] w-auto min-[380px]:h-4 sm:h-[17px]" />
    </span>
  );
}

/** The full logo, as a cached file. Use at 96px and up. */
export function LogoBadge({
  size = 120,
  className,
  decorative = false,
}: {
  size?: number;
  className?: string;
  /** Beside words that already say YepItsHalal. */
  decorative?: boolean;
}) {
  return (
    <img
      src="/brand/yepitshalal-logo.svg"
      alt={decorative ? '' : 'YepItsHalal'}
      width={size}
      height={size}
      decoding="async"
      className={className}
    />
  );
}
