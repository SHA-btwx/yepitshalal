import { createAdminSupabase } from '@/lib/supabase/admin';
import { AdminPage, Panel, Tag } from '@/components/admin/ui';
import { InfoIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Where to go next' };

// Which city to do after London, argued from something rather than guessed.
//
// This is the whole reason the sign-up asks for a place rather than a mood.
// A free-text box would have given "manchester", "Manchester UK" and "mcr" as
// three separate cities; the picker stores an OpenStreetMap id, so everybody
// asking for the same place lands in the same row and the counts mean
// something.
//
// Rows people typed themselves are kept and shown separately rather than
// merged in. "Anywhere in Scotland honestly" is a real answer and deserves to
// be read, but it is not a number.

interface Row {
  wanted_city: string | null;
  wanted_place_label: string | null;
  wanted_country: string | null;
  wanted_country_code: string | null;
  wanted_place_kind: string | null;
  wanted_place_id: string | null;
  wanted_lat: number | null;
  wanted_lng: number | null;
  locale: string;
  created_at: string;
}

function when(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function AdminDemandPage() {
  const supabase = createAdminSupabase();

  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('subscribers')
      .select(
        'wanted_city, wanted_place_label, wanted_country, wanted_country_code, wanted_place_kind, wanted_place_id, wanted_lat, wanted_lng, locale, created_at'
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(from, from + 999);
    if (error || !data) break;
    rows.push(...(data as Row[]));
    if (data.length < 1000) break;
  }

  // Picked from the list: countable.
  const places = new Map<string, { label: string; country: string | null; kind: string | null; lat: number | null; lng: number | null; n: number; latest: string }>();
  // Typed by hand: readable, not countable.
  const freeText: { text: string; when: string }[] = [];
  const countries = new Map<string, { name: string; n: number }>();
  let noPlace = 0;

  for (const r of rows) {
    if (r.wanted_place_id && r.wanted_place_label) {
      const g = places.get(r.wanted_place_id) ?? {
        label: r.wanted_place_label,
        country: r.wanted_country,
        kind: r.wanted_place_kind,
        lat: r.wanted_lat,
        lng: r.wanted_lng,
        n: 0,
        latest: r.created_at,
      };
      g.n++;
      if (r.created_at > g.latest) g.latest = r.created_at;
      places.set(r.wanted_place_id, g);

      if (r.wanted_country_code && r.wanted_country) {
        const c = countries.get(r.wanted_country_code) ?? { name: r.wanted_country, n: 0 };
        c.n++;
        countries.set(r.wanted_country_code, c);
      }
    } else if (r.wanted_city) {
      freeText.push({ text: r.wanted_city, when: r.created_at });
    } else {
      noPlace++;
    }
  }

  const ranked = [...places.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  const byCountry = [...countries.values()].sort((a, b) => b.n - a.n);
  const locales = new Map<string, number>();
  for (const r of rows) locales.set(r.locale, (locales.get(r.locale) ?? 0) + 1);

  return (
    <AdminPage
      title="Where to go next"
      width="lg"
      description={`${rows.length.toLocaleString('en-GB')} people waiting. ${ranked.length} distinct places picked from the list, ${freeText.length} typed by hand, ${noPlace} who did not say.`}
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-accent-soft px-4 py-3 text-sm leading-relaxed text-accent-ink">
          <p className="flex items-start gap-2">
            <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold">Only the picked ones are counted.</span> Those carry an
              OpenStreetMap id, so a hundred people asking for Manchester are one row of a hundred
              rather than nine spellings. What somebody typed by hand is worth reading, but it is
              not a number, so it sits in its own list below.
            </span>
          </p>
        </div>

        <Panel title="Most asked for" action={<Tag>{ranked.length}</Tag>}>
          {ranked.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">
              Nobody has picked a place yet. The form is on the homepage and on every translated
              landing page.
            </p>
          ) : (
            <ol className="divide-y divide-line">
              {ranked.map((p, i) => (
                <li key={p.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3.5">
                  <span className="min-w-0">
                    <span className="font-semibold text-ink">
                      {i + 1}. {p.label}
                    </span>
                    {p.kind && <span className="ml-2 text-xs text-subtle">{p.kind}</span>}
                    {p.lat !== null && p.lng !== null && (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=10/${p.lat}/${p.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-xs text-muted underline underline-offset-2 hover:text-ink"
                      >
                        map
                      </a>
                    )}
                  </span>
                  <span className="shrink-0 text-sm text-muted">
                    <span className="font-display text-lg font-semibold text-ink">{p.n}</span> asked ·
                    latest {when(p.latest)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        {byCountry.length > 0 && (
          <Panel title="By country" action={<Tag>{byCountry.length}</Tag>}>
            <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-4">
              {byCountry.slice(0, 12).map((c) => (
                <div key={c.name} className="rounded-xl border border-line px-3.5 py-3">
                  <p className="truncate text-xs font-medium uppercase tracking-wide text-subtle">{c.name}</p>
                  <p className="mt-0.5 font-display text-xl font-semibold text-ink">{c.n}</p>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {locales.size > 1 && (
          <Panel title="Which page they signed up from">
            <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-6">
              {[...locales.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([code, n]) => (
                  <div key={code} className="rounded-xl border border-line px-3.5 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-subtle">{code}</p>
                    <p className="mt-0.5 font-display text-xl font-semibold text-ink">{n}</p>
                  </div>
                ))}
            </div>
          </Panel>
        )}

        {freeText.length > 0 && (
          <Panel title="Typed by hand" action={<Tag>{freeText.length}</Tag>}>
            <ul className="divide-y divide-line">
              {freeText.slice(0, 100).map((t, i) => (
                <li key={`${t.text}-${i}`} className="flex items-baseline justify-between gap-4 px-5 py-2.5 text-sm">
                  <span className="min-w-0 text-ink/85">{t.text}</span>
                  <span className="shrink-0 text-xs text-subtle">{when(t.when)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </AdminPage>
  );
}
