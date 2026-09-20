/**
 * An address as it should be read, not as the register stored it.
 *
 * Most of the catalogue came from the Food Standards Agency, where plenty of
 * addresses are typed in capitals: "138 EDGWARE ROAD, W2 2DZ". In a list of
 * thirty places that shouts, and next to a carefully worded halal label it
 * makes the whole row look like scraped data nobody looked at.
 *
 * Display only. The stored address is what ties a row back to its FHRS record
 * and is never rewritten.
 */

/** Left alone: a postcode is uppercase, and so are these. */
const KEEP_UPPER = /^(?:[A-Z]{1,2}\d[A-Z\d]?|\d[A-Z]{2}|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}|UK|GB|SW|SE|NW|NE|EC|WC|N|E|S|W)$/;

/** Stays lower inside a name: "Bank of England Road", not "Bank Of England Road".
 *  "The" is not in here on purpose: London is full of streets called The Mall
 *  and The Broadway, and there is no way to tell those from a stray article. */
const SMALL_WORDS = new Set(['of', 'and', 'upon', 'le', 'la']);

function titleCaseWord(word: string, first: boolean): string {
  const lower = word.toLowerCase();
  if (!first && SMALL_WORDS.has(lower)) return lower;
  let out = lower.replace(/(^|[^a-z'])([a-z])/g, (_, before, ch) => before + ch.toUpperCase());
  // "O'BRIEN" keeps its capital B; "MARY'S" does not get a capital S. The
  // difference is whether a single letter precedes the apostrophe.
  out = out.replace(/(^|[^a-z])([a-z])'([a-z])/gi, (_, b, one, next) => `${b}${one}'${next.toUpperCase()}`);
  return out;
}

export function tidyAddress(address: string | null | undefined): string {
  if (!address) return '';
  let startOfClause = true;
  return address
    .split(/(\s+|,)/)
    .map((token) => {
      if (token === ',') {
        startOfClause = true;
        return token;
      }
      if (/^\s+$/.test(token)) return token;
      const first = startOfClause;
      startOfClause = false;
      if (!/[A-Za-z]/.test(token)) return token;
      const bare = token.replace(/[^A-Za-z0-9]/g, '');
      // Only touch words that are shouting: mixed case was typed deliberately.
      if (!/^[A-Z0-9]+$/.test(bare) || bare.length < 2) return token;
      if (KEEP_UPPER.test(bare)) return token;
      return titleCaseWord(token, first);
    })
    .join('');
}
