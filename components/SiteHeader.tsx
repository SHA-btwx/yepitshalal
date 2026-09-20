import Link from 'next/link';
import { LogoLockup } from './Logo';
import { NavLink } from './NavLink';
import { SparkleIcon } from './icons';
import { createServerSupabase } from '@/lib/supabase/server';

export async function SiteHeader() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-30 border-b border-sand-line bg-sand-soft/85 backdrop-blur supports-[backdrop-filter]:bg-sand-soft/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <span className="inline-flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex min-h-[40px] items-center rounded-full"
            aria-label="YepItsHalal home"
          >
            <LogoLockup />
          </Link>
          {/* Beside the name on every page, not just the homepage. Somebody who
              arrives on a restaurant page from a search deserves to know how
              young this is before they judge what is missing from it. */}
          <Link
            href="/#next-cities"
            className="inline-flex items-center rounded-full bg-spice-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-spice-ink transition hover:bg-spice/20"
            title="London only for now. Tell us where to go next."
          >
            Beta
          </Link>
        </span>

        {/* Below sm these live in the bottom tab bar instead. */}
        <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
          <NavLink href="/discover">Discover</NavLink>
          <NavLink href="/submit-restaurant">Add your restaurant</NavLink>
          <NavLink href={user ? '/account' : '/sign-in'}>{user ? 'My account' : 'Sign in'}</NavLink>
        </nav>

        <Link
          href="/yep-plus"
          className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-accent-ink active:scale-[0.98]"
        >
          <SparkleIcon className="h-4 w-4" />
          Support us
        </Link>
      </div>
    </header>
  );
}
