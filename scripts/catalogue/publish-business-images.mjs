// Publishes the pictures find-business-images.mjs found on restaurants' own
// websites.
//
//   node publish-business-images.mjs           print the plan
//   node publish-business-images.mjs --apply   download, resize, store, attach
//
// Each image is downloaded once, checked, resized to 960x720 WebP and stored in
// our own bucket, then attached to every listing that shares that website. It
// is stored rather than hotlinked so a page does not depend on someone else's
// server staying up, and so a 2MB hero shot is not sent to a phone.
//
// Storage tells the two kinds apart, because the site renders them differently:
//   business/<host>/<name>.webp        a photograph, cropped to fill
//   business-logo/<host>/<name>.webp   a logo, shown whole on white
//
// Every row records the page the image came from, so any of them can be traced
// and removed on request. Nothing here touches halal evidence or labels.

import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { cachePath, readJsonl } from './lib.mjs';

const APPLY = process.argv.includes('--apply');
const LIMIT = Number(process.env.LIMIT || 0);

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BUCKET = 'restaurant-photos';
const PUBLIC = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const UA = 'YepItsHalalBot/1.0 (+https://yepitshalal.com; restaurant listing images)';

const IN = cachePath('business-images.jsonl');
if (!existsSync(IN)) throw new Error('No business-images.jsonl. Run find-business-images.mjs first.');

// A stopped and resumed crawl can write a host twice. Keep the attempt that
// found something.
const byHost = new Map();
for (const r of readJsonl(IN)) {
  if (!byHost.has(r.host) || (r.image && !byHost.get(r.host).image)) byHost.set(r.host, r);
}
const found = [...byHost.values()].filter((r) => r.image && r.places?.length);
console.log(`${found.length} sites with an image, covering ${found.reduce((n, r) => n + r.places.length, 0)} listings`);

// Which listings already have a photo of their own: never overwrite one a real
// person uploaded, and never add a second on a re-run.
const taken = new Set();
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb
    .from('restaurant_photos')
    .select('restaurant_id, storage_path')
    .range(from, from + 999);
  if (error) throw new Error(error.message);
  for (const row of data) {
    if (!row.storage_path.includes('/representative/') && !row.storage_path.includes('images.unsplash.com')) {
      taken.add(row.restaurant_id);
    }
  }
  if (data.length < 1000) break;
}
console.log(`${taken.size} listings already have a photo of their own`);

const slug = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\x00-\x7f]/g, '').replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'image';

async function download(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'image/*' },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return { error: `http ${res.status}` };
  const type = res.headers.get('content-type') || '';
  if (!/^image\//i.test(type)) return { error: `not an image (${type.slice(0, 30)})` };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 12_000_000) return { error: 'too big' };
  return { buf };
}

let stored = 0;
let attached = 0;
let skipped = 0;
const problems = [];

const queue = LIMIT ? found.slice(0, LIMIT) : found;

for (const site of queue) {
  const places = site.places.filter((id) => !taken.has(id));
  if (!places.length) { skipped++; continue; }

  const { buf, error } = await download(site.image);
  if (error) { problems.push([site.host, error]); continue; }

  let image;
  try {
    image = sharp(buf, { animated: false });
    const meta = await image.metadata();
    // A tracking pixel, a sliver, or a 2000x40 banner is not a picture of a
    // restaurant. A logo is allowed to be small and square.
    const ratio = (meta.width || 1) / (meta.height || 1);
    if (site.kind === 'logo') {
      if ((meta.width || 0) < 64 || (meta.height || 0) < 64) { problems.push([site.host, `logo too small ${meta.width}x${meta.height}`]); continue; }
    } else {
      if ((meta.width || 0) < 400 || (meta.height || 0) < 260) { problems.push([site.host, `too small ${meta.width}x${meta.height}`]); continue; }
      if (ratio > 3.2 || ratio < 0.4) { problems.push([site.host, `odd shape ${meta.width}x${meta.height}`]); continue; }
    }
  } catch (e) {
    problems.push([site.host, `unreadable: ${String(e?.message || e).slice(0, 40)}`]);
    continue;
  }

  const prefix = site.kind === 'logo' ? 'business-logo' : 'business';
  const path = `${prefix}/${slug(site.host)}/${slug(new URL(site.image).pathname.split('/').pop() || 'image')}.webp`;

  if (!APPLY) {
    stored++;
    attached += places.length;
    if (stored <= 12) console.log(`  ${site.kind.padEnd(5)} ${site.host.slice(0, 32).padEnd(34)} -> ${places.length} listing(s)`);
    continue;
  }

  const out = site.kind === 'logo'
    // Logos keep their shape and their transparency; they are padded on the
    // page, not here, so one does not end up stretched into a food photo.
    ? await sharp(buf).resize(480, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer()
    : await sharp(buf).resize(960, 720, { fit: 'cover', position: 'attention' }).webp({ quality: 78 }).toBuffer();

  const up = await sb.storage.from(BUCKET).upload(path, out, { contentType: 'image/webp', upsert: true });
  if (up.error) { problems.push([site.host, `upload: ${up.error.message}`]); continue; }
  stored++;

  const rows = places.map((restaurant_id) => ({
    restaurant_id,
    storage_path: PUBLIC + path,
    type: site.kind === 'logo' ? 'exterior' : 'food',
    is_primary: true,
    is_logo: site.kind === 'logo',
    source_url: site.pageUrl || `https://${site.host}/`,
    source_site: site.host,
  }));
  const ins = await sb.from('restaurant_photos').insert(rows);
  if (ins.error) { problems.push([site.host, `insert: ${ins.error.message}`]); continue; }
  attached += rows.length;
  if (stored % 50 === 0) console.log(`  ${stored} images stored, ${attached} listings`);
}

console.log(`\n${APPLY ? 'stored' : 'would store'} ${stored} images across ${attached} listings`);
console.log(`${skipped} sites skipped (their listings already have a photo)`);
if (problems.length) {
  console.log(`\n${problems.length} could not be used:`);
  for (const [host, why] of problems.slice(0, 25)) console.log(`  ${host.slice(0, 34).padEnd(36)} ${why}`);
}
if (!APPLY) console.log('\nNothing was written. Re-run with --apply.');
