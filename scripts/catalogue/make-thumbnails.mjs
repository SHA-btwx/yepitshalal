// Makes the small copy of every picture the site shows in a list.
//
//   node make-thumbnails.mjs           count what is missing
//   node make-thumbnails.mjs --apply   make and upload them
//
// Why this exists: Vercel's image optimiser allows a fixed number of distinct
// source images a month, and this catalogue blew through it the day restaurants
// started supplying their own pictures. Past the limit it answers 402 and every
// card on the site is a grey tile.
//
// So the site stops asking it to resize our own images. We keep two copies of
// each: the one we already store (960x720, for a page header) and a thumbnail
// (320x240, about 15KB, for a card). Both are served straight from storage,
// which has no such limit and is already paid for by the same free tier.
//
// Idempotent: a thumbnail that exists is left alone, so this can be re-run
// after every publish-business-images run.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const APPLY = process.argv.includes('--apply');

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

/** Every object under a prefix, following one level of folders. */
async function listAll(prefix) {
  const out = [];
  const folders = [prefix];
  while (folders.length) {
    const folder = folders.shift();
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await sb.storage.from(BUCKET).list(folder, { limit: 100, offset });
      if (error) throw new Error(`${folder}: ${error.message}`);
      for (const item of data) {
        // A folder comes back with no id.
        if (!item.id) folders.push(`${folder}/${item.name}`);
        else out.push(`${folder}/${item.name}`);
      }
      if (data.length < 100) break;
    }
  }
  return out;
}

const sources = (
  await Promise.all([listAll('representative'), listAll('business'), listAll('business-logo')])
).flat();
const existing = new Set((await listAll('thumb')).map((p) => p.replace(/^thumb\//, '')));
const todo = sources.filter((p) => !existing.has(p));

console.log(`${sources.length} pictures, ${existing.size} thumbnails already made, ${todo.length} to do`);
if (!APPLY) {
  console.log('Nothing was written. Re-run with --apply.');
  process.exit(0);
}

let made = 0;
const problems = [];
for (const path of todo) {
  try {
    const res = await fetch(PUBLIC + path, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) { problems.push([path, `http ${res.status}`]); continue; }
    const buf = Buffer.from(await res.arrayBuffer());

    // A logo keeps its whole shape and its transparency; a photograph is
    // cropped to the card's square-ish box.
    const out = path.startsWith('business-logo/')
      ? await sharp(buf).resize(320, 320, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
      : await sharp(buf).resize(320, 240, { fit: 'cover', position: 'attention' }).webp({ quality: 72 }).toBuffer();

    const up = await sb.storage.from(BUCKET).upload(`thumb/${path}`, out, { contentType: 'image/webp', upsert: true });
    if (up.error) { problems.push([path, up.error.message]); continue; }
    made++;
    if (made % 100 === 0) console.log(`  ${made}/${todo.length}`);
  } catch (err) {
    problems.push([path, String(err?.message || err).slice(0, 50)]);
  }
}

console.log(`\nmade ${made} thumbnails`);
if (problems.length) {
  console.log(`${problems.length} failed:`);
  for (const [p, why] of problems.slice(0, 15)) console.log(`  ${p.slice(0, 60).padEnd(62)} ${why}`);
}
