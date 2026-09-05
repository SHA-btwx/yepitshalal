import Link from 'next/link';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { mergeDuplicate, markDistinct } from '@/lib/catalogue-actions';
import { AdminPage, Panel, List, Row, Tag } from '@/components/admin/ui';
import { ConfirmSubmitButton } from '@/components/admin/ConfirmSubmitButton';
import { ArrowUpRightIcon, InfoIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Duplicate review' };

interface Side {
  id: string;
  name: string;
  address: string;
  postcode: string | null;
  phone: string | null;
  slug: string;
  halal_classification: string;
  branch_label: string | null;
}

interface Candidate {
  id: string;
  score: number;
  signals: Record<string, string | boolean>;
  a: Side;
  b: Side;
}

export default async function AdminDuplicatesPage() {
  const supabase = createAdminSupabase();

  const { data: rows } = await supabase
    .from('catalogue_dedupe_candidates')
    .select('id, score, signals, restaurant_a, restaurant_b')
    .eq('status', 'pending')
    .order('score', { ascending: false })
    .limit(50);

  const ids = [
    ...new Set((rows ?? []).flatMap((r) => [r.restaurant_a, r.restaurant_b])),
  ];
  const { data: restaurants } = ids.length
    ? await supabase
        .from('restaurants')
        .select('id, name, address, postcode, phone, slug, halal_classification, branch_label')
        .in('id', ids)
    : { data: [] };
  const byId = new Map((restaurants ?? []).map((r) => [r.id, r as Side]));

  const candidates = (rows ?? [])
    .map((r) => ({
      id: r.id,
      score: r.score,
      signals: (r.signals ?? {}) as Record<string, string | boolean>,
      a: byId.get(r.restaurant_a),
      b: byId.get(r.restaurant_b),
    }))
    .filter((c): c is Candidate => Boolean(c.a && c.b));

  return (
    <AdminPage
      title="Duplicate review"
      width="lg"
      description="Pairs that look like the same physical place. Nothing here has been merged — the queue exists so a person decides, because wrongly merging two real restaurants is far worse than carrying a duplicate for a week."
    >
      <div className="space-y-5">
        <p className="flex items-start gap-2 rounded-2xl border border-line bg-white px-5 py-3.5 text-sm leading-relaxed text-muted shadow-sm">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          Two branches of one chain are not duplicates. Morley&apos;s Peckham and Morley&apos;s
          Brixton share a name and a brand and are two different places — if that is what you are
          looking at, choose <strong className="font-semibold text-ink">Different places</strong>.
        </p>

        <Panel
          title="Waiting"
          action={<Tag tone={candidates.length ? 'ink' : 'neutral'}>{candidates.length}</Tag>}
        >
          <List empty="No candidate duplicates. Re-run scripts/find-duplicates.mjs after the next ingest.">
            {candidates.map((c) => (
              <Row key={c.id} className="flex-col items-stretch gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone={c.score >= 80 ? 'warn' : 'neutral'}>{c.score}/100</Tag>
                  {Object.entries(c.signals).map(([k, v]) => (
                    <span key={k} className="text-xs text-muted">
                      {k}: <span className="font-medium text-ink/75">{String(v)}</span>
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[c.a, c.b].map((side, i) => (
                    <div key={side.id} className="rounded-xl border border-line p-3.5">
                      <Link
                        href={`/restaurant/${side.slug}`}
                        className="inline-flex items-center gap-1 font-medium text-ink hover:underline"
                      >
                        {side.name}
                        <ArrowUpRightIcon className="h-3.5 w-3.5 text-subtle" />
                      </Link>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{side.address}</p>
                      <p className="mt-1 text-xs text-subtle">
                        {side.phone ?? 'no phone'} · {side.halal_classification}
                        {side.branch_label ? ` · ${side.branch_label}` : ''}
                      </p>
                      <form
                        action={mergeDuplicate.bind(
                          null,
                          c.id,
                          side.id,
                          i === 0 ? c.b.id : c.a.id
                        )}
                        className="mt-3"
                      >
                        <ConfirmSubmitButton
                          message={`Keep "${side.name}" and merge the other record into it? The other record is kept but hidden from search, so this is reversible.`}
                          className="inline-flex min-h-[36px] w-full items-center justify-center rounded-full bg-ink px-4 text-xs font-semibold text-white transition hover:bg-accent-ink"
                        >
                          Keep this one
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  ))}
                </div>

                <form action={markDistinct.bind(null, c.id)}>
                  <button className="inline-flex min-h-[36px] items-center rounded-full border border-line px-4 text-xs font-semibold text-ink transition hover:border-ink/30">
                    Different places
                  </button>
                </form>
              </Row>
            ))}
          </List>
        </Panel>
      </div>
    </AdminPage>
  );
}
