// Step 2b: read the sites that only show their words in a browser.
//
// crawl-websites.mjs fetches HTML. A large share of takeaway websites are built
// on ordering platforms and page builders that draw the menu, and often a
// "100% halal" banner, with JavaScript: fetched plainly they are an empty
// shell, and some did not answer the plain fetch at all. This pass opens each
// such site in a headless browser, lets it draw, and reads the text a visitor
// would see, with exactly the same rules as the first pass (page-text.mjs).
//
// Manners, the same as crawl-websites.mjs:
//   - robots.txt is fetched and obeyed for this crawler and for "*".
//   - The browser identifies itself with the same honest user agent.
//   - It never tries to get past a bot check: a site that refuses us is left
//     alone and recorded as refused.
//   - One site at a time per host, a handful of pages at most. Images, fonts
//     and media are not downloaded.
//   - Delivery platforms and social networks are never opened (lib.mjs).
//
// Which sites: RENDER_QUEUE=path/to/queue.json, an array of { host, url }
// (the sites of listed places that the plain passes read without finding
// halal, or could not read). MAX_PAGES sets pages per site (default 5).
// Output: .cache/crawl-rendered.jsonl, the same shape as crawl.jsonl, plus
// `rendered: true` and a character count per page. Resumable.
//
// Needs Playwright with Chromium. PLAYWRIGHT_PATH may point at an existing
// install (its index.mjs); otherwise `npm i -D playwright` here.
//
// Run: RENDER_QUEUE=queue.json node crawl-rendered.mjs

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { cachePath, websiteHost } from './lib.mjs';
import { allowedByRobots, CERTIFIER, CONTRADICTIONS, excerptsAround, parseRobots } from './page-text.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_PATH ? pathToFileURL(process.env.PLAYWRIGHT_PATH).href : 'playwright');

const USER_AGENT =
  'YepItsHalalBot/1.0 (+https://yepitshalal.com; reads restaurant sites for halal information)';
const CONCURRENCY = Number(process.env.CRAWL_CONCURRENCY || 8);
const MAX_PAGES = Number(process.env.MAX_PAGES || 5);
const NAV_TIMEOUT_MS = 20000;
const SETTLE_MS = 6000;
const HOST_BUDGET_MS = 75000;
const OUT = cachePath(process.env.RENDER_OUT || 'crawl-rendered.jsonl');

if (!process.env.RENDER_QUEUE) {
  console.error('Set RENDER_QUEUE to a JSON file of { host, url }.');
  process.exit(1);
}
const done = new Set();
if (existsSync(OUT)) {
  for (const line of readFileSync(OUT, 'utf8').split('\n')) {
    if (!line) continue;
    try { done.add(JSON.parse(line).host); } catch { /* partial last line */ }
  }
}
const queue = JSON.parse(readFileSync(process.env.RENDER_QUEUE, 'utf8'))
  // Never a delivery platform or social network, whatever the queue says.
  .filter((q) => q.host && websiteHost(q.url || `https://${q.host}/`) === q.host)
  .filter((q) => !done.has(q.host));
console.log(`to render ${queue.length}, already done ${done.size}`);

// A bot check, not the restaurant's page. We stop there rather than get past it.
const BOT_WALL = /just a moment\.\.\.|attention required|verify you are (a )?human|checking your browser|access denied|enable javascript and cookies to continue|captcha|are you a robot/i;

async function robotsFor(host) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`https://${host}/robots.txt`, { headers: { 'user-agent': USER_AGENT }, signal: controller.signal, redirect: 'follow' });
    if (res.status !== 200) return [];
    const body = await res.text();
    return /<html/i.test(body.slice(0, 200)) ? [] : parseRobots(body);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function readPage(page, url) {
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  // Let the site draw: most ordering platforms fill the page after load.
  await page.waitForLoadState('networkidle', { timeout: SETTLE_MS }).catch(() => {});
  const got = await page.evaluate(() => {
    const meta = [...document.querySelectorAll('meta[name="description"], meta[property="og:description"]')]
      .map((m) => m.getAttribute('content') || '').join(' . ');
    const links = [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.href, label: (a.textContent || '').trim().slice(0, 80) }));
    return { title: document.title || '', meta, body: document.body ? document.body.innerText : '', links };
  });
  const text = `${got.title} . ${got.meta} . ${got.body}`.replace(/\s+/g, ' ').trim();
  return { status: res ? res.status() : 0, finalUrl: page.url(), text, links: got.links };
}

