// What the crawlers share: robots.txt handling, and how they read a page's text
// for halal. crawl-websites.mjs (plain HTML) and crawl-rendered.mjs (a real
// browser) must judge text identically, so the rules live here once.

// --- robots.txt -------------------------------------------------------------------
export function parseRobots(text) {
  const groups = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
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

export function allowedByRobots(rules, pathname) {
  let best = null;
  for (const r of rules) {
    if (!r.path) { if (!r.allow) continue; }
    const pattern = r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const anchored = pattern.endsWith('\\$') ? `^${pattern.slice(0, -2)}$` : `^${pattern}`;
    if (new RegExp(anchored).test(pathname)) {
      if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
    }
  }
  return !best || best.allow || best.path === '';
}

export function excerptsAround(text, pattern, width = 150, max = 8) {
  const out = [];
  for (const m of text.matchAll(pattern)) {
    const start = Math.max(0, m.index - width);
    const end = Math.min(text.length, m.index + m[0].length + width);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = snippet.replace(/^\S*\s/, '');
    if (end < text.length) snippet = snippet.replace(/\s\S*$/, '');
    snippet = snippet.replace(/(\s*\.\s*){2,}/g, '. ').trim();
    if (!out.some((o) => o.includes(snippet) || snippet.includes(o))) out.push(snippet);
    if (out.length >= max) break;
  }
  return out;
}

// Contradictions of an all-halal claim. Bacon is only counted when it is not
// qualified as turkey, beef, chicken, veal or halal bacon, all of which exist,
// and is not Francis Bacon: a quotation of his on a restaurant's home page
// turned "Yes, we are 100% Halal certified" into halal options (2026-09-24).
export const CONTRADICTIONS = {
  pork: /\bpork\b/i,
  bacon: /\b(?<!(turkey|beef|chicken|veal|halal|veggie|vegan|vegetarian|facon|francis)\s)bacon\b/i,
  cured_pork: /\b(prosciutto|pancetta|parma ham|serrano ham|iberico|guanciale)\b/i,
  non_halal: /\bnon[- ]?halal\b|\bnot halal\b|\bisn'?t halal\b|\bno(t)? (?:all|every)[^.]{0,30}halal\b/i,
};
export const CERTIFIER = /\b(HMC|HFA|halal monitoring committee|halal food authority|halal certified|certified halal|halal certification|halal certificate)\b/i;
