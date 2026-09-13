// The 33 local authorities of Greater London: 32 boroughs plus the City.
//
// Names only. Neither free place index answers a borough by its everyday name
// ("Newham", "Tower Hamlets"), but OpenStreetMap does answer the official one,
// so this list turns what people type into what the index recognises. The
// coordinates are always looked up, never stored here.

export interface LondonBorough {
  /** What people type and what the suggestion shows. */
  name: string;
  /** The name OpenStreetMap holds the boundary under. */
  official: string;
}

export const LONDON_BOROUGHS: LondonBorough[] = [
  { name: 'Barking and Dagenham', official: 'London Borough of Barking and Dagenham' },
  { name: 'Barnet', official: 'London Borough of Barnet' },
  { name: 'Bexley', official: 'London Borough of Bexley' },
  { name: 'Brent', official: 'London Borough of Brent' },
  { name: 'Bromley', official: 'London Borough of Bromley' },
  { name: 'Camden', official: 'London Borough of Camden' },
  { name: 'City of London', official: 'City of London' },
  { name: 'Croydon', official: 'London Borough of Croydon' },
  { name: 'Ealing', official: 'London Borough of Ealing' },
  { name: 'Enfield', official: 'London Borough of Enfield' },
  { name: 'Greenwich', official: 'Royal Borough of Greenwich' },
  { name: 'Hackney', official: 'London Borough of Hackney' },
  { name: 'Hammersmith and Fulham', official: 'London Borough of Hammersmith and Fulham' },
  { name: 'Haringey', official: 'London Borough of Haringey' },
  { name: 'Harrow', official: 'London Borough of Harrow' },
  { name: 'Havering', official: 'London Borough of Havering' },
  { name: 'Hillingdon', official: 'London Borough of Hillingdon' },
  { name: 'Hounslow', official: 'London Borough of Hounslow' },
  { name: 'Islington', official: 'London Borough of Islington' },
  { name: 'Kensington and Chelsea', official: 'Royal Borough of Kensington and Chelsea' },
  { name: 'Kingston upon Thames', official: 'Royal Borough of Kingston upon Thames' },
  { name: 'Lambeth', official: 'London Borough of Lambeth' },
  { name: 'Lewisham', official: 'London Borough of Lewisham' },
  { name: 'Merton', official: 'London Borough of Merton' },
  { name: 'Newham', official: 'London Borough of Newham' },
  { name: 'Redbridge', official: 'London Borough of Redbridge' },
  { name: 'Richmond upon Thames', official: 'London Borough of Richmond upon Thames' },
  { name: 'Southwark', official: 'London Borough of Southwark' },
  { name: 'Sutton', official: 'London Borough of Sutton' },
  { name: 'Tower Hamlets', official: 'London Borough of Tower Hamlets' },
  { name: 'Waltham Forest', official: 'London Borough of Waltham Forest' },
  { name: 'Wandsworth', official: 'London Borough of Wandsworth' },
  { name: 'Westminster', official: 'City of Westminster' },
];

// Joining words match nothing on their own, or "and" would suggest three boroughs.
const IGNORED = new Set(['and', 'of', 'upon', 'city']);

/** Boroughs where the query starts the name or starts one of its words. */
export function matchBoroughs(query: string): LondonBorough[] {
  const q = query.trim().toLowerCase();
  if (q.length < 3 || IGNORED.has(q)) return [];
  return LONDON_BOROUGHS.filter((b) => {
    const name = b.name.toLowerCase();
    if (name.startsWith(q)) return true;
    return name
      .split(' ')
      .filter((word) => !IGNORED.has(word))
      .some((word, i, words) => words.slice(i).join(' ').startsWith(q));
  });
}
