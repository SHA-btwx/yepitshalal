import { createServerSupabase } from './supabase/server';
import { createAdminSupabase } from './supabase/admin';
import type { HalalClassification } from './types';

export type ReelMediaKind = 'upload' | 'embed';
export type ReelStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';
export type VideoProvider = 'instagram' | 'tiktok' | 'youtube';

export interface Reel {
  id: string;
  restaurant_id: string;
  media_kind: ReelMediaKind;
  media_url: string;
  provider: VideoProvider | null;
  cover_url: string | null;
  caption: string | null;
  status: ReelStatus;
  moderation_note: string | null;
  position: number;
  discovery_eligible: boolean;
  published_at: string | null;
  created_at: string;
}

export interface ReelAllowance {
  allowance: number;
  published: number;
  remaining: number;
  isPartner: boolean;
}

/** A Discovery card: either a reel, or a photo for restaurants with no reel yet. */
export interface DiscoverItem {
  key: string;
  kind: 'reel' | 'photo';
  restaurantId: string;
  name: string;
  slug: string;
  address: string;
  halal_classification: HalalClassification;
  cuisines: string[];
  /** Reel: video/embed URL. Photo: the image. */
  mediaUrl: string;
  mediaKind: ReelMediaKind | null;
  provider: VideoProvider | null;
  coverUrl: string | null;
  caption: string | null;
  isPartner: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Published reels for a restaurant page, in the owner's chosen order.
 * RLS already limits anonymous callers to `status = 'published'`; the explicit
 * filter is here so the intent is readable at the call site too.
 */
export async function getPublishedReels(restaurantId: string): Promise<Reel[]> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('restaurant_reels')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'published')
    .order('position', { ascending: true })
    .order('published_at', { ascending: false });
  return (data ?? []) as Reel[];
}

/** Every reel for the owner's own management view, whatever its status. */
export async function getAllReelsForOwner(restaurantId: string): Promise<Reel[]> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('restaurant_reels')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .neq('status', 'archived')
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });
  return (data ?? []) as Reel[];
}

/**
 * The allowance figures shown to an owner. Read through the database functions
 * rather than recomputed here, so the number an owner sees is the same number
 * the publish trigger will enforce.
 */
export async function getReelAllowance(restaurantId: string): Promise<ReelAllowance> {
  const supabase = createAdminSupabase();
  const [{ data: allowance }, { data: published }, { data: partner }] = await Promise.all([
    supabase.rpc('restaurant_reel_allowance', { p_restaurant_id: restaurantId }),
    supabase.rpc('published_reel_count', { p_restaurant_id: restaurantId }),
    supabase.rpc('is_active_partner', { p_restaurant_id: restaurantId }),
  ]);

  const a = Number(allowance ?? 1);
  const p = Number(published ?? 0);
  return { allowance: a, published: p, remaining: Math.max(0, a - p), isPartner: Boolean(partner) };
}

interface RestaurantLite {
  id: string;
  name: string;
  slug: string;
  address: string;
  halal_classification: HalalClassification;
}

/**
 * Discovery feed.
 *
 * Fairness rules, deliberately simple — no recommender, no ranking model:
 *
 *  1. Every published, discovery-eligible reel is an independent candidate, so
 *     publishing more reels genuinely creates more chances to be seen.
 *  2. A single restaurant contributes at most `discovery_reels_per_restaurant`
 *     reels to any one session, so a large library cannot flood a feed.
 *  3. Candidates are round-robined across restaurants, so two cards from the
 *     same restaurant are never adjacent.
 *  4. Restaurants with no reel still appear, as a photo card. Without this the
 *     feed would be empty today and would quietly punish free restaurants.
 *
 * More reels therefore means more opportunities, never a guaranteed advantage.
 */
