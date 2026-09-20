/**
 * Why a place nobody has checked is on a halal site at all.
 *
 * "Not checked yet" answered the wrong question. It said what we had not done
 * and left the obvious one hanging: if you have no evidence, why is this in
 * front of me? The answer has always existed in the catalogue rule, it just was
 * never said out loud. A place is here because the food it serves is a kind
 * commonly served halal in London. That is a reason to ask, and it is worth
 * saying.
 *
 * This is never a halal claim and must never be written as one. It says what
 * kind of food the place serves, that that kind is often halal here, and that
 * nobody has confirmed anything about this particular one.
 *
 * The signals below are the readable half of scripts/catalogue/candidates.mjs,
 * which is what actually decides admission. When that list grows, this one
 * should too, or a place will be admitted for a reason we cannot state.
 */

/** Cuisine names that are already a food, so they don't take "food" after them.
 *  Anything else is read as a nationality: "Turkish" becomes "Turkish food". */
const ALREADY_A_FOOD =
  /chicken|kebab|grill|burger|pizza|bakery|cafe|dessert|sweets|chips|sandwich|biryani|curry|wings|shawarma|falafel|food/i;

/** Bare category names that read badly in a sentence on their own. */
const AWKWARD: Record<string, string> = {
  grill: 'Grills',
  kebab: 'Kebabs',
  bakery: 'Bakeries',
  cafe: 'Cafe food',
};

/** Nationalities in a name, when the record carries no cuisine of its own. */
const NATIONALITIES = [
  'Turkish', 'Lebanese', 'Persian', 'Afghan', 'Pakistani', 'Bangladeshi', 'Indian', 'Punjabi',
  'Bengali', 'Egyptian', 'Yemeni', 'Somali', 'Ethiopian', 'Eritrean', 'Nigerian', 'Moroccan',
  'Iraqi', 'Syrian', 'Kurdish', 'Malaysian', 'Indonesian', 'Arabian',
];

/** The kind of shop a name gives away, when nothing else does. Ordered: the
 *  first match wins, so the specific dishes come before the general words. */
const NAME_HINTS: [RegExp, string][] = [
  [/kebab|kebap|doner|döner|kabab|kofta/i, 'A kebab shop'],
  [/shawarma|shwarma/i, 'A shawarma shop'],
  [/falafel/i, 'A falafel shop'],
  [/biryani|biriyani/i, 'A biryani place'],
  [/tandoori|tandori|karahi|nihari|haleem|\bcurry\b|tikka|samosa|\bspice\b/i, 'A curry house'],
  [/mangal|ocakbasi|ocakbaşı|\bpide\b|lahmacun|istanbul/i, 'A Turkish kitchen'],
  [/chicken|\bwings\b|\bperi\b/i, 'A chicken shop'],
  [/grill/i, 'A grill'],
  [/\bsweets\b|mithai|baklava/i, 'A sweet shop'],
  [/karachi|lahore/i, 'Pakistani food'],
  [/\bdelhi\b|mumbai/i, 'Indian food'],
  [/\bdhaka\b/i, 'Bangladeshi food'],
  [/\bcairo\b/i, 'Egyptian food'],
  [/\bmedina\b|\bsultan\b|kabsa|\bmandi\b/i, 'Middle Eastern food'],
  [/jollof|\bsuya\b/i, 'West African food'],
  [/shisha/i, 'A shisha lounge'],
];

/**
 * A cuisine as it can be dropped into a sentence: "Indian" becomes "Indian
 * food", "Fried Chicken" is left alone. Never lowercased, because most of these
 * are proper adjectives and "indian food" reads like a mistake.
 */
export function foodKind(cuisine: string): string {
  const tidy = cuisine.trim();
  return AWKWARD[tidy.toLowerCase()] ?? (ALREADY_A_FOOD.test(tidy) ? tidy : `${tidy} food`);
}

export interface ListedBecause {
  /** "Indian food", "Fried Chicken", "A kebab shop", or null. */
  kind: string | null;
  /**
   * The short form, for a search card. Two lines at 375px is all a card has,
   * and a caveat that gets cut off mid-word is worse than no caveat: the badge
   * beside it already says nobody has settled this.
   */
  line: string;
  /** The same reason with the caveat spelled out, where there is room for it. */
  full: string;
}

export function whyListed(place: {
  name: string;
  cuisine_label?: string | null;
  cuisines?: string[] | null;
  brand_name?: string | null;
}): ListedBecause {
  const said = (kind: string) => ({
    kind,
    line: `${kind}, often halal in London.`,
    full: `${kind}, often halal in London. Nobody has checked this one.`,
  });

  // Cuisines are stored title-cased ("Indian", "Fried Chicken") and several are
  // proper adjectives, so they are never lowercased: they lead the sentence.
  const raw = place.cuisines?.[0]?.trim() || place.cuisine_label?.trim() || null;
  if (raw) return said(foodKind(raw));

  const name = [place.brand_name, place.name].filter(Boolean).join(' ');
  const nationality = NATIONALITIES.find((n) => new RegExp(`\\b${n}`, 'i').test(name));
  if (nationality) return said(`${nationality} food`);

  for (const [pattern, kind] of NAME_HINTS) {
    if (pattern.test(name)) return said(kind);
  }

  // Admitted on something the search row doesn't carry: an alternate name from
  // the food-hygiene register, or a halal category in public place data.
  return {
    kind: null,
    line: 'Its listing points to food often served halal in London.',
    full: 'Its listing points to food often served halal in London. Nobody has checked this one.',
  };
}
