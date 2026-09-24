/**
 * The page parts every route shares, the way components/cta.ts holds the
 * buttons: one definition each, so a heading on /terms and a heading on
 * /yep-plus cannot drift apart.
 *
 * The rules they encode, which the homepage already followed:
 *
 *  - One shape rule. Buttons and chips are pills, anything that holds content
 *    is 16px (rounded-2xl), a text field is 12px (rounded-xl). Nothing else.
 *  - A box means "this is a separate thing". Lists and sections are grouped
 *    with rules and space; only the one thing a reader should act on, or a
 *    warning they must not miss, gets a surface.
 *  - Reading width is about 65 characters (max-w-2xl at 15px). Headings and
 *    body share a left edge with the page header above them.
 *  - One small label above a heading per three sections at most. The heading
 *    usually says enough on its own.
 */

/** Same width and gutters as the site header, so every left edge lines up. */
export const pageShell = 'mx-auto w-full max-w-6xl px-5 sm:px-6';

/** Space between the sections of a page. */
export const sectionStack = 'space-y-14 sm:space-y-16';

export const sectionTitle =
  'text-balance font-display text-[1.6rem] font-semibold leading-tight tracking-[-0.01em] text-ink sm:text-[1.85rem]';

/** A sub-heading inside a section. */
export const blockTitle = 'font-display text-lg font-semibold leading-snug text-ink';

/** The line under a section title. Says something new or is left out. */
export const sectionLede = 'mt-2 max-w-xl text-pretty text-[15px] leading-relaxed text-muted';

export const bodyText = 'text-pretty text-[15px] leading-relaxed text-muted';

/** A link inside running text: visibly a link without shouting. */
export const inlineLink =
  'font-semibold text-accent-ink underline decoration-accent-ink/30 underline-offset-[3px] transition-colors hover:decoration-accent-ink';

/** The lifted surface. Spend it on the one thing that needs it. */
export const panel = 'rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(15,37,43,0.04)]';

/** A warm note: context a reader should have, not an alarm. */
export const noteWarm = 'rounded-2xl bg-sand p-5 ring-1 ring-sand-line sm:p-6';

/**
 * The dark feature surface, in the hero's forest rather than ink, so a
 * "Become a supporter" card and the homepage hero read as the same brand.
 * Pair with `grain` and a forestLights layer for depth.
 */
export const panelForest = 'ground-dark grain relative isolate overflow-hidden rounded-2xl bg-forest-deep text-white';

/** A list grouped by rules instead of boxes. */
export const ruledList = 'divide-y divide-line border-y border-line';

/** Small uppercase meta label, for real metadata only (a count, a source). */
export const metaLabel = 'text-xs font-semibold uppercase tracking-[0.06em] text-subtle';
