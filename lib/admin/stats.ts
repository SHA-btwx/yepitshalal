import { cache } from 'react';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { FOUNDERS_CAP } from '@/lib/founders';
import type { Inbox } from '@/lib/site';
import { loadInbox, statusOf } from './inbox';

// The admin's own numbers, from the database: what is waiting on somebody,
// and the shape of the catalogue. Head-only counts, so nothing but the number
// crosses the wire.

export interface Waiting {
  messages: number;
  submissions: number;
  checks: number;
  claims: number;
}

/** What is waiting on a person. The sidebar badges and the overview's first row. */
export const waitingCounts = cache(async (): Promise<Waiting> => {
  const db = createAdminSupabase();
  const [inbox, submissions, checks, claims] = await Promise.all([
    loadInbox(),
    db.from('restaurant_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db
      .from('verification_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['awaiting_slot', 'queued', 'in_review', 'pending_qc']),
    db.from('restaurant_ownership_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  return {
    messages: inbox.items.filter((i) => statusOf(i) === 'to_answer').length,
    submissions: submissions.count ?? 0,
    checks: checks.count ?? 0,
    claims: claims.count ?? 0,
  };
});

export interface Catalogue {
  /** The four labels a visitor can see, in the order the site shows them. */
  labels: { fullyHalal: number; halalOptions: number; unverified: number; worthAsking: number };
  checkedByUs: number;
  founders: { claimed: number; cap: number };
  supporters: number;
  whereNext: number;
  languageRequests: number;
}

export async function catalogue(): Promise<Catalogue> {
  const db = createAdminSupabase();
  const listed = () =>
    db.from('restaurants').select('id', { count: 'exact', head: true }).eq('is_listed', true).is('merged_into', null);

  // A listing with no evidence at all shows as "Worth asking" whatever its
  // stored classification says (statusOf in lib/types.ts), so the three
  // evidence labels only count places that have evidence.
  const [full, options, unverified, worthAsking, checked, founders, supporters, whereNext, languages] =
    await Promise.all([
      listed().not('halal_evidence_strength', 'is', null).eq('halal_classification', 'fully_halal'),
      listed().not('halal_evidence_strength', 'is', null).eq('halal_classification', 'halal_options'),
      listed().not('halal_evidence_strength', 'is', null).eq('halal_classification', 'unverified'),
      listed().is('halal_evidence_strength', null),
      listed().eq('checked_by_us', true),
      db
        .from('founder_applications')
        .select('id', { count: 'exact', head: true })
        .eq('tier', 'founder')
        .neq('status', 'rejected'),
      db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('subscribers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('language_requests').select('id', { count: 'exact', head: true }),
    ]);

  return {
    labels: {
      fullyHalal: full.count ?? 0,
      halalOptions: options.count ?? 0,
      unverified: unverified.count ?? 0,
      worthAsking: worthAsking.count ?? 0,
    },
    checkedByUs: checked.count ?? 0,
    founders: { claimed: founders.count ?? 0, cap: FOUNDERS_CAP },
    supporters: supporters.count ?? 0,
    whereNext: whereNext.count ?? 0,
    languageRequests: languages.count ?? 0,
  };
}

/** A calendar day in London, as YYYY-MM-DD, so a message at 00:30 BST lands on the right day. */
export function londonDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(date);
}

export function lastDays(days: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) out.push(londonDay(new Date(now - i * 86_400_000)));
  return out;
}

export interface MessagesByDay {
  days: string[];
  /** Per day, per address: General (hello@), Business (info@), Support (help@). */
  counts: Record<Inbox, number>[];
  total: number;
  previousTotal: number;
}

/** Messages that arrived each day, split by the address they went to. */
export async function messagesByDay(days: number): Promise<MessagesByDay> {
  const { items } = await loadInbox();
  const range = lastDays(days);
  const index = new Map(range.map((d, i) => [d, i]));
  const counts = range.map(() => ({ hello: 0, info: 0, help: 0 }));
  const start = Date.now() - days * 86_400_000;
  let previousTotal = 0;
  for (const item of items) {
    const at = new Date(item.createdAt);
    const i = index.get(londonDay(at));
    if (i !== undefined) counts[i][item.inbox]++;
    else if (at.getTime() < start && at.getTime() >= start - days * 86_400_000) previousTotal++;
  }
  const total = counts.reduce((sum, c) => sum + c.hello + c.info + c.help, 0);
  return { days: range, counts, total, previousTotal };
}
