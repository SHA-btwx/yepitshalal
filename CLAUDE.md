# YepItsHalal

Live at https://yepitshalal.com, auto deploys from `main`.

## Before answering or changing anything

The project record is an Obsidian vault at
`C:/Users/shabi/OneDrive/Desktop/Obsidian/SHA's Vault`.

Grep `00 Index/INDEX.tsv` (one line per note) and read what matches. A
`<vault-context>` block is injected automatically with each prompt listing
likely notes. Use the `vault-librarian` agent when a question spans several
chats, or a `chat-*` agent for one chat's history.

Do not assert a project fact that the vault contradicts. If the vault does not
record something, say so rather than guessing.

## Non negotiables

- **Never fabricate halal facts.** Tri-state `true`/`false`/`null`. Unknown is
  never "no". Labels come only from a completed verification
- **Only compliant data sources.** FSA, OSM, postcodes.io, Wikimedia Commons,
  licensed Unsplash, owner uploads. No scraping Google or TripAdvisor, no Google
  Places Photos API
- **No em dashes** in any copy, comment, or reply. Rewrite the sentence
- **Stripe is livemode only.** Never test by completing a checkout
- **No paywall** on halal information, distance, or listings. Search is free
- **The ShareTheMeal claim** is YepItsHalal donating, not a WFP partnership, and
  there is no automated mechanism behind it

## Gotchas that are not bugs

- `next/og` routes 500 locally on Windows. They work on Vercel. A build that
  says "Compiled successfully" then fails prerender on `/icon`, `/apple-icon`
  and `/opengraph-image` is a **passing** local build
- After any `next build`, `rm -rf .next` before restarting the dev server
- A worktree needs `.env.local` copied in or the build fails with
  "supabaseUrl is required"
- Never send a stored image through the Vercel image optimiser. Pass
  `unoptimized`. It 402s past its monthly quota

Details for all of these: `03 Operations/` in the vault.

## After durable changes

Run `/vault-sync`. Skip it if nothing durable changed.
