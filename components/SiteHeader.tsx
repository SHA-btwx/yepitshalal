import Link from 'next/link';
import { LogoLockup } from './Logo';
import { NavLink } from './NavLink';
import { LanguageMenu } from './LanguageMenu';
import { SparkleIcon } from './icons';
import { createServerSupabase } from '@/lib/supabase/server';

// The header is the logo's own ground since 2026-09-24: its deep teal, with
// the lockup in the logo's white and lime, and the one button in lime.
//
// Solid, and the full width of the window. It was 85 to 95% opaque, which over
// the page's light ground turned the teal a washed-out grey and the logo with
// it; and it sat inside the 1152px content column, so on a wide screen the logo
// floated 200 to 400px in from the corner. Shabir, 2026-09-24: put the logo on
// the top left and make sure it is properly visible.
export async function SiteHeader() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="ground-dark sticky top-0 z-30 border-b border-white/10 bg-forest-deep text-white">
      <div className="flex h-14 w-full items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <span className="inline-flex min-w-0 items-center gap-2">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center rounded-full"
            aria-label="YepItsHalal home"
          >
            <LogoLockup tone="dark" />
          </Link>
          {/* Beside the name on every page, not just the homepage. Somebody who
              arrives on a restaurant page from a search deserves to know how
              young this is before they judge what is missing from it. */}
          <Link
            href="/#next-cities"
            className="relative inline-flex shrink-0 items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-onDark ring-1 ring-accent/40 transition after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] hover:bg-white/15"
            title="London only for now. Tell us where to go next."
          >
            Beta
          </Link>
        </span>

        {/* Below sm these live in the bottom tab bar instead. */}
        <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
          <NavLink href="/discover" tone="dark">
            Discover
          </NavLink>
          <NavLink href="/submit-restaurant" tone="dark">
            Add your restaurant
          </NavLink>
          <NavLink href={user ? '/account' : '/sign-in'} tone="dark">
            {user ? 'My account' : 'Sign in'}
          </NavLink>
        </nav>

        <span className="inline-flex shrink-0 items-center gap-1 sm:gap-2">
          {/* From 640px. On a phone the language lives in the bottom bar. */}
          <LanguageMenu />

          <Link
            href="/yep-plus"
            className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 text-sm font-semibold text-forest-deep transition duration-200 hover:-translate-y-px hover:bg-accent-onDark active:translate-y-0 active:scale-[0.985] sm:px-4"
          >
            <SparkleIcon className="h-4 w-4" aria-hidden="true" />
            Support us
          </Link>
        </span>
      </div>
    </header>
  );
}
