import library from './representative-images.json';

// A picture of the kind of food a place serves, for every place that has no
// photo of its own. Chosen by kind of food, then by the place's id, so a place
// always shows the same picture and neighbours of one cuisine don't all match.
//
// These are never the restaurant's own dishes, and every surface that shows one
// says so. The library, and who took each photo, is on /image-credits; it was
// built by scripts/catalogue/publish-representative-images.mjs from photos a
// person reviewed one by one.

export interface RepresentativeImage {
  src: string;
  source: 'unsplash' | 'wikimedia';
  title?: string;
  author?: string | null;
  licence?: string;
  licenceUrl?: string | null;
  page?: string;
}

export type ImageBucket = keyof typeof library;

const LIBRARY = library as Record<string, RepresentativeImage[]>;

// Cuisine names as stored (cuisine_label and the cuisines table), then words in
// the place's name. First match wins, so specific dishes come before broad ones.
const CUISINE_BUCKET: [RegExp, string][] = [
  [/biryani/i, 'biryani'],
  [/shawarma|gyro/i, 'shawarma'],
  [/kebab|doner|döner/i, 'kebab'],
  [/indo[- ]?chinese|hakka/i, 'indo_chinese'],
  [/pakistani|bangladeshi|bengali|indian|punjabi|nepal|sri lankan|curry|tandoori/i, 'curry'],
  [/turkish/i, 'turkish'],
  [/persian|iranian/i, 'persian'],
  [/afghan/i, 'afghan'],
  [/moroccan/i, 'moroccan'],
  [/lebanese|syrian|middle eastern|arab|yemeni|egyptian|iraqi|kurdish|palestinian/i, 'middle_eastern'],
  [/african|nigerian|ghanaian|somali|ethiopian|eritrean|senegalese/i, 'african'],
  [/caribbean|jamaican/i, 'caribbean'],
  [/central asian|uzbek|uyghur|kazakh/i, 'central_asian'],
  [/balkan|bosnian|albanian/i, 'balkan'],
  [/malaysian|indonesian|singapore/i, 'malaysian'],
  [/chinese/i, 'chinese'],
  [/thai/i, 'thai'],
  [/japanese|sushi|ramen/i, 'japanese'],
  [/korean/i, 'korean'],
  [/pizza/i, 'pizza'],
  [/italian|pasta/i, 'italian'],
  [/mediterranean|greek/i, 'mediterranean'],
  [/fish and chips|fish & chips|seafood/i, 'fish_and_chips'],
  [/burger/i, 'burgers'],
  [/fried chicken|chicken|wings|peri/i, 'fried_chicken'],
  [/grill|steak|bbq|barbecue|charcoal|mangal|ocakbasi/i, 'grill'],
  [/dessert|ice cream|gelato|waffle|crepe|kunafa|knafeh|cake/i, 'desserts'],
  [/bakery|sweets|mithai|patisserie|bread/i, 'bakery'],
  [/cafe|café|coffee|tea|breakfast|brunch/i, 'cafe'],
  [/sandwich|wrap|falafel/i, 'sandwiches'],
];

const NAME_BUCKET: [RegExp, string][] = [
  [/biryani|biriyani/i, 'biryani'],
  [/shawarma|shwarma/i, 'shawarma'],
  [/kebab|kebap|doner|döner|kabab/i, 'kebab'],
  [/lahmacun|pide|turkish|istanbul|anatolia/i, 'turkish'],
  [/karahi|tandoor|curry|tikka|masala|balti|spice|dhaba|haveli|mahal|punjab|lahore|karachi|delhi|dhaka/i, 'curry'],
  [/mandi|mandy|kabsa|lebanese|shami|beirut|damascus/i, 'middle_eastern'],
  [/jollof|suya/i, 'african'],
  [/jerk|caribbean/i, 'caribbean'],
  [/pizza/i, 'pizza'],
  [/burger/i, 'burgers'],
  [/chicken|wings|peri|fried/i, 'fried_chicken'],
  [/grill|mangal|charcoal|bbq|steak/i, 'grill'],
  [/sweets|mithai|bakery|patisserie/i, 'bakery'],
  [/dessert|kunafa|waffle|gelato|creme|cream/i, 'desserts'],
  [/cafe|café|coffee|chai|tea/i, 'cafe'],
  [/sushi|noodle|wok|ramen/i, 'japanese'],
  [/falafel|wrap/i, 'sandwiches'],
];

// No cuisine and nothing in the name: the food most places in the catalogue serve.
const GENERAL = ['curry', 'grill', 'kebab', 'middle_eastern', 'biryani', 'shawarma'];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function bucketFor(place: { name: string; cuisine_label?: string | null; cuisines?: string[] | null; brand_name?: string | null }): string | null {
  const cuisine = [place.cuisine_label, ...(place.cuisines ?? [])].filter(Boolean).join(' ');
  if (cuisine) for (const [re, bucket] of CUISINE_BUCKET) if (re.test(cuisine)) return bucket;
  const name = [place.brand_name, place.name].filter(Boolean).join(' ');
  for (const [re, bucket] of NAME_BUCKET) if (re.test(name)) return bucket;
  return null;
}

export function representativeImageFor(place: {
  id: string;
  name: string;
  cuisine_label?: string | null;
  cuisines?: string[] | null;
  brand_name?: string | null;
}): RepresentativeImage {
  const h = hash(place.id);
  const bucket = bucketFor(place);
  const pool = (bucket && LIBRARY[bucket]?.length ? LIBRARY[bucket] : null) ?? LIBRARY[GENERAL[h % GENERAL.length]];
  return pool[Math.floor(h / 7) % pool.length];
}

/** The photo to show: the restaurant's own if it has one, otherwise a representative one. */
export function coverFor(place: {
  id: string;
  name: string;
  primary_photo_path?: string | null;
  cuisine_label?: string | null;
  cuisines?: string[] | null;
  brand_name?: string | null;
}, isOwn: (url: string) => boolean): { src: string; own: boolean; image: RepresentativeImage | null } {
  if (place.primary_photo_path && isOwn(place.primary_photo_path)) {
    return { src: place.primary_photo_path, own: true, image: null };
  }
  const image = representativeImageFor(place);
  return { src: image.src, own: false, image };
}

export function allRepresentativeImages(): { bucket: string; images: RepresentativeImage[] }[] {
  return Object.entries(LIBRARY).map(([bucket, images]) => ({ bucket, images }));
}

/** "Chicken biryani by Jane Doe, CC BY-SA 4.0" or "Photo from Unsplash". */
export function creditLine(image: RepresentativeImage): string {
  if (image.source === 'unsplash') return 'Photo from Unsplash';
  return [image.title, image.author ? `by ${image.author}` : null, image.licence].filter(Boolean).join(', ');
}
