// Shared helpers for the catalogue pipeline. Pure functions only: no network,
// no database, so every step that uses them is reproducible from the cache.

import { readFileSync } from 'node:fs';

export const CACHE = new URL('./.cache/', import.meta.url);
export const cachePath = (file) => new URL(file, CACHE);

// --- Geography ---------------------------------------------------------------

const EARTH_M = 6371008.8;
const rad = (d) => (d * Math.PI) / 180;

export function metersBetween(aLat, aLng, bLat, bLng) {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(h));
}

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

let boroughIndex = null;

function shortBoroughName(name) {
  if (name === 'City of Westminster') return 'Westminster';
  return name.replace(/^(London Borough of|Royal Borough of) /, '');
}

/**
 * The London borough containing a point, or null outside Greater London.
 * Uses the real OSM boundaries rather than a bounding rectangle, which also
 * takes in slices of Hertfordshire, Essex, Kent and Surrey.
 */
export function boroughAt(lat, lng) {
  if (!boroughIndex) {
    const fc = JSON.parse(readFileSync(cachePath('boroughs.geojson'), 'utf8'));
    boroughIndex = fc.features.map((f) => ({
      name: shortBoroughName(f.properties.name),
      bbox: f.bbox,
      polygons: f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates,
    }));
  }
  for (const b of boroughIndex) {
    const [minX, minY, maxX, maxY] = b.bbox;
    if (lng < minX || lng > maxX || lat < minY || lat > maxY) continue;
    for (const poly of b.polygons) {
      if (inRing(lng, lat, poly[0]) && !poly.slice(1).some((hole) => inRing(lng, lat, hole))) {
        return b.name;
      }
    }
  }
  return null;
}

/** ~100 m cells, so a neighbourhood search only ever looks at nine buckets. */
export function cellKey(lat, lng) {
  return `${Math.floor(lat / 0.001)}:${Math.floor(lng / 0.0015)}`;
}

export function neighbourKeys(lat, lng) {
  const a = Math.floor(lat / 0.001);
  const b = Math.floor(lng / 0.0015);
  const keys = [];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) keys.push(`${a + i}:${b + j}`);
  return keys;
}

// --- Names -------------------------------------------------------------------

// Words that describe the kind of place rather than which place it is. Two
// records named "Lahore Kebab House" and "Lahore Kebab House Ltd" are the same
// business; the suffix is noise for matching, not for display.
const NAME_NOISE = new Set([
  'ltd', 'limited', 'plc', 'llp', 'the', 'and', 'co', 'uk', 'london',
  'restaurant', 'restaurants', 'cafe', 'caffe', 'takeaway', 'take', 'away',
]);

export function normaliseName(raw) {
  if (!raw) return '';
  let t = String(raw).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  // "X Ltd t/a Y": the name on the door is the part after "trading as".
  const parts = t.split(/\bt\/a\b|\btrading as\b/);
  if (parts.length > 1 && parts[parts.length - 1].trim()) t = parts[parts.length - 1];
  t = t.replace(/&/g, ' and ').replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  return t
    .split(' ')
    .filter((w) => w && !NAME_NOISE.has(w))
    .join(' ');
}

/**
 * FSA registrations often list several trading names at one kitchen:
 * "Famous Pizza / Tasty Noodles / Halal Chinese". Each is a separate candidate
 * name for matching, never one merged name.
 */
export function splitTradingNames(raw) {
  if (!raw) return [];
  const t = String(raw);
  const pieces = t.split(/\s+\/\s+|\s*,\s*|\s+\|\s+/).map((s) => s.trim()).filter(Boolean);
  return pieces.length > 1 ? pieces : [t.trim()];
}

function bigrams(s) {
  const x = s.replace(/ /g, '');
  const m = new Map();
  for (let i = 0; i < x.length - 1; i++) {
    const g = x.slice(i, i + 2);
    m.set(g, (m.get(g) || 0) + 1);
  }
  return m;
}

