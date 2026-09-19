# Catalogue pipeline

Finds restaurants across London, reads what they say about halal, and imports
the places with evidence. It never decides a label itself: it records evidence,
and the database's `refresh_halal_status()` turns evidence into Fully Halal,
Halal Options or Unverified. A place with no evidence is kept but not listed.

It has its own `package.json`, so the app's Vercel build never installs it.
Everything it downloads or produces goes in `.cache/`, which is not committed.

```bash
cd scripts/catalogue && npm install && npm test
```

## Inputs (in `.cache/`)

| File | Source | Licence |
| --- | --- | --- |
| `fsa/*.json` | Food Standards Agency food hygiene open data, one file per London local authority (33), from ratings.food.gov.uk/open-data | Open Government Licence v3 |
| `overture_london_food.parquet` | Overture Maps places release, clipped to Greater London and to food and drink categories, exported with DuckDB | CDLA-Permissive-2.0 and others, per record |
| `osm_all_food.json`, `osm_halal.json` | OpenStreetMap via the Overpass API: food amenities in Greater London, and anything tagged `diet:halal` | ODbL 1.0 |
| `boroughs.geojson` | The 33 borough boundaries (OpenStreetMap admin_level 8 relations in Greater London) | ODbL 1.0 |

Deliberately not used: Google Places, Deliveroo, Just Eat, Uber Eats,
Tripadvisor and Yelp (their terms forbid it), and the HMC and HFA certifier
registers (no published reuse terms; ask them for permission first).

## Steps

1. `node build-entities.mjs` joins the three datasets into one list of places
   (`entities.jsonl`). It merges records only when near-certain, so neighbours
   stay separate.
2. `node crawl-websites.mjs` reads each restaurant's own website: the homepage
   and up to three menu, FAQ or about pages. It obeys robots.txt, names itself
   `YepItsHalalBot/1.0`, and never fetches delivery apps or social networks.
   `DEEP=1 node crawl-websites.mjs` is a second pass over sites where nothing
   was found, guided by each site's sitemap. Both passes can be stopped and
   resumed.
3. `node classify-evidence.mjs` turns what the sources say into evidence records
   (`evidence.jsonl`). Rules are in the file header. Key points:
   - Only the restaurant's own clear words that all its meat is halal can be
     strong evidence, and every such statement needs a person's decision in
     `review-decisions.json` first.
   - A claim of HMC or HFA certification is recorded as a claim, never as
     certification.
   - A website only counts for a place whose name it belongs to.
   - Names, OpenStreetMap tags and map categories are weak evidence.
   - Cuisine and area are never evidence.
   The script lists Fully Halal statements awaiting review in `review-strong.tsv`.
4. `node import-catalogue.mjs` prints the plan. Add `--apply` to write it. It is
   safe to re-run: pipeline evidence is replaced, and evidence added by admins or
   submissions is never touched.
   It also lists places "Not checked yet": places whose name or cuisine makes
   them worth checking (a kebab shop, a Pakistani grill), with whatever details
   the sources have, even none. The rule is in `candidates.mjs`. They are never
   given a halal label, and anything that says it is not halal is left out.
5. `node dedupe-listed.mjs` finds the same restaurant shown twice in search, and
   places whose pin is more than 500 m from their own postcode. Add `--apply` to
   merge duplicates and send misplaced pins to review. Merged rows are hidden
   from search, not deleted.

## The restaurants' own pictures

Most places publish a picture of themselves on their own website, in the tag
that exists so other sites can show it. A listing uses that when it has one, and
falls back to a representative image when it does not.

1. `node find-business-images.mjs` reads one page per site and records the best
   image it finds (`.cache/business-images.jsonl`). Same rules as the evidence
   crawler: robots.txt obeyed, the site has to belong to that restaurant
   (`hostMatchesName`), and never Google, Tripadvisor, Yelp or a delivery app.
   Order of preference: og:image, twitter:image, schema.org image, a large
   `<img>` on the page, then the logo. Stock photos shipped by takeaway website
   builders are skipped: they are no more that restaurant's food than ours is.
2. `node publish-business-images.mjs` prints the plan; `--apply` downloads each
   one, checks its size and shape, resizes it, stores it in our own bucket and
   attaches it to every listing that shares that website. Logos go under
   `business-logo/` and are shown whole on white; photographs go under
   `business/` and are cropped to fill.

Every row records the page the image came from. That credit is shown on the
listing, and it is what makes a takedown request answerable.

## Representative images

Places without their own photo show a picture of the kind of food they serve,
marked as an example on the site and credited on /image-credits.

1. `node find-representative-images.mjs` proposes openly licensed photos per kind
   of food from Wikimedia Commons (`.cache/image-candidates.json`).
2. A person looks at every one and records the keepers in `.cache/image-chosen.json`.
3. `node publish-representative-images.mjs` resizes the keepers, stores them in
   the `restaurant-photos` bucket under `representative/`, and writes
   `lib/representative-images.json` for the app.

## Human review

`review-decisions.json` holds every decision a person made while reading
statements. Values are keyed by website host:

- `confirm`: strong evidence of Fully Halal.
- `reject`: kept as a moderate mention.
- `options`: the statement has an exception.
- `exclude`: not a place to eat.
- `skip`: nothing usable on the site.
- `fully`, `options_forced`, `mention`: a decided outcome for a chain website.

The object form `{ decision, note, excerpt, url }` records why, and can supply
the exact quote. Commit changes to this file with the import they affect.
