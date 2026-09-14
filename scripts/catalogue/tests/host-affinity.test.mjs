import { hostMatchesName } from '../lib.mjs';

const cases = [
  ['afrikanakitchen.com', 'Afrikana', true],
  ['afrikanakitchen.com', 'Ascend Investment Holdings', false],
  ['okarestaurant.co.uk', 'Oka Marylebone', true],
  ['bbcafe.co.uk', 'Beans & Beyond', true],
  ['tonkotsu.co.uk', "Harry Gordon's Bar and Kitchen", false],
  ['chickencottage.com', 'Chicken Inn', false],
  ['chickencottage.com', 'Chicking United Kingdom', false],
  ['chickencottage.com', 'Chicken Cottage', true],
  ['samschicken.com', "Sam's Chicken", true],
  ['samschicken.com', 'A & S Fast Foods', false],
  ['karachicuisine.com', 'Classic Film', false],
  ['tinseltown.co.uk', 'Red Corner', false],
  ['phocafe.co.uk', 'Pho', true],
  ['rosasthai.com', "Rosa's Thai Soho", true],
  ['irosushi.com', 'Iro Sushi', true],
  ['lecafenac.com', 'Le Café NAC', true],
  ['aqbarandrestaurant.co.uk', 'African Queen', true],
  ['bangbangoriental.com', 'Coconut Tree', false],
  ['thestratford.com', 'The Stratford Brasserie', true],
  ['francomanca.co.uk', 'Ninety', false],
  // Known limit: a short abbreviation of a long brand is not recognised.
  ['germandonerkebab.com', 'GDK', false],
  ['germandonerkebab.com', 'German Doner Kebab', true],
  ['shahshalalfood.co.uk', "Shah's Halal", true],
  ['tayyabs.co.uk', 'Tayyabs', true],
  ['aromasrestaurant.co.uk', 'Tfun Lunch', false],
  ['fitourestaurant.co.uk', "Fitou's", true],
  ['elnlondon.com', 'EL&N', true],
  ['hsandco.co.uk', 'HS & Co', true],
  ['the411london.co.uk', 'The 411 London', true],
  ['the71.uk', 'The 71', true],
  ['553london.co.uk', '553 London', true],
  ['thebbq-express.co.uk', 'BBQ Express Wanstead', true],
  ['tkrc.co.uk', 'The Kati Roll Company', true],
  ['frankieandbennys.com', "Little Frankie's", true],
  ['19-20.co.uk', '1920 Bar', true],
  ['samschicken.com', 'Papa Chicken', false],
  ['galvinrestaurants.com', 'Demoiselle', false],
  ['thestratford.com', 'Kitchen E20', false],
  ['chopstixgroup.com', 'Treaty Kitchen', false],
  ['wahaca.co.uk', 'Mexican Street Kitchen', false],
  ['imperial.ac.uk', 'Kimiko', false],
];
let bad = 0;
for (const [host, name, want] of cases) {
  const got = hostMatchesName(host, [name]);
  if (got !== want) bad++;
  console.log(got === want ? 'ok  ' : 'FAIL', host, '|', name, '->', got);
}
console.log(bad ? `${bad} failed` : 'all passed');
if (bad) process.exitCode = 1;