/** 0..1. Normalised names in, so "Nando's" and "Nandos" already agree. */
export function nameSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return 0.9;
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  let total = 0;
  for (const v of A.values()) total += v;
  for (const v of B.values()) total += v;
  for (const [g, v] of A) {
    const w = B.get(g);
    if (w) inter += Math.min(v, w);
  }
  return total ? (2 * inter) / total : 0;
}

// --- Contact details -----------------------------------------------------------

/** Last ten digits of a UK number, so "+44 20 7247 9543" and "020 7247 9543" agree. */
export function phoneKey(raw) {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, '');
  if (d.startsWith('44')) d = '0' + d.slice(2);
  return d.length >= 10 ? d.slice(-10) : null;
}

// Pages about a restaurant that the restaurant does not control, or whose terms
// forbid automated reading. Neither is first-party evidence of what it serves.
const NOT_FIRST_PARTY = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com',
  'linktr.ee', 'just-eat.co.uk', 'just-eat.com', 'deliveroo.co.uk', 'ubereats.com',
  'tripadvisor.co.uk', 'tripadvisor.com', 'yelp.co.uk', 'yelp.com', 'google.com', 'goo.gl',
  'g.page', 'maps.app.goo.gl', 'foodhub.co.uk', 'flipdish.com', 'kukd.com', 'hungryhouse.co.uk',
  'menulog.com.au', 'order.yoyo.com', 'orderyoyo.com', 'slerp.com', 'touch2success.com',
  'opentable.co.uk', 'opentable.com', 'resy.com', 'sevenrooms.com', 'thefork.co.uk',
  'squaremeal.co.uk', 'timeout.com', 'wa.me', 'whatsapp.com', 'booking.com', 'amazon.co.uk',
  // Directories and ordering platforms that surfaced as "websites" in place data.
  'allinlondon.co.uk', 'chefonline.co.uk', 'restaurantguru.com', 'zabihah.com', 'halalgems.com',
  'order2eat.co.uk', 'orderinn-portal.co.uk', 'beginorder.com', 'yell.com', 'cylex-uk.co.uk',
  'happycow.net', 'wanderlog.com', 'foursquare.com', 'menupix.com', 'sluurpy.co.uk', 'top-rated.online',
  'freeindex.co.uk', 'thomsonlocal.com', 'scoot.co.uk', '192.com', 'hungrypanda.co',
];

export function websiteHost(raw) {
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!host.includes('.')) return null;
    if (NOT_FIRST_PARTY.some((d) => host === d || host.endsWith(`.${d}`))) return null;
    return host;
  } catch {
    return null;
  }
}

// Words too common in restaurant names to show that a website is this
// restaurant's: "Chicken Inn" on chickencottage.com is somebody else's site.
const GENERIC_NAME_WORDS = new Set([
  'chicken', 'chickens', 'pizza', 'pizzas', 'grill', 'grills', 'kebab', 'kebabs', 'burger', 'burgers', 'food', 'foods',
  'kitchen', 'house', 'express', 'bar', 'lounge', 'halal', 'indian', 'chinese', 'spice', 'spices', 'tandoori',
  'fried', 'fast', 'best', 'king', 'kings', 'royal', 'taste', 'street', 'city', 'new', 'bakery', 'sweets', 'shop',
  'market', 'eats', 'meze', 'mangal', 'peri', 'wings', 'bbq', 'fish', 'chips', 'coffee', 'tea', 'dessert',
  'desserts', 'noodle', 'noodles', 'sushi', 'thai', 'turkish', 'lebanese', 'persian', 'pakistani', 'bangladeshi',
  'curry', 'biryani', 'shawarma', 'doner', 'express', 'corner', 'original', 'famous', 'star', 'golden', 'hut',
  'station', 'place', 'central', 'garden', 'brasserie', 'bistro', 'deli', 'diner', 'club', 'hall', 'foodhall',
  'grand', 'palace', 'village', 'point', 'plus', 'one', 'two', 'inn', 'pub', 'tavern', 'hotel', 'room', 'rooms',
]);
const HOST_SUFFIX_LABELS = new Set(['www', 'co', 'uk', 'com', 'org', 'net', 'london', 'io', 'app', 'site', 'online', 'shop', 'store', 'info', 'biz', 'me', 'eu', 'restaurant', 'menu', 'order', 'orders']);

