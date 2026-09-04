import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Public, RLS-respecting server client — used for server-rendered pages
// (search, restaurant detail) that read only publicly-readable data.
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component with no request context to write to — safe to ignore
          }
        },
      },
    }
  );
}
