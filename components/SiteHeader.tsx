import Link from 'next/link';
import { LogoLockup } from './Logo';
import { createServerSupabase } from '@/lib/supabase/server';

export async function SiteHeader() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/">
          <LogoLockup />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/submit-restaurant"
            className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-ink/70 hover:bg-black/5 sm:block"
          >
            Add your restaurant
          </Link>
          <Link
            href={user ? '/account' : '/sign-in'}
            className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-ink/70 hover:bg-black/5 sm:block"
          >
            {user ? 'My account' : 'Sign in'}
          </Link>
          <Link
            href="/yep-plus"
            className="rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-ink sm:px-4"
          >
            Yep+
          </Link>
        </nav>
      </div>
    </header>
  );
}
