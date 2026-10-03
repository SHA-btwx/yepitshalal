import { createClient } from '@supabase/supabase-js';

/**
 * The service role client for everything in Deals, with every request sent
 * fresh. Next 14 keeps fetch() responses in its Data Cache by default, POSTs
 * included, unless the route has already read cookies or has a non-GET
 * handler. `dynamic = 'force-dynamic'` alone does not stop it in a GET route
 * handler: the QA rig caught the daily cron reusing last run's restaurants
 * and skipping its own database calls. Credit, codes and emails must never
 * come from that cache, wherever they are read.
 */
export function dealsDb() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
}
