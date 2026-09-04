// Assigns a compliant, licensed (Unsplash License — free for commercial use)
// cuisine-representative photo to every restaurant that has no real photo of
// its own. These are NOT photos of the restaurant's actual food — the UI
// labels them "Representative photo" (detected by the images.unsplash.com
// domain) so this is never presented as the restaurant's own image. Real
// photos naturally replace these once an owner claims their listing and
// uploads their own via /admin or a future self-serve flow.
//
// Each cuisine bucket holds several candidate photos (all verified with a
// HEAD request before being added here) and a restaurant is deterministically
// assigned one based on a hash of its own id — so nearby restaurants of the
// same cuisine don't all show the identical picture, but a given restaurant's
// photo stays stable across re-runs of this script.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function loadEnvLocal() {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}
const env = loadEnvLocal();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const u = (id) => `https://images.unsplash.com/${id}?w=800`;

const KEBAB = [
  'photo-1653982960203-c8361d7bed96', 'photo-1644364935906-792b2245a2c0', 'photo-1653983736416-6f775b329925',
  'photo-1552332386-f8dd00dc2f85', 'photo-1717250180703-c3bac5b6af5f', 'photo-1665989215795-f67f4723087d',
  'photo-1612690194179-65e8a2bdc470', 'photo-1736952709727-1e8f30b6f428', 'photo-1676471980189-08de3e001215',
  'photo-1551504734-5ee1c4a1479b',
].map(u);

const BIRYANI = [
  'photo-1589302168068-964664d93dc0', 'photo-1697155406055-2db32d47ca07', 'photo-1631515243349-e0cb75fb8d3a',
  'photo-1563379091339-03b21ab4a4f8', 'photo-1705174299330-939dd03cc864', 'photo-1716550781939-beb7d7247aae',
  'photo-1633945274309-2c16c9682a8c', 'photo-1555939594-58d7cb561ad1', 'photo-1710091691777-3115088962c4',
  'photo-1630851840633-f96999247032',
].map(u);

const CURRY = [
  'photo-1585937421612-70a008356fbe', 'photo-1596797038530-2c107229654b', 'photo-1603894584373-5ac82b2ae398',
  'photo-1631292784640-2b24be784d5d', 'photo-1710091691780-c7eb0dc50cf8', 'photo-1588166524941-3bf61a9c41db',
  'photo-1631452180519-c014fe946bc7', 'photo-1710091691771-96b2e6d17dac', 'photo-1707448829764-9474458021ed',
  'photo-1613292443284-8d10ef9383fe',
].map(u);

const SHAWARMA = [
  'photo-1662116765994-1e4200c43589', 'photo-1719282431565-3b30bb7d2658', 'photo-1699728088614-7d1d4277414b',
  'photo-1583060095186-852adde6b819', 'photo-1684864115205-242c064363e6', 'photo-1530469912745-a215c6b256ea',
  'photo-1676300187013-7540d4e9440d', 'photo-1699728088600-6d684acbeada', 'photo-1583665354191-634609954d54',
  'photo-1529006557810-274b9b2fc783',
].map(u);

const FRIED_CHICKEN = [
  'photo-1569058242253-92a9c755a0ec', 'photo-1638439430466-b2bb7fdc1d67', 'photo-1562967916-eb82221dfb92',
  'photo-1586793783658-261cddf883ef', 'photo-1694853651800-3e9b4aa96a42', 'photo-1585703900468-13c7a978ad86',
  'photo-1426869981800-95ebf51ce900', 'photo-1562967914-608f82629710', 'photo-1600555379765-f82335a7b1b0',
  'photo-1615322681853-52a81fb318ac',
].map(u);

const BURGERS = [
  'photo-1568901346375-23c9450c58cd', 'photo-1586190848861-99aa4a171e90', 'photo-1572802419224-296b0aeee0d9',
  'photo-1610440042657-612c34d95e9f', 'photo-1550547660-d9450f859349', 'photo-1571091718767-18b5b1457add',
  'photo-1603064752734-4c48eff53d05', 'photo-1607013251379-e6eecfffe234', 'photo-1530554764233-e79e16c91d08',
  'photo-1549611016-3a70d82b5040',
].map(u);

const MIDDLE_EASTERN = [
  'photo-1555939594-58d7cb561ad1', 'photo-1511690656952-34342bb7c2f2', 'photo-1612569188733-05e38c694a0a',
  'photo-1547516453-01c9910aafbf', 'photo-1623065492741-5cf3690b4535', 'photo-1697126248475-a537cc5cce28',
].map(u);

