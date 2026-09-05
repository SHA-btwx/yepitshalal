/**
 * One definition of each button shape.
 *
 * Every CTA on the site was carrying its own hand-written class string, which
 * is why hover, active and height had drifted apart between them. These are the
 * three shapes the product actually needs.
 *
 * The motion here is deliberately almost nothing: a 1px lift and a shadow step
 * on hover, a small press on active, both over 200ms. Enough to say "this is
 * pressable", not enough to notice as an animation. Transform and shadow only —
 * both composite on the GPU, so a hover never costs a layout pass. The global
 * prefers-reduced-motion rule in globals.css removes all of it.
 */

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-200 ease-out disabled:pointer-events-none disabled:opacity-60';

/** Filled. One per view — the thing we actually want pressed. */
export const ctaPrimary = `${base} min-h-[48px] bg-ink px-6 text-sm text-white shadow-sm hover:-translate-y-px hover:bg-accent-ink hover:shadow-md active:translate-y-0 active:scale-[0.985] active:shadow-sm`;

/** Outlined. Sits beside a primary without competing with it. */
export const ctaSecondary = `${base} min-h-[48px] border border-line bg-white px-6 text-sm text-ink shadow-sm hover:-translate-y-px hover:border-ink/25 hover:shadow-md active:translate-y-0 active:scale-[0.985] active:shadow-sm`;

/** No chrome until you touch it. For tertiary links that still need a target. */
export const ctaGhost = `${base} min-h-[44px] px-4 text-sm text-accent-ink hover:bg-accent-soft active:scale-[0.985]`;

/** Compact variant of the above, for dense rows and cards. */
export const ctaPrimarySm = `${base} min-h-[40px] bg-ink px-4 text-[13px] text-white hover:-translate-y-px hover:bg-accent-ink hover:shadow-md active:translate-y-0 active:scale-[0.985]`;
export const ctaSecondarySm = `${base} min-h-[40px] border border-line bg-white px-4 text-[13px] text-ink hover:-translate-y-px hover:border-ink/25 hover:shadow-sm active:translate-y-0 active:scale-[0.985]`;

/**
 * Card that behaves as one big link. Same restraint as the buttons: a small
 * lift, a shadow step, and an arrow that moves 2px. Pair with
 * `group-hover:translate-x-0.5` on an ArrowRightIcon inside.
 */
export const linkCard =
  'group block rounded-2xl border border-line bg-white shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-md active:translate-y-0';
