// Finds openly licensed food photos for representative images, one pool per
// kind of food, from the Wikimedia Commons API. It only proposes: every image
// was then looked at by a person, and only the ones kept are listed in
// lib/representativeImages.ts in the app. Nothing here is downloaded.
//
//   node find-representative-images.mjs    writes .cache/image-candidates.json
//
// Filtered out before anyone looks: anything whose title mentions pork, bacon,
// ham, sausage, alcohol and similar; small images; portrait images; licences
// that are not CC0, public domain, CC BY or CC BY-SA.

import { writeFileSync } from 'node:fs';
import { cachePath } from './lib.mjs';

const UA = 'YepItsHalalBot/1.0 (https://yepitshalal.com; finding openly licensed food photos)';

export const QUERIES = {
  curry: ['chicken karahi', 'chicken tikka masala', 'lamb curry dish', 'dal tadka'],
  biryani: ['chicken biryani', 'hyderabadi biryani'],
  kebab: ['doner kebab', 'adana kebab', 'shish kebab plate'],
  shawarma: ['chicken shawarma', 'shawarma wrap'],
  middle_eastern: ['mezze platter', 'mandi rice', 'hummus plate'],
  persian: ['chelow kabab', 'joojeh kabab'],
  afghan: ['kabuli palaw', 'mantu afghan'],
  moroccan: ['moroccan tajine', 'couscous with vegetables'],
  turkish: ['lahmacun', 'turkish pide'],
  african: ['jollof rice', 'suya meat', 'injera dish'],
  caribbean: ['jerk chicken', 'rice and peas caribbean', 'curry goat'],
  central_asian: ['uzbek plov', 'manti dumplings'],
  balkan: ['cevapi'],
  malaysian: ['nasi lemak', 'chicken satay'],
  chinese: ['chow mein', 'kung pao chicken', 'egg fried rice'],
  indo_chinese: ['chilli chicken indo chinese', 'hakka noodles'],
  thai: ['thai green curry', 'pad thai'],
  japanese: ['salmon sushi', 'chicken katsu curry'],
  korean: ['bibimbap', 'korean fried chicken'],
  pizza: ['pizza margherita', 'vegetable pizza'],
  italian: ['spaghetti al pomodoro', 'penne arrabbiata'],
  mediterranean: ['greek salad', 'falafel plate'],
  fish_and_chips: ['fish and chips'],
  burgers: ['cheeseburger', 'chicken burger'],
  fried_chicken: ['fried chicken', 'chicken wings'],
  grill: ['grilled lamb chops', 'mixed grill platter', 'grilled chicken plate'],
  desserts: ['kunafa', 'waffle with ice cream', 'gulab jamun', 'baklava'],
  bakery: ['mithai sweets', 'bread bakery display'],
  cafe: ['cappuccino cup', 'breakfast plate eggs toast'],
  sandwiches: ['falafel wrap', 'chicken wrap sandwich'],
};

const BANNED = /pork|bacon|\bham\b|sausage|salami|pepperoni|prosciutto|chorizo|lard|char[ _-]?siu|babi|\bpig\b|piglet|wine|beer|lager|cocktail|whisky|vodka|\bbar\b|pub\b|alcohol|sake|soju|chashu|tonkotsu|lechon|schnitzel/i;
const LICENCE_OK = /^(cc0|public domain|pd|cc by(-sa)? [\d.]+|cc by(-sa)?)$/i;

async function search(query) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query', generator: 'search', gsrnamespace: '6', gsrsearch: `${query} filetype:bitmap`, gsrlimit: '25',
    prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '960', format: 'json',
  }).toString();
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`commons ${res.status}`);
  const json = await res.json();
  return Object.values(json.query?.pages || {});
}

const strip = (html) => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const out = {};
for (const [bucket, queries] of Object.entries(QUERIES)) {
  const seen = new Set();
  out[bucket] = [];
  for (const q of queries) {
    for (const p of await search(q)) {
      const info = p.imageinfo?.[0];
      if (!info || seen.has(p.title)) continue;
      seen.add(p.title);
      const meta = info.extmetadata || {};
      const licence = strip(meta.LicenseShortName?.value);
      const ratio = info.width / info.height;
      if (BANNED.test(p.title) || BANNED.test(strip(meta.ImageDescription?.value))) continue;
      if (!LICENCE_OK.test(licence)) continue;
      if (info.width < 900 || ratio < 1.15 || ratio > 2.1) continue;
      if (!/jpeg|png|webp/.test(info.mime)) continue;
      out[bucket].push({
        title: p.title.replace(/^File:/, ''),
        thumb: info.thumburl,
        page: info.descriptionurl,
        licence,
        licenceUrl: meta.LicenseUrl?.value || null,
        artist: strip(meta.Artist?.value).slice(0, 80) || 'Unknown',
        width: info.width,
        height: info.height,
      });
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  out[bucket] = out[bucket].slice(0, 14);
  console.log(`${bucket}: ${out[bucket].length}`);
}
writeFileSync(cachePath('image-candidates.json'), JSON.stringify(out, null, 2));
