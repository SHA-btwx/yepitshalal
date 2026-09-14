import { redirect } from 'next/navigation';
import { createServerSupabase } from './supabase/server';

// Confirms the current session belongs to a user with role='admin'.
// Call this at the top of every admin page AND every admin Server Action:
// actions are callable directly over the network regardless of whether the
// page that renders their form was ever loaded, so the page-level check
// alone is not enough.
export async function requireAdmin() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/admin');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') redirect('/');

  return user;
}

/**
 * The same check for API routes, which need a status code rather than a
 * redirect. Returns the admin's user id, or null.
 */
export async function getAdminUserId(): Promise<string | null> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  return profile?.role === 'admin' ? user.id : null;
}
