import { createAdminSupabase } from '@/lib/supabase/admin';
import { AdminPage, Panel, Tag } from '@/components/admin/ui';
import { InfoIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Catalogue coverage' };

interface CoverageRow {
  district: string;
  outward: string;
  total: number;
  active: number;
  needs_review: number;
  closed: number;
  unverified: number;
  verified: number;
  chain_branches: number;
}

// Rough compass grouping of London postcode districts, so a gap reads as
// "we have almost nothing in the centre" rather than as a list of codes.
const REGION: Record<string, string> = {
  EC: 'Central', WC: 'Central',
  E: 'East', IG: 'East', RM: 'East',
  N: 'North', NW: 'North', EN: 'North',
  SE: 'South', SW: 'South', CR: 'South', BR: 'South', DA: 'South', SM: 'South', KT: 'South',
  W: 'West', UB: 'West', HA: 'West', TW: 'West',
};

export default async function AdminCoveragePage() {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('catalogue_coverage')
    .select('*')
    .order('total', { ascending: false });

  const rows = (data ?? []) as CoverageRow[];

  const byDistrict = new Map<string, CoverageRow>();
  for (const r of rows) {
    const existing = byDistrict.get(r.district);
    byDistrict.set(
      r.district,
      existing
        ? {
            ...existing,
            total: existing.total + r.total,
            active: existing.active + r.active,
            needs_review: existing.needs_review + r.needs_review,
            closed: existing.closed + r.closed,
            unverified: existing.unverified + r.unverified,
            verified: existing.verified + r.verified,
            chain_branches: existing.chain_branches + r.chain_branches,
          }
        : { ...r }
    );
  }

  const districts = [...byDistrict.values()].sort((a, b) => b.total - a.total);
  const grandTotal = districts.reduce((n, d) => n + d.total, 0);
  const busiest = districts[0]?.total ?? 1;

  const byRegion = new Map<string, number>();
  for (const d of districts) {
    const region = REGION[d.district] ?? 'Other';
    byRegion.set(region, (byRegion.get(region) ?? 0) + d.total);
  }

  return (
    <AdminPage
      title="Catalogue coverage"
      width="lg"
      description={`${grandTotal.toLocaleString()} locations. The point of this page is to show where the gaps are, so ingestion can be aimed rather than repeated where we are already strong.`}
    >
      <div className="space-y-5">
        <Panel title="By region">
          <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-3">
            {['Central', 'East', 'North', 'South', 'West', 'Other'].map((region) => {
              const n = byRegion.get(region) ?? 0;
              const thin = n < grandTotal * 0.05;
              return (
                <div key={region} className="rounded-xl border border-line px-3.5 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                    {region}
                  </p>
                  <p className="mt-0.5 font-display text-xl font-semibold text-ink">{n}</p>
                  {thin && n >= 0 && (
                    <p className="mt-1 text-[11px] font-medium text-halal-partialInk">
                      Thin coverage
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="By postcode district" action={<Tag>{districts.length}</Tag>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-subtle">
                  <th className="px-5 py-2.5 font-medium">District</th>
                  <th className="px-3 py-2.5 font-medium">Total</th>
                  <th className="px-3 py-2.5 font-medium">Verified</th>
                  <th className="px-3 py-2.5 font-medium">Unverified</th>
                  <th className="px-3 py-2.5 font-medium">Needs review</th>
                  <th className="px-3 py-2.5 font-medium">Chain</th>
                  <th className="px-5 py-2.5 font-medium">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {districts.map((d) => (
                  <tr key={d.district}>
                    <td className="px-5 py-2.5">
                      <span className="font-medium text-ink">{d.district}</span>
                      <span className="ml-2 text-xs text-subtle">
                        {REGION[d.district] ?? 'Other'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-ink/80">{d.total}</td>
                    <td className="px-3 py-2.5 tabular-nums text-halal-fullInk">{d.verified}</td>
                    <td className="px-3 py-2.5 tabular-nums text-muted">{d.unverified}</td>
                    <td className="px-3 py-2.5 tabular-nums text-muted">{d.needs_review}</td>
                    <td className="px-3 py-2.5 tabular-nums text-muted">{d.chain_branches}</td>
                    <td className="px-5 py-2.5">
                      <span className="flex h-1.5 w-24 overflow-hidden rounded-full bg-black/10">
                        <span
                          className="h-full rounded-full bg-accent-ink"
                          style={{ width: `${Math.round((d.total / busiest) * 100)}%` }}
                        />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          Districts come from the postcode on each record, so anything without a postcode groups
          under ??. Verified counts a halal classification that is not Unverified — it is not a
          measure of how good the data is, only of how much has been checked.
        </p>
      </div>
    </AdminPage>
  );
}
