import { createClient } from '@supabase/supabase-js';

// Service-role client — server-only, bypasses RLS entirely.
// Used exclusively by admin/verification API routes. Never import this
// from a Client Component or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createAdminSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local from the Supabase dashboard (Project Settings > API) to use admin features.'
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