/**
 * Does this website plausibly belong to a business with one of these names?
 * Map data sometimes gives a place the website of the business next door or of
 * the building it sits in (a concession in Selfridges with Tonkotsu's site), and
 * that site's halal statement is not about this place.
 *
 *   "Afrikana" and afrikanakitchen.com         yes, the name is in the address
 *   "Oka Marylebone" and okarestaurant.co.uk   yes, a distinctive word of the name
 *   "Beans & Beyond" and bbcafe.co.uk          yes, the initials
 *   "Harry Gordon's Bar" and tonkotsu.co.uk    no
 *   "Chicken Inn" and chickencottage.com       no, only a generic word is shared
 */
export function hostMatchesName(host, names) {
  if (!host) return false;
  const fullHost = host.split('.').filter((l) => !HOST_SUFFIX_LABELS.has(l)).join('').replace(/[^a-z0-9]/g, '');
  if (!fullHost) return false;
  // "thebbq-express" is "bbqexpress" as far as a name goes.
  const hosts = [...new Set([fullHost, fullHost.replace(/^the/, '')])].filter((h) => h.length >= 3);
  const inHost = (s) => hosts.some((h) => h.includes(s));
  for (const raw of names) {
    const n = normaliseName(raw);
    if (!n) continue;
    // "Fitou's" is written "fitou" in its web address.
    const words = n.split(' ').flatMap((w) => (/s$/.test(w) && w.length > 4 ? [w, w.slice(0, -1)] : [w]));
    const squashed = n.replace(/ /g, '');
    // With "&" spelt out and nothing dropped: "HS & Co" is hsandco, "The 71" is the71.
    const literal = String(raw).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
    if (squashed.length >= 4 && inHost(squashed)) return true;
    if (literal.length >= 4 && inHost(literal)) return true;
    if (hosts.some((h) => h.length >= 5 && (squashed.includes(h) || literal.includes(h)))) return true;
    // "EL&N" is eln, at the start of elnlondon.
    if (squashed.length === 3 && hosts.some((h) => h.startsWith(squashed))) return true;
    if (words.some((w) => w.length >= 3 && !GENERIC_NAME_WORDS.has(w) && (!/^\d+$/.test(w) || w.length >= 3) && inHost(w))) return true;
    const tokens = String(raw).toLowerCase().replace(/&/g, ' ').split(/[^a-z0-9]+/).filter(Boolean);
    for (const skip of [['the', 'and', 'of', 'ltd', 'limited', 'by'], ['and', 'of', 'ltd', 'limited', 'by']]) {
      const initials = tokens.filter((w) => !skip.includes(w)).map((w) => w[0]).join('');
      if (initials.length >= 2 && hosts.some((h) => h.startsWith(initials))) return true;
    }
  }
  return false;
}

/**
 * Centre point of each UK postcode, from postcodes.io (ONS data, OGL), looked up
 * 100 at a time. Keys are postcodes without spaces, upper case; unknown
 * postcodes map to null.
 */
export async function postcodeCentroids(postcodes) {
  const keys = [...new Set(postcodes.filter(Boolean).map((p) => String(p).toUpperCase().replace(/\s+/g, '')))];
  const out = new Map();
  for (let i = 0; i < keys.length; i += 100) {
    const res = await fetch('https://api.postcodes.io/postcodes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'YepItsHalalBot/1.0 (+https://yepitshalal.com)' },
      body: JSON.stringify({ postcodes: keys.slice(i, i + 100) }),
    });
    if (!res.ok) throw new Error(`postcodes.io ${res.status}`);
    for (const r of (await res.json()).result) {
      const key = r.query.toUpperCase().replace(/\s+/g, '');
      out.set(key, r.result ? { lat: r.result.latitude, lng: r.result.longitude, region: r.result.region } : null);
    }
  }
  return out;
}

