// Finds the picture a restaurant already publishes of itself.
//
//   node find-business-images.mjs            every site we have not tried yet
//   HOSTS=shahshalalfood.co.uk node ...      one site, for checking
//   LIMIT=200 node ...                       a slice, for a first look
//
// A place with no photo of its own currently shows a labelled example of the
// kind of food it serves. That is honest but it is not the restaurant. Most of
// these places publish a picture of themselves on their own website, in the
// tag that exists so other sites can show it: og:image, the one Facebook and
// WhatsApp use for a link preview.
//
// Rules, which are the same ones the evidence crawler follows:
//   - Only the restaurant's own website. Never Google, Yelp, Tripadvisor or a
//     delivery app: their terms forbid it, and websiteHost() drops them.
//   - robots.txt is fetched and obeyed, for YepItsHalalBot and for "*".
//   - The site has to belong to this restaurant (hostMatchesName), so a
//     neighbour's site never puts its photo on somebody else's listing.
//   - One request per site. This is not a crawl.
//
// What it takes, best first:
//   og:image, twitter:image      a picture chosen for sharing. Usually the food.
//   schema.org image             the same idea, in JSON-LD.
//   a big <img> in the header    a hero shot, when there are no meta tags.
//   apple-touch-icon             the logo. Not a photo, and marked as a logo so
//                                the site can show it on a plain background.
//
// Output: .cache/business-images.jsonl, one line per host, resumable.
// Publishing is a separate step: publish-business-images.mjs.

import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { cachePath, websiteHost, hostMatchesName, readJsonl } from './lib.mjs';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const USER_AGENT = 'YepItsHalalBot/1.0 (+https://yepitshalal.com; restaurant listing images)';
const TIMEOUT_MS = 12000;
const MAX_BYTES = 400_000;
const CONCURRENCY = Number(process.env.CONCURRENCY || 10);
const LIMIT = Number(process.env.LIMIT || 0);
const ONLY = process.env.HOSTS ? process.env.HOSTS.split(',').map((h) => h.trim()) : null;
const OUT = cachePath('business-images.jsonl');

// Node's fetch can throw an internal assertion from a socket event that no
// try/catch around the await can see. One bad host must not end the run.
process.on('uncaughtException', (err) => {
  console.error('ignored:', String(err?.message || err).slice(0, 120));
});

// --- what to fetch ---------------------------------------------------------

const { data: places, error } = await (async () => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await sb
      .from('restaurants')
      .select('id, name, slug, website_url, brand_id')
      .eq('is_searchable', true)
      .not('website_url', 'is', null)
      .order('id')
      .range(from, from + 999);
    if (res.error) return { error: res.error };
    rows.push(...res.data);
    if (res.data.length < 1000) break;
  }
  return { data: rows };
})();
if (error) throw new Error(error.message);

const byHost = new Map();
for (const p of places) {
  const host = websiteHost(p.website_url);
  if (!host) continue;
  // The site has to be this restaurant's own. Borrowed websites are how a
  // Selfridges bar ended up with Tonkotsu's halal statement; the same mistake
  // with a photo would put the wrong shopfront on a listing.
  if (!hostMatchesName(host, [p.name])) continue;
  if (!byHost.has(host)) byHost.set(host, { host, url: p.website_url, places: [] });
  byHost.get(host).places.push(p.id);
}

// RETRY=1 goes back over the sites that gave us nothing. Worth doing after the
// extractor improves, and because a good share of the failures are weather: a
// DNS lookup that timed out, a server that hung up, a certificate that has
// since been renewed. Sites that said no in robots.txt are never retried.
const RETRY = process.env.RETRY === '1';
const done = new Set();
const empty = new Set();
if (existsSync(OUT)) {
  for (const r of readJsonl(OUT)) {
    done.add(r.host);
    if (!r.image && !r.blocked) empty.add(r.host);
    else empty.delete(r.host);
  }
}

let queue = [...byHost.values()].filter((h) => (RETRY ? empty.has(h.host) : !done.has(h.host)));
if (ONLY) queue = [...byHost.values()].filter((h) => ONLY.includes(h.host));
if (LIMIT) queue = queue.slice(0, LIMIT);
console.log(
  `sites ${byHost.size}, already tried ${done.size}, ${empty.size} gave nothing, to try ${queue.length}${RETRY ? ' (retry)' : ''}`
);

// --- http ------------------------------------------------------------------