const BAKERY = [
  'photo-1604908552986-eb22824b2150', 'photo-1604908464937-12bf0fa8d4b6', 'photo-1571157577110-493b325fdd3d',
  'photo-1695217682346-c03f0a540806', 'photo-1643551620454-0bd8f58487c0', 'photo-1710971694277-d734d8acb88c',
].map(u);

const GRILL = [
  'photo-1588168333986-5078d3ae3976', 'photo-1508615263227-c5d58c1e5821', 'photo-1558030089-02acba3c214e',
  'photo-1529692236671-f1f6cf9683ba', 'photo-1558030006-450675393462', 'photo-1627947063935-55577ec3c2e1',
  'photo-1616252980327-ec70572e5df9', 'photo-1614119068601-483274e9dcb7',
].map(u);

const PHOTO_BY_CUISINE = {
  turkish: KEBAB,
  biryani: BIRYANI,
  indian: CURRY,
  pakistani: CURRY,
  bangladeshi: CURRY,
  lebanese: SHAWARMA,
  'middle eastern': MIDDLE_EASTERN,
  persian: GRILL,
  'fried chicken': FRIED_CHICKEN,
  burgers: BURGERS,
  grill: GRILL,
  bakery: BAKERY,
};

// Restaurants with no recognised cuisine tag (the majority) draw from this
// wide general pool instead of a single repeated fallback image.
const GENERAL_POOL = [...KEBAB, ...CURRY, ...GRILL, ...SHAWARMA, ...MIDDLE_EASTERN, ...FRIED_CHICKEN];

function hashToIndex(id, length) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

function isStockUrl(url) {
  return typeof url === 'string' && url.includes('images.unsplash.com');
}

async function fetchAll(buildQuery) {
  const pageSize = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    all = all.concat(data ?? []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function main() {
  const allRestaurants = await fetchAll(() => supabase.from('restaurants').select('id'));
  const allPhotos = await fetchAll(() => supabase.from('restaurant_photos').select('id, restaurant_id, storage_path'));

  const photosByRestaurant = new Map();
  for (const p of allPhotos) {
    if (!photosByRestaurant.has(p.restaurant_id)) photosByRestaurant.set(p.restaurant_id, []);
    photosByRestaurant.get(p.restaurant_id).push(p);
  }

  const cuisineLinks = await fetchAll(() =>
    supabase.from('restaurant_cuisines').select('restaurant_id, cuisines(name)')
  );
  const cuisineByRestaurant = new Map();
  for (const link of cuisineLinks) {
    const name = Array.isArray(link.cuisines) ? link.cuisines[0]?.name : link.cuisines?.name;
    if (name) cuisineByRestaurant.set(link.restaurant_id, name.toLowerCase());
  }

  function pickUrl(restaurantId) {
    const cuisine = cuisineByRestaurant.get(restaurantId);
    const pool = (cuisine && PHOTO_BY_CUISINE[cuisine]) || GENERAL_POOL;
    return pool[hashToIndex(restaurantId, pool.length)];
  }

  let inserted = 0;
  let rebalanced = 0;
  const inserts = [];
  const updates = [];

  for (const r of allRestaurants) {
    const existing = photosByRestaurant.get(r.id) ?? [];
    const stockPhoto = existing.find((p) => isStockUrl(p.storage_path));
    const hasRealPhoto = existing.some((p) => !isStockUrl(p.storage_path));

    if (hasRealPhoto) continue; // never touch a real, owner-provided photo

    const url = pickUrl(r.id);
    if (!stockPhoto) {
      inserts.push({ restaurant_id: r.id, storage_path: url, type: 'food', is_primary: true });
    } else if (stockPhoto.storage_path !== url) {
      updates.push({ id: stockPhoto.id, storage_path: url });
    }
  }

  for (let i = 0; i < inserts.length; i += 500) {
    await supabase.from('restaurant_photos').insert(inserts.slice(i, i + 500));
    inserted += Math.min(500, inserts.length - i);
    console.log(`  ...${inserted} new photos assigned`);
  }

  for (const upd of updates) {
    await supabase.from('restaurant_photos').update({ storage_path: upd.storage_path }).eq('id', upd.id);
    rebalanced++;
    if (rebalanced % 200 === 0) console.log(`  ...${rebalanced} rebalanced`);
  }

  console.log(`\nDone. ${inserted} restaurants got a photo for the first time.`);
  console.log(`${rebalanced} restaurants had their repeated stock photo swapped for a more varied one.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
