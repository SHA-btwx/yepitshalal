import { createServerSupabase } from './supabase/server';
import { createAdminSupabase } from './supabase/admin';

export interface RestaurantAccess {
  userId: string;
  isAdmin: boolean;
  isOwner: boolean;
}

/**
 * Gate for every reel write. Mirrors requireAdmin(): called at the top of the
 * page AND inside every Server Action, because actions are reachable over the
 * network whether or not the page that renders their form was ever loaded.
 *
 * Throws rather than redirects — callers are actions, and a redirect from an
 * action is not the error the caller needs to see.
 */
export async function requireRestaurantAccess(restaurantId: string): Promise<RestaurantAccess> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You need to be signed in.');

  const admin = createAdminSupabase();

  const [{ data: profile }, { data: restaurant }] = await Promise.all([
    admin.from('users').select('role').eq('id', user.id).maybeSingle(),
    admin.from('restaurants').select('owner_id').eq('id', restaurantId).maybeSingle(),
  ]);

  if (!restaurant) throw new Error('Restaurant not found.');

  const isAdmin = profile?.role === 'admin';
  const isOwner = restaurant.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    throw new Error('You do not manage this restaurant.');
  }

  return { userId: user.id, isAdmin, isOwner };
}

/**
 * A reel occupies a slot while it is live or waiting to go live. Drafts are
 * free, so a restaurant can prepare a replacement without paying — but it
 * cannot queue up more live content than its tier allows.
 *
 * The database trigger is the real backstop on publish; this exists so an owner
 * gets a sentence they can act on instead of a raw constraint violation.
 */
export async function assertSlotAvailable(restaurantId: string, excludeReelId?: string) {
  const admin = createAdminSupabase();

  const { data: allowanceRaw } = await admin.rpc('restaurant_reel_allowance', {
    p_restaurant_id: restaurantId,
  });
  const allowance = Number(allowanceRaw ?? 1);

  let query = admin
    .from('restaurant_reels')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .in('status', ['pending_review', 'published']);
  if (excludeReelId) query = query.neq('id', excludeReelId);

  const { count } = await query;
  const used = count ?? 0;

  if (used >= allowance) {
    throw new Error(
      `That would be reel ${used + 1} of ${allowance}. Take one down first, or add more capacity with a partnership.`
    );
  }
}