async function get(url, accept = 'text/html') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT, accept, 'accept-language': 'en-GB,en;q=0.8' },
    });
    const type = res.headers.get('content-type') || '';
    if (!/html|xml|text\/plain/i.test(type)) return { status: res.status, finalUrl: res.url, body: '' };
    const reader = res.body?.getReader();
    const chunks = [];
    let received = 0;
    if (reader) {
      for (;;) {
        const { done: end, value } = await reader.read();
        if (end) break;
        received += value.byteLength;
        chunks.push(value);
        if (received > MAX_BYTES) { controller.abort(); break; }
      }
    }
    return { status: res.status, finalUrl: res.url, body: Buffer.concat(chunks.map(Buffer.from)).toString('utf8') };
  } catch (err) {
    return { status: 0, error: String(err?.cause?.code || err?.name || err).slice(0, 60) };
  } finally {
    clearTimeout(timer);
  }
}

function robotsRules(text) {
  const groups = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const field = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();
    if (field === 'user-agent') {
      if (!current || current.rules.length) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
    } else if ((field === 'disallow' || field === 'allow') && current) {
      current.rules.push({ allow: field === 'allow', path: value });
    }
  }
  const mine = groups.find((g) => g.agents.some((a) => a.includes('yepitshalalbot')));
  const star = groups.find((g) => g.agents.includes('*'));
  return (mine || star)?.rules || [];
}

function allowed(rules, pathname) {
  let best = null;
  for (const r of rules) {
    if (!r.path && !r.allow) continue;
    const pattern = r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const anchored = pattern.endsWith('\\$') ? `^${pattern.slice(0, -2)}$` : `^${pattern}`;
    if (!new RegExp(anchored).test(pathname)) continue;
    if (!best || r.path.length > best.path.length) best = r;
  }
  return best ? best.allow : true;
}

// --- reading a page --------------------------------------------------------

const META = [
  [/<meta[^>]+(?:property|name)=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i, 'og:image'],
  [/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i, 'og:image'],
  [/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i, 'twitter:image'],
  [/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i, 'twitter:image'],
];

// Anything that is plainly not a photo of a restaurant.
const JUNK = /(sprite|placeholder|spinner|loading|blank|pixel|1x1|spacer|avatar|flag|icon-|\/icons?\/|badge|star|rating|arrow|chevron|payment|visa|mastercard|paypal|cookie|gdpr|whatsapp|facebook|instagram|twitter|tiktok|youtube|tripadvisor|deliveroo|ubereats|just-?eat)/i;

// Takeaway website builders ship the same handful of stock food photos to every
// shop that uses them. A restaurant publishing one of those is not publishing a
// picture of itself, and passing it off as one is exactly what the "example
// dish" label exists to prevent. Our own labelled example is more honest.
const TEMPLATE_STOCK = /(foodhub|flipdish|touch2success|touchtakeaway|eposnow|orderyoyo|kotipizza|menu-?builder|restaurantsnapshot|shutterstock|istockphoto|gettyimages|unsplash\.com|pexels|freepik)/i;

// A picture whose name says it is a logo is a logo, even when the site put it
// in og:image. It gets shown whole on a plain background, not cropped to fill.
const LOOKS_LIKE_LOGO = /(logo|favicon|brandmark|wordmark|[-_/]icon[-_.]|apple-touch)/i;

