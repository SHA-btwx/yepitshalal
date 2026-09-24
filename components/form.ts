/**
 * One look for every form on the site, the way components/cta.ts is one look
 * for every button. Each form used to carry its own copy of these strings and
 * they had drifted: pill inputs on one, 12px on another, 8px choice chips on a
 * third.
 *
 *  - Label above the field, always visible. A placeholder is an example, never
 *    the label.
 *  - text-[16px] on phones: iOS Safari zooms the whole page when a focused
 *    field's text is smaller, and the visitor has to pinch back out after
 *    every field.
 *  - Fields are 12px (rounded-xl), choices are pills like every other control.
 *  - The error sits under the thing it is about, in words that say how to fix it.
 */

export const fieldLabel = 'mb-1.5 block text-sm font-medium text-ink';

export const fieldInput =
  'w-full rounded-xl border border-black/15 bg-white px-3.5 py-3 text-[16px] text-ink shadow-[inset_0_1px_0_rgba(15,37,43,0.03)] placeholder:text-subtle transition duration-150 hover:border-black/25 focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent-ink/20 sm:text-sm';

/** The same field on the forest ground. */
export const fieldInputDark =
  'w-full rounded-xl border border-white/25 bg-white/10 px-3.5 py-3 text-[16px] text-white placeholder:text-white/55 transition duration-150 hover:border-white/40 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 sm:text-sm';

export const fieldHint = 'mt-1.5 text-xs leading-relaxed text-muted';

/** A group of related questions inside a longer form. */
export const fieldGroup = 'space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6';

/** One option in a set of radio choices, drawn as a pill. */
export const choicePill =
  'inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-black/15 bg-white px-4 text-[14px] text-ink/80 transition duration-150 hover:border-ink/30 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-ink has-[:focus-visible]:ring-offset-2';

export const formError =
  'rounded-xl bg-halal-partialSoft px-4 py-3 text-sm font-medium text-halal-partialInk ring-1 ring-halal-partial/20';

export const formSuccess =
  'rounded-2xl bg-halal-fullSoft p-5 text-sm leading-relaxed text-halal-fullInk ring-1 ring-halal-full/20';
