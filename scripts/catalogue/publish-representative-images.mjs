// Builds the representative image library the site shows for places without a
// photo of their own.
//
//   node publish-representative-images.mjs
//
// Inputs, both chosen by a person looking at every image (see
// find-representative-images.mjs):
//   .cache/image-chosen.json   Wikimedia Commons photos, per kind of food
//   UNSPLASH below             photos already in use on the site (Unsplash licence)
//
// Commons photos are resized to 960x720 WebP and stored in the site's own
// storage, so pages never depend on Wikimedia being reachable. Unsplash photos
// stay on Unsplash's image CDN, which is how Unsplash asks to be used.
//
// Output: ../../lib/representative-images.json, read by lib/representativeImages.ts.
// Every Commons entry keeps its title, author, licence and source page, because
// CC BY and CC BY-SA need credit wherever the image appears.

import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { cachePath } from './lib.mjs';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BUCKET = 'restaurant-photos';
const UA = 'YepItsHalalBot/1.0 (https://yepitshalal.com; representative food images)';

// Reviewed Unsplash photos, by kind of food. Ids from scripts/assign-stock-photos.mjs,
// minus the ones that did not show the food they were filed under.
const UNSPLASH = {
  kebab: ['photo-1653982960203-c8361d7bed96', 'photo-1644364935906-792b2245a2c0', 'photo-1653983736416-6f775b329925',
    'photo-1717250180703-c3bac5b6af5f', 'photo-1665989215795-f67f4723087d', 'photo-1612690194179-65e8a2bdc470',
    'photo-1736952709727-1e8f30b6f428', 'photo-1676471980189-08de3e001215', 'photo-1631515243349-e0cb75fb8d3a'],
  biryani: ['photo-1589302168068-964664d93dc0', 'photo-1697155406055-2db32d47ca07', 'photo-1563379091339-03b21ab4a4f8',
    'photo-1705174299330-939dd03cc864', 'photo-1716550781939-beb7d7247aae', 'photo-1633945274309-2c16c9682a8c',
    'photo-1555939594-58d7cb561ad1', 'photo-1710091691777-3115088962c4', 'photo-1630851840633-f96999247032'],
  curry: ['photo-1585937421612-70a008356fbe', 'photo-1596797038530-2c107229654b', 'photo-1603894584373-5ac82b2ae398',
    'photo-1631292784640-2b24be784d5d', 'photo-1710091691780-c7eb0dc50cf8', 'photo-1588166524941-3bf61a9c41db',
    'photo-1631452180519-c014fe946bc7', 'photo-1710091691771-96b2e6d17dac', 'photo-1707448829764-9474458021ed',
    'photo-1613292443284-8d10ef9383fe'],
  shawarma: ['photo-1662116765994-1e4200c43589', 'photo-1719282431565-3b30bb7d2658', 'photo-1699728088614-7d1d4277414b',
    'photo-1583060095186-852adde6b819', 'photo-1684864115205-242c064363e6', 'photo-1530469912745-a215c6b256ea',
    'photo-1676300187013-7540d4e9440d', 'photo-1583665354191-634609954d54', 'photo-1529006557810-274b9b2fc783'],
  fried_chicken: ['photo-1569058242253-92a9c755a0ec', 'photo-1638439430466-b2bb7fdc1d67', 'photo-1562967916-eb82221dfb92',
    'photo-1586793783658-261cddf883ef', 'photo-1694853651800-3e9b4aa96a42', 'photo-1585703900468-13c7a978ad86',
    'photo-1426869981800-95ebf51ce900', 'photo-1562967914-608f82629710', 'photo-1600555379765-f82335a7b1b0'],
  burgers: ['photo-1568901346375-23c9450c58cd', 'photo-1586190848861-99aa4a171e90', 'photo-1572802419224-296b0aeee0d9',
    'photo-1610440042657-612c34d95e9f', 'photo-1571091718767-18b5b1457add', 'photo-1603064752734-4c48eff53d05',
    'photo-1607013251379-e6eecfffe234', 'photo-1530554764233-e79e16c91d08', 'photo-1549611016-3a70d82b5040'],
  middle_eastern: ['photo-1555939594-58d7cb561ad1', 'photo-1511690656952-34342bb7c2f2', 'photo-1612569188733-05e38c694a0a',
    'photo-1547516453-01c9910aafbf', 'photo-1623065492741-5cf3690b4535', 'photo-1697126248475-a537cc5cce28'],
  bakery: ['photo-1604908552986-eb22824b2150', 'photo-1604908464937-12bf0fa8d4b6', 'photo-1571157577110-493b325fdd3d',
    'photo-1695217682346-c03f0a540806', 'photo-1643551620454-0bd8f58487c0', 'photo-1710971694277-d734d8acb88c'],
  grill: ['photo-1588168333986-5078d3ae3976', 'photo-1508615263227-c5d58c1e5821', 'photo-1558030089-02acba3c214e',
    'photo-1529692236671-f1f6cf9683ba', 'photo-1558030006-450675393462', 'photo-1627947063935-55577ec3c2e1',
    'photo-1616252980327-ec70572e5df9', 'photo-1614119068601-483274e9dcb7'],
};

// Removed after reading titles: a pub photo and raw kofta.
const REJECT_TITLES = [/Queens Head and Artichoke/i, /Chelo Kabab Raw/i];

const chosen = JSON.parse(readFileSync(cachePath('image-chosen.json'), 'utf8'));
const manifest = {};

for (const [bucket, ids] of Object.entries(UNSPLASH)) {
  manifest[bucket] = ids.map((id) => ({ src: `https://images.unsplash.com/${id}?w=960&h=720&fit=crop&q=70`, source: 'unsplash' }));
}

const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\x00-\x7f]/g, '').replace(/\.[a-z]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
let uploaded = 0;
for (const [bucket, list] of Object.entries(chosen)) {
  manifest[bucket] = manifest[bucket] || [];
  for (const c of list) {
    if (REJECT_TITLES.some((re) => re.test(c.title))) continue;
    const path = `representative/${bucket}/${slug(c.title) || 'image'}.webp`;
    let body = null;
    for (let attempt = 1; attempt <= 4 && !body; attempt++) {
      try {
        const res = await fetch(c.thumb, { headers: { 'user-agent': UA } });
        if (res.ok) body = Buffer.from(await res.arrayBuffer());
        else if (res.status === 404) break;
      } catch { /* retried below */ }
      if (!body) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
    if (!body) { console.log(`skip ${c.title}`); continue; }
    const webp = await sharp(body).rotate().resize(960, 720, { fit: 'cover', position: 'attention' }).webp({ quality: 72 }).toBuffer();
    const { error } = await sb.storage.from(BUCKET).upload(path, webp, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });
    if (error) throw new Error(`${path}: ${error.message}`);
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    manifest[bucket].push({
      src: data.publicUrl,
      source: 'wikimedia',
      title: c.title.replace(/\.(jpe?g|png|webp)$/i, ''),
      author: /no machine-readable|unknown/i.test(c.artist) ? null : c.artist.replace(/^This image was taken by\s*/i, '').slice(0, 60),
      licence: c.licence,
      licenceUrl: c.licenceUrl,
      page: c.page,
    });
    uploaded++;
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log(`${bucket}: ${manifest[bucket].length}`);
}

writeFileSync(new URL('../../lib/representative-images.json', import.meta.url), JSON.stringify(manifest, null, 1) + '\n');
console.log(`uploaded ${uploaded}; buckets ${Object.keys(manifest).length}`);
