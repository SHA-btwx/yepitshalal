// Class strings shared by the /founders components.
//
// heroPrimary and heroSecondary are the same buttons as the ones exported by
// components/PageHero.tsx. They are repeated here because the client
// components on this page cannot import from PageHero without pulling it, and
// the scene media it renders, into the browser bundle. Change both together.

export const heroPrimary =
  'group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink shadow-sm transition duration-200 ease-out hover:-translate-y-px hover:bg-sand-soft hover:shadow-md active:translate-y-0 active:scale-[0.985]';

export const heroSecondary =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white/10 px-6 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm transition duration-200 ease-out hover:-translate-y-px hover:bg-white/15 active:translate-y-0 active:scale-[0.985]';

/** A section heading on this page: the site's, a size up. */
export const foundersTitle =
  'text-balance font-display text-[1.85rem] font-semibold leading-[1.1] tracking-[-0.015em] text-ink sm:text-[2.4rem]';

/** The italic face loaded by app/founders/layout.tsx, for the letter's sign-off. */
export const signature = 'font-[family-name:var(--font-display-italic)] italic';
