// Which places might serve halal food, before anyone has checked.
//
// A listing with evidence says what we know. A candidate says only that the
// place is worth checking: its name or its listed cuisine is a kind of food
// commonly served halal in London (a kebab shop, a Pakistani grill, a peri peri
// chicken shop). It is shown as "Not checked yet", never as halal, and it
// never counts as evidence. This is the same rule the site's first listings
// were chosen by, applied to every borough instead of 40 neighbourhoods.
//
// Excluded, whatever the name says:
//   - anywhere the restaurant itself, or OpenStreetMap, says it is not halal
//   - pubs, bars and nightclubs
//   - names built around pork or alcohol

export const NAME_SIGNALS = [
  'halal', 'kebab', 'kebap', 'doner', 'döner', 'shawarma', 'shwarma', 'tandoori', 'tandori',
  'biryani', 'biriyani', 'karahi', 'nihari', 'haleem', 'grill', 'tikka',
  'kofta', 'kabab', 'turkish', 'lebanese', 'persian', 'afghan', 'pakistani', 'bangladeshi',
  'indian', 'punjabi', 'bengali', 'egyptian', 'yemeni', 'somali', 'ethiopian',
  'eritrean', 'nigerian', 'moroccan', 'iraqi', 'syrian', 'kurdish', 'istanbul', 'sultan',
  'delhi', 'mumbai', 'karachi', 'lahore', 'dhaka', 'cairo', 'medina', 'bismillah', 'chicken',
  'wings', 'sweets', 'samosa', 'curry', 'spice', 'jollof', 'suya', 'shisha', 'kabsa', 'mandy',
  'mangal', 'ocakbasi', 'lahmacun', 'pide', 'falafel', 'mandi', 'peri',
];
// Short or ambiguous words only count as whole words: "arab" but not "Arabica",
// "peri" but not "Periwinkle", "mandi" but not "Mandir".
const WHOLE_WORD = new Set(['peri', 'mandi', 'mandy', 'pide', 'suya', 'spice', 'curry', 'wings', 'sweets', 'indian', 'sultan', 'medina', 'cairo', 'delhi', 'dhaka', 'arab']);
const NAME_RE = new RegExp(
  NAME_SIGNALS.map((w) => (WHOLE_WORD.has(w) ? `\\b${w}\\b` : w)).concat(['\\barab\\b', '\\barabian\\b']).join('|'),
  'i'
);

const CUISINE_RE = /halal|pakistani|bangladeshi|bengali|indian|punjabi|turkish|lebanese|middle_eastern|persian|iranian|afghan|arab|kebab|doner|shawarma|falafel|somali|ethiopian|eritrean|nigerian|ghanaian|senegalese|moroccan|egyptian|yemeni|syrian|iraqi|kurdish|palestinian|jordanian|saudi|uzbek|uyghur|kazakh|central_asian|malaysian|indonesian|biryani|curry|peri_peri|chicken_restaurant|fried_chicken|chicken|tandoori/i;

const PUB_BAR = /(^|;|_)(pub|bar|wine_bar|cocktail_bar|beer_bar|brewery|nightclub|gastropub|beer_garden|taproom|lounge_bar)($|;|_)/i;
const PORK_OR_ALCOHOL = /\b(pork|bacon|ham|hams|pig|pigs|hog|swine|porchetta|wine|beer|beers|brewery|brewing|taproom|tavern|pub|gin|cocktails?|arms)\b/i;

/**
 * @param entity  a place from entities.jsonl
 * @param evidence  its evidence records from evidence.jsonl, if any
 */
export function isCandidate(entity, evidence = []) {
  if (evidence.some((e) => e.claim === 'not_halal')) return false;
  if (entity.signals?.osmDietHalal && String(entity.signals.osmDietHalal).toLowerCase() === 'no') return false;
  if (entity.sources?.osm?.dietHalal && String(entity.sources.osm.dietHalal).toLowerCase() === 'no') return false;

  const names = [entity.name, ...(entity.sources?.fsa || []).map((f) => f.name), ...(entity.sources?.overture || []).map((o) => o.name), entity.sources?.osm?.name]
    .filter(Boolean);
  if (names.some((n) => PORK_OR_ALCOHOL.test(n))) return false;

  const fsa = entity.sources?.fsa || [];
  if (fsa.length && fsa.every((f) => /pub\/bar\/nightclub/i.test(f.type || ''))) return false;
  const kinds = [entity.cuisine, ...(entity.categories || [])].filter(Boolean).join(';');
  if (PUB_BAR.test(kinds)) return false;

  return names.some((n) => NAME_RE.test(n)) || CUISINE_RE.test(kinds);
}

/** The same test for a listing already in the database, which has only a name and cuisine. */
export function rowIsCandidate(row) {
  const names = [row.name].filter(Boolean);
  if (names.some((n) => PORK_OR_ALCOHOL.test(n))) return false;
  const kinds = [row.cuisine_label, ...(row.cuisines || [])].filter(Boolean).join(';').toLowerCase().replace(/\s+/g, '_');
  return names.some((n) => NAME_RE.test(n)) || CUISINE_RE.test(kinds);
}