export const postcodeKey = (p) => (p ? String(p).toUpperCase().replace(/\s+/g, '') : null);

export function websiteUrl(raw) {
  const host = websiteHost(raw);
  if (!host) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function readJsonl(path) {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

// --- Opening hours (OpenStreetMap syntax) -----------------------------------------------

const OSM_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Parse the common subset of OSM opening_hours into rows of
 * { day_of_week (0 = Sunday), open_time, close_time }.
 *
 *   "Mo-Su 11:00-23:00"
 *   "Mo-Th 12:00-22:00; Fr,Sa 12:00-23:30; Su off"
 *   "Mo-Fr 11:30-14:30,17:30-23:00"
 *   "24/7"
 *
 * Returns null for anything outside that subset (public holidays, months, week
 * numbers, sunrise, comments, fallback rules). Wrong hours are worse than none:
 * someone crosses London to a closed door. Unparsed means not imported.
 */
export function parseOsmOpeningHours(raw) {
  if (!raw) return null;
  const text = String(raw).trim();
  if (text === '24/7') {
    return [0, 1, 2, 3, 4, 5, 6].map((d) => ({ day_of_week: d, open_time: '00:00', close_time: '24:00' }));
  }
  if (/PH|SH|week|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|sunrise|sunset|dawn|dusk|"|\|\||\[|\bopen\b|unknown|easter|\+/.test(text)) {
    return null;
  }

  const rows = new Map(); // day -> array of periods, later rules for a day replace earlier ones
  for (const rule of text.split(';').map((r) => r.trim()).filter(Boolean)) {
    const m = rule.match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*-\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:\s*,\s*(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*-\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)\s+(.+)$/);
    if (!m) return null;
    const days = new Set();
    for (const part of m[1].split(',').map((p) => p.trim())) {
      const [a, b] = part.split('-').map((p) => p.trim());
      const ia = OSM_DAYS.indexOf(a);
      const ib = b ? OSM_DAYS.indexOf(b) : ia;
      if (ia < 0 || ib < 0) return null;
      // Ranges run Monday-first and can wrap: "Fr-Mo" is Fri, Sat, Sun, Mon.
      const order = [1, 2, 3, 4, 5, 6, 0];
      let i = order.indexOf(ia);
      const end = order.indexOf(ib);
      for (let guard = 0; guard < 7; guard++) {
        days.add(order[i]);
        if (i === end) break;
        i = (i + 1) % 7;
      }
    }
    const spec = m[2].trim();
    if (/^(off|closed)$/i.test(spec)) {
      for (const d of days) rows.set(d, []);
      continue;
    }
    const periods = [];
    for (const range of spec.split(',').map((r) => r.trim())) {
      const t = range.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
      if (!t) return null;
      const [oh, om, ch, cm] = t.slice(1).map(Number);
      if (oh > 24 || ch > 48 || om > 59 || cm > 59) return null;
      // "12:00-26:00" is OSM for 2am the next day; our model already reads a
      // close time before the open time as past midnight.
      const closeH = ch >= 24 && !(ch === 24 && cm === 0) ? ch - 24 : ch;
      const pad = (n) => String(n).padStart(2, '0');
      periods.push({ open_time: `${pad(oh)}:${pad(om)}`, close_time: `${pad(closeH)}:${pad(cm)}` });
    }
    for (const d of days) rows.set(d, periods);
  }

  const out = [];
  for (const [d, periods] of rows) for (const p of periods) out.push({ day_of_week: d, ...p });
  return out.length ? out : null;
}