async function renderHost(browser, host, startUrl) {
  const record = { host, startUrl, crawledAt: new Date().toISOString(), rendered: true, pages: [], halal: [], flags: {}, certifierMention: false };
  const rules = await robotsFor(host);
  const context = await browser.newContext({ userAgent: USER_AGENT, locale: 'en-GB', viewport: { width: 1280, height: 900 } });
  await context.route('**/*', (route) => {
    const type = route.request().resourceType();
    return ['image', 'media', 'font'].includes(type) ? route.abort() : route.continue();
  });
  const page = await context.newPage();
  const started = Date.now();
  const visited = new Set();
  const queuePages = [startUrl];
  if (new URL(startUrl).pathname !== '/') queuePages.push(`https://${host}/`);
  try {
    while (queuePages.length && record.pages.length < MAX_PAGES && Date.now() - started < HOST_BUDGET_MS) {
      const url = queuePages.shift();
      let parsed;
      try { parsed = new URL(url); } catch { continue; }
      const key = parsed.origin.replace('://www.', '://') + parsed.pathname.replace(/\/$/, '');
      if (visited.has(key)) continue;
      visited.add(key);
      if (!allowedByRobots(rules, parsed.pathname)) { record.pages.push({ url, robotsBlocked: true }); continue; }

      let got;
      try {
        got = await readPage(page, url);
      } catch (err) {
        record.pages.push({ url, status: 0, error: String(err?.name || err).slice(0, 60) });
        continue;
      }
      const wall = got.text.length < 1500 && BOT_WALL.test(got.text);
      record.pages.push({ url, status: got.status, finalUrl: got.finalUrl, chars: got.text.length, ...(wall ? { botWall: true } : {}) });
      if (wall) break;
      if (got.status !== 200) continue;

      for (const ex of excerptsAround(got.text, /\bhalal\b/gi)) {
        if (record.halal.length < 12) record.halal.push({ url: got.finalUrl, excerpt: ex });
      }
      for (const [flag, re] of Object.entries(CONTRADICTIONS)) {
        if (re.test(got.text)) {
          record.flags[flag] = record.flags[flag] || { url: got.finalUrl, excerpt: excerptsAround(got.text, new RegExp(re.source, 'gi'), 80, 1)[0] };
        }
      }
      if (CERTIFIER.test(got.text)) record.certifierMention = true;

      // From the first page only: the internal links most likely to say what is
      // served, scored exactly as the plain crawler scores them.
      if (record.pages.length === 1) {
        const scored = [];
        for (const l of got.links) {
          let href;
          try { href = new URL(l.href); } catch { continue; }
          if (href.hostname.replace(/^www\./, '') !== host) continue;
          if (/\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4)$/i.test(href.pathname)) continue;
          const label = `${href.pathname} ${l.label}`.toLowerCase();
          let score = 0;
          if (/halal/.test(label)) score += 5;
          if (/menu|food|eat|dish/.test(label)) score += 3;
          if (/faq|allergen|dietary|about|our-story|story/.test(label)) score += 2;
          if (score) scored.push({ url: href.origin + href.pathname, score });
        }
        scored.sort((a, b) => b.score - a.score);
        for (const s of scored) if (!queuePages.includes(s.url)) queuePages.push(s.url);
      }
    }
  } finally {
    await context.close().catch(() => {});
  }
  return record;
}

const browser = await chromium.launch();
let next = 0;
let finished = 0;
let withHalal = 0;
let walls = 0;
const started = Date.now();

async function worker() {
  while (next < queue.length) {
    const { host, url } = queue[next++];
    let rec;
    try {
      rec = await renderHost(browser, host, url || `https://${host}/`);
    } catch (err) {
      rec = { host, startUrl: url, crawledAt: new Date().toISOString(), rendered: true, error: String(err).slice(0, 120), pages: [], halal: [], flags: {} };
    }
    appendFileSync(OUT, JSON.stringify(rec) + '\n');
    finished++;
    if (rec.halal.length) withHalal++;
    if (rec.pages.some((p) => p.botWall)) walls++;
    if (finished % 100 === 0 || finished === queue.length) {
      const rate = finished / ((Date.now() - started) / 60000);
      console.log(`${finished}/${queue.length} sites, ${withHalal} mention halal, ${walls} refused us, ${rate.toFixed(1)}/min, eta ${((queue.length - finished) / rate).toFixed(0)} min`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await browser.close();
console.log(`done: ${finished} sites rendered, ${withHalal} mention halal, ${walls} refused us`);