export async function getDiscoverFeed(limit = 24): Promise<DiscoverItem[]> {
  const supabase = createServerSupabase();

  const perRestaurant = await getDiscoveryPerRestaurantCap();

  const { data: reelRows } = await supabase
    .from('restaurant_reels')
    .select('id, restaurant_id, media_kind, media_url, provider, cover_url, caption, published_at')
    .eq('status', 'published')
    .eq('discovery_eligible', true)
    .order('published_at', { ascending: false })
    .limit(400);

  const reels = shuffle(reelRows ?? []);

  // Rule 2: cap per restaurant before anything else looks at ordering.
  const byRestaurant = new Map<string, typeof reels>();
  for (const r of reels) {
    const list = byRestaurant.get(r.restaurant_id) ?? [];
    if (list.length >= perRestaurant) continue;
    list.push(r);
    byRestaurant.set(r.restaurant_id, list);
  }

  // Rule 3: round-robin so no restaurant appears twice in a row.
  const queues = shuffle([...byRestaurant.values()]);
  const orderedReels: typeof reels = [];
  let depth = 0;
  while (orderedReels.length < limit) {
    let added = false;
    for (const q of queues) {
      if (q[depth]) {
        orderedReels.push(q[depth]);
        added = true;
        if (orderedReels.length >= limit) break;
      }
    }
    if (!added) break;
    depth += 1;
  }

  const reelRestaurantIds = [...new Set(orderedReels.map((r) => r.restaurant_id))];

  // Rule 4: top up with photo cards from restaurants that have no reel.
  const photoSlots = Math.max(0, limit - orderedReels.length);
  const photoItems = photoSlots > 0 ? await getPhotoCards(photoSlots, reelRestaurantIds) : [];

  const allIds = [...new Set([...reelRestaurantIds, ...photoItems.map((p) => p.restaurantId)])];
  if (allIds.length === 0) return [];

  const [{ data: restaurants }, { data: cuisineLinks }, partnerIds] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id, name, slug, address, halal_classification')
      .in('id', allIds),
    supabase.from('restaurant_cuisines').select('restaurant_id, cuisines(name)').in('restaurant_id', allIds),
    getActivePartnerIds(allIds),
  ]);

  const byId = new Map((restaurants ?? []).map((r) => [r.id, r as RestaurantLite]));
  const cuisines = new Map<string, string[]>();
  for (const link of cuisineLinks ?? []) {
    const name = Array.isArray(link.cuisines)
      ? link.cuisines[0]?.name
      : (link.cuisines as { name: string } | null)?.name;
    if (!name) continue;
    cuisines.set(link.restaurant_id, [...(cuisines.get(link.restaurant_id) ?? []), name]);
  }

  const items: DiscoverItem[] = [];

  for (const reel of orderedReels) {
    const r = byId.get(reel.restaurant_id);
    if (!r) continue;
    items.push({
      key: `reel:${reel.id}`,
      kind: 'reel',
      restaurantId: r.id,
      name: r.name,
      slug: r.slug,
      address: r.address,
      halal_classification: r.halal_classification,
      cuisines: cuisines.get(r.id) ?? [],
      mediaUrl: reel.media_url,
      mediaKind: reel.media_kind as ReelMediaKind,
      provider: (reel.provider as VideoProvider | null) ?? null,
      coverUrl: reel.cover_url,
      caption: reel.caption,
      isPartner: partnerIds.has(r.id),
    });
  }

  for (const photo of photoItems) {
    const r = byId.get(photo.restaurantId);
    if (!r) continue;
    items.push({
      key: `photo:${r.id}`,
      kind: 'photo',
      restaurantId: r.id,
      name: r.name,
      slug: r.slug,
      address: r.address,
      halal_classification: r.halal_classification,
      cuisines: cuisines.get(r.id) ?? [],
      mediaUrl: photo.url,
      mediaKind: null,
      provider: null,
      coverUrl: null,
      caption: null,
      isPartner: partnerIds.has(r.id),
    });
  }

  return items;
}

async function getDiscoveryPerRestaurantCap(): Promise<number> {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'discovery_reels_per_restaurant')
    .maybeSingle();
  const parsed = Number(data?.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}

