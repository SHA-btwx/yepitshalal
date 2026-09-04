# YepItsHalal — Design System (Master)

Source of truth for visual and interaction decisions. Page-specific overrides, if
any are ever needed, live in `design-system/yepitshalal/pages/<page>.md` and win
over this file.

Derived with the `ui-ux-pro-max` skill's reference data (products, colours,
typography, UX guidelines, Next.js stack rules). The skill's `search.py` needs
Python, which is not installed on this machine, so the CSV corpora under
`~/.claude/skills/ui-ux-pro-max/data/` were queried directly and the matches are
cited below.

## Product profile

- **Type:** Local discovery + directory, mobile-first consumer.
- **Closest catalogue matches:** *Local Events & Discovery* (#149) and *Food
  Delivery / On-Demand* (#95). Both prescribe location-based discovery, category
  filters, a map view, and photo-first result cards — which is the shape this
  product already had.
- **What the product is actually selling:** certainty. Every visual decision
  should make "how do we know this?" answerable, and should never let a colour
  imply a claim the data doesn't support.

## Colour

Two surfaces exist: `paper` (#FAF9F6) page ground and white cards. Every text
token clears **4.5:1 on both**.

| Token | Hex | Use | Contrast (paper / white) |
|---|---|---|---|
| `ink` | `#14181A` | Primary text, dark surfaces | 16.9 / 17.9 |
| `muted` | `#5B6360` | Secondary body text | 5.87 / 6.18 |
| `subtle` | `#6B7270` | Tertiary, eyebrows, meta | 4.68 / 4.92 |
| `line` | `rgba(20,24,26,.08)` | Hairline borders | — |
| `accent` | `#1C9A4B` | Brand green — fills and marks only | 3.45 — **never text** |
| `accent-ink` | `#0F5E2E` | Green text, links, focus ring | 7.50 / 7.89 |
| `accent-soft` | `#E3F5E9` | Green tint backgrounds | — |
| `accent-onDark` | `#34C56B` | Green on the ink surface | 7.95 on ink |

### Halal status

Each status has a **saturated** value (dot + map pin, decoration) and an **ink**
value (text). The originals failed as text: `#A8720F` on its own tint was 3.52:1
and `#6D766F` was 3.89:1.

| Status | Pin/dot | Text (`*Ink`) | Tint (`*Soft`) | Text on tint |
|---|---|---|---|---|
| Fully Halal | `#1F7A45` | `#166534` | `#E1F1E5` | 6.08 |
| Halal Options | `#A8720F` | `#7A5200` | `#F6ECD6` | 5.89 |
| Unverified | `#6D766F` | `#4F564F` | `#EBEAE3` | 6.27 |

**Status is never colour alone.** Every badge carries its word, and the dot shape
differs per status (solid / ringed / hollow outline). The map — where a pin is
only a coloured circle — carries a permanent legend, and each pin's accessible
name includes its status.

## Typography

`Fraunces` (display) + `Inter` (UI/body), both via `next/font` so there is no
layout shift and no third-party font request. This pairing was already in place
and is kept: the catalogue's nearest analogue is *SaaS Mobile Boutique*
(Calistoga + Inter) — a warm display serif over Inter for everything functional.

- Display serif: page titles, restaurant names, card headings.
- Inter: all UI, body, labels, data.
- Body never below 13px; inputs are **16px** (below that, iOS Safari zooms the
  page on focus and the user has to pinch back out).
- `text-balance` on headings, `text-pretty` on paragraphs.

## Spacing, shape, elevation

- Radius: `rounded-full` for controls and chips, `rounded-2xl` for cards and
  panels, `rounded-xl` for inputs and thumbnails.
- Elevation: `shadow-sm` at rest, `shadow-md`/`lg` on hover only. Cards are
  separated by a hairline (`border-line` / `ring-black/5`), not by heavy shadow.
- Section rhythm: 14 (mobile) / 20 (desktop) vertical padding units.

## Touch targets

WCAG 2.2 sets 24×24 as the floor for web; this product goes further because it
is used one-handed, walking.

- Primary actions and form controls: **44px** minimum height.
- Chips and secondary controls: **36px**, with 8px between adjacent targets.
- Map pins: a 32px transparent button around a 20px dot — deliberately not 44,
  because oversized overlapping boxes swallow the drag used to pan the map.

## Motion

- One easing curve: `cubic-bezier(0.16, 1, 0.3, 1)` (`ease-out` in the config).
- 150–260ms. Hover lift is `-translate-y-0.5`; entrances fade up 6–12px.
- Nothing conveys meaning through motion alone, so
  `prefers-reduced-motion: reduce` disables all of it globally in `globals.css`.

## Accessibility rules that bind

1. One focus treatment for the whole product: `2px solid #0F5E2E`, 2px offset,
   defined once on `:focus-visible` in `globals.css`. Never removed.
2. Skip link to `#main` is the first focusable element on every page.
3. Icon-only controls carry the name on the control (`aria-label`), never on the
   glyph. Decorative icons are `aria-hidden`.
4. Async result counts announce through one `role="status"` region; failures use
   `role="alert"` and, for forms, take focus.
5. Every input has a real `<label>`. A placeholder is not a label — it vanishes
   the moment someone starts typing.
6. Multi-choice controls expose state: `aria-pressed` for toggles,
   `role="radiogroup"`/`aria-checked` where exactly one may be selected.
7. Pinch-zoom stays enabled (`viewport` sets width and initial-scale only).

## Icons

Inline SVG on a 24px grid, Phosphor outline idiom (round caps, 1.75 stroke), in
`components/icons.tsx`. **No emoji as icons** — emoji render differently per
platform, cannot inherit colour, and are announced by screen readers as their
CLDR name. Inline rather than a package: ~20 glyphs is cheaper hand-drawn than
any icon library's tree-shaken bundle.

## Anti-patterns for this product

- Text over a full-bleed food photo. Every image in the library is a tight food
  macro; stretched to a banner it becomes texture, and the scrim needed to keep
  white text at 4.5:1 flattens it to grey. Photos belong in square/16:9 frames.
- Any green that implies "verified" on a restaurant that is merely unverified.
  Unverified is grey, and always sits next to the sentence explaining that it is
  not a judgement.
- Vertical result cards in the map column — a search list is scanned, so rows.