function absolute(src, base) {
  try {
    const u = new URL(src.trim().replace(/&amp;/g, '&'), base);
    return /^https?:$/.test(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

function classify(url) {
  if (!url || JUNK.test(url) || TEMPLATE_STOCK.test(url)) return null;
  return LOOKS_LIKE_LOGO.test(url) ? 'logo' : 'photo';
}

/**
 * An ordered shortlist rather than a single pick.
 *
 * A third of the first choices turned out to be unusable once downloaded: a
 * tracking pixel, a 2000x40 banner, a dead link, a file no decoder would read.
 * A site that offers a second picture should not lose its listing over a bad
 * first one, so the publisher gets everything found, best first, and takes the
 * first that survives inspection.
 */
function findImages(html, baseUrl) {
  const found = [];
  const seen = new Set();
  const add = (url, from, kind) => {
    if (!url || seen.has(url) || found.length >= 5) return;
    seen.add(url);
    found.push({ url, from, kind });
  };

  for (const [re, from] of META) {
    const m = html.match(re);
    const url = m && absolute(m[1], baseUrl);
    const kind = classify(url);
    if (kind) add(url, from, kind);
  }

  // JSON-LD: "image": "…" or "image": ["…"] or "image": { "url": "…" }
  for (const block of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]{0,20000}?)<\/script>/gi)) {
    for (const m of block[1].matchAll(/"(?:image|contentUrl|thumbnailUrl)"\s*:\s*(?:\[\s*)?(?:\{[^}]*"url"\s*:\s*)?"([^"]+)"/gi)) {
      const url = absolute(m[1], baseUrl);
      const kind = classify(url);
      if (kind) add(url, 'schema.org', kind);
    }
  }

  // Big pictures on the page, for the many sites (Framer, Squarespace, Wix)
  // that ship no og:image at all. The size has to be stated on the tag:
  // guessing from a filename picks up logos and sprites.
  for (const img of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = img[0];
    const src =
      (tag.match(/\bsrc=["']([^"']+)["']/i) || [])[1] ||
      (tag.match(/\bsrcset=["']([^"'\s,]+)/i) || [])[1];
    if (!src) continue;
    const w = Number((tag.match(/\bwidth=["']?(\d{2,5})/i) || [])[1] || 0);
    const h = Number((tag.match(/\bheight=["']?(\d{2,5})/i) || [])[1] || 0);
    const url = absolute(src, baseUrl);
    if (classify(url) !== 'photo' || /logo/i.test(tag)) continue;
    if (w >= 600 && (h === 0 || h >= 300)) add(url, 'page image', 'photo');
  }

  // Pictures whose size the tag does not state, which on a modern site is most
  // of them. Only consulted when nothing above produced a photograph, and only
  // for files named like one; the publisher measures them before using one.
  if (!found.some((f) => f.kind === 'photo')) {
    for (const img of html.matchAll(/<img\b[^>]*>/gi)) {
      const tag = img[0];
      const src =
        (tag.match(/\bsrc=["']([^"']+)["']/i) || [])[1] ||
        (tag.match(/\bsrcset=["']([^"'\s,]+)/i) || [])[1];
      if (!src || /logo/i.test(tag)) continue;
      const url = absolute(src, baseUrl);
      if (classify(url) !== 'photo') continue;
      if (!/\.(?:jpe?g|png|webp|avif)(?:[?#]|$)/i.test(url)) continue;
      add(url, 'page image (unsized)', 'photo');
    }
  }

  // The logo, last. Not a photo of the food, but it is the business's own mark
  // and it is better than a stock curry for telling one chain from another.
  const icons = [
    (html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i) || [])[1],
    (html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["']/i) || [])[1],
    (html.match(/<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+\.(?:png|jpe?g|webp))["']/i) || [])[1],
    (html.match(/<link[^>]+href=["']([^"']+\.(?:png|jpe?g|webp))["'][^>]+rel=["']icon["']/i) || [])[1],
    (html.match(/<img\b[^>]*\blogo\b[^>]*\bsrc=["']([^"']+)["']/i) || [])[1],
    (html.match(/<img\b[^>]*\bsrc=["']([^"']*logo[^"']*)["']/i) || [])[1],
  ];
  for (const icon of icons) {
    const url = icon && absolute(icon, baseUrl);
    if (url && !TEMPLATE_STOCK.test(url)) add(url, 'logo', 'logo');
  }

  return found;
}

// --- run -------------------------------------------------------------------

let found = 0;
let tried = 0;

async function handle(site) {
  const start = /^https?:\/\//i.test(site.url) ? site.url : `https://${site.url}`;
  const record = { host: site.host, places: site.places, triedAt: new Date().toISOString() };

  const robots = await get(`https://${site.host}/robots.txt`, 'text/plain');
  const rules = robots.status === 200 && robots.body && !/<html/i.test(robots.body.slice(0, 200))
    ? robotsRules(robots.body)
    : [];

  let path = '/';
  try { path = new URL(start).pathname; } catch { /* keep / */ }
  if (!allowed(rules, path)) {
    record.blocked = true;
    return record;
  }

  let page = await get(start);
  // The stored address is often a branch page, and branch pages move. The site
  // itself is still there, so fall back to its front door once.
  if ((page.status !== 200 || !page.body) && path !== '/' && allowed(rules, '/')) {
    page = await get(`https://${site.host}/`);
    record.usedHomepage = true;
  }
  record.status = page.status;
  if (page.status !== 200 || !page.body) {
    record.error = page.error || 'no html';
    return record;
  }

  const images = findImages(page.body, page.finalUrl || start);
  if (images.length) {
    found++;
    // The first is what the publisher tries; the rest are its fallbacks.
    record.image = images[0].url;
    record.from = images[0].from;
    record.kind = images[0].kind;
    record.candidates = images;
    record.pageUrl = page.finalUrl || start;
  }
  return record;
}

const work = [...queue];
async function worker() {
  for (;;) {
    const site = work.shift();
    if (!site) return;
    let record;
    try {
      record = await handle(site);
    } catch (err) {
      record = { host: site.host, places: site.places, error: String(err?.message || err).slice(0, 80) };
    }
    appendFileSync(OUT, JSON.stringify(record) + '\n');
    tried++;
    if (tried % 100 === 0) console.log(`${tried}/${queue.length} tried, ${found} with an image`);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`done: ${tried} sites tried, ${found} with an image`);
