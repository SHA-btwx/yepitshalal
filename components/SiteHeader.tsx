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
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-[40px] items-center rounded-full"
          aria-label="YepItsHalal — home"
        >
          <LogoLockup />
        </Link>

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
          Yep+
        </Link>
      </div>
    </header>
  );
}