async function getActivePartnerIds(restaurantIds: string[]): Promise<Set<string>> {
  if (restaurantIds.length === 0) return new Set();
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('restaurant_partnerships')
    .select('restaurant_id, current_period_end')
    .eq('status', 'active')
    .in('restaurant_id', restaurantIds);
  const now = Date.now();
  return new Set(
    (data ?? [])
      .filter((p) => !p.current_period_end || new Date(p.current_period_end).getTime() > now)
      .map((p) => p.restaurant_id)
  );
}

/** Photo cards for restaurants that have no reel — keeps the feed populated. */
async function getPhotoCards(
  count: number,
  excludeRestaurantIds: string[]
): Promise<{ restaurantId: string; url: string }[]> {
  const supabase = createServerSupabase();

  const { count: total } = await supabase
    .from('restaurants')
    .select('id', { count: 'exact', head: true });
  const windowSize = Math.min(300, total || 300);
  const offset = Math.floor(Math.random() * Math.max(1, (total ?? 0) - windowSize + 1));

  const { data: idRows } = await supabase
    .from('restaurants')
    .select('id')
    .range(offset, offset + windowSize - 1);

  const exclude = new Set(excludeRestaurantIds);
  const ids = shuffle((idRows ?? []).map((r) => r.id).filter((id) => !exclude.has(id))).slice(
    0,
    count * 2
  );
  if (ids.length === 0) return [];

  const { data: photos } = await supabase
    .from('restaurant_photos')
    .select('restaurant_id, storage_path, is_primary')
    .in('restaurant_id', ids)
    .order('is_primary', { ascending: false });

  const seen = new Set<string>();
  const out: { restaurantId: string; url: string }[] = [];
  for (const p of photos ?? []) {
    if (seen.has(p.restaurant_id)) continue;
    seen.add(p.restaurant_id);
    out.push({ restaurantId: p.restaurant_id, url: p.storage_path });
    if (out.length >= count) break;
  }
  return out;
}

/** Single-restaurant partner check, for the restaurant page and manage view. */
export async function isActivePartner(restaurantId: string): Promise<boolean> {
  const supabase = createAdminSupabase();
  const { data } = await supabase.rpc('is_active_partner', { p_restaurant_id: restaurantId });
  return Boolean(data);
}

export interface FeaturedReel {
  id: string;
  slug: string;
  name: string;
  halal_classification: HalalClassification;
  coverUrl: string | null;
  mediaUrl: string;
  mediaKind: ReelMediaKind;
  caption: string | null;
}

/**
 * A small set of real reels for the homepage strip — one per restaurant, so the
 * row shows breadth rather than one partner's library.
 *
 * Returns [] when nothing is published. The homepage is required to handle that
 * honestly rather than fill the row with stand-in content: a strip of stock
 * photos dressed as restaurant reels would misrepresent what is on the platform.
 */
export async function getFeaturedReels(limit = 6): Promise<FeaturedReel[]> {
  const supabase = createServerSupabase();

  const { data: reels } = await supabase
    .from('restaurant_reels')
    .select('id, restaurant_id, media_url, media_kind, cover_url, caption, published_at')
    .eq('status', 'published')
    .eq('discovery_eligible', true)
    .order('published_at', { ascending: false })
    .limit(60);

  if (!reels || reels.length === 0) return [];

  const oncePerRestaurant = [];
  const seen = new Set<string>();
  for (const r of shuffle(reels)) {
    if (seen.has(r.restaurant_id)) continue;
    seen.add(r.restaurant_id);
    oncePerRestaurant.push(r);
    if (oncePerRestaurant.length >= limit) break;
  }

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, halal_classification')
    .in('id', [...seen]);
  const byId = new Map((restaurants ?? []).map((r) => [r.id, r]));

  return oncePerRestaurant.flatMap((reel) => {
    const r = byId.get(reel.restaurant_id);
    if (!r) return [];
    return [
      {
        id: reel.id,
        slug: r.slug,
        name: r.name,
        halal_classification: r.halal_classification as HalalClassification,
        coverUrl: reel.cover_url,
        mediaUrl: reel.media_url,
        mediaKind: reel.media_kind as ReelMediaKind,
        caption: reel.caption,
      },
    ];
  });
}
