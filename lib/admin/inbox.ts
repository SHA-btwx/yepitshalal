import { cache } from 'react';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { INBOX, SITE_URL, type Inbox } from '@/lib/site';

// Everything people send through the site, as one list.
//
// Each form keeps writing to its own table, exactly as before. This module
// reads all seven, turns each row into the same shape, and lays the inbox's
// own state over the top (opened, put away, replied to). The routing of a
// message to hello@, info@ or help@ repeats what the form's own route does
// when it emails the inbox, so a reply always leaves from the address the
// message arrived at, and the person's answer comes back to it.

export const SOURCES = {
  feedback: { label: 'Feedback', hint: 'The feedback box at the bottom of every page' },
  submission: { label: 'Restaurants', hint: 'A restaurant sent in, or a change to one we list' },
  verification: { label: 'Verification', hint: 'Asked us to check a restaurant' },
  ownership: { label: 'Ownership', hint: 'Asked to manage a listing' },
  founder: { label: 'Founders', hint: 'Claimed a 100 Founders Club spot' },
  where_next: { label: 'Where next', hint: 'Asked to be told when we reach their area' },
  language: { label: 'Language', hint: 'Asked for the site in their language' },
} as const;

export type Source = keyof typeof SOURCES;
export const SOURCE_KEYS = Object.keys(SOURCES) as Source[];

/** The three addresses, as the inbox names them to the person reading it. */
export const INBOX_LABEL: Record<Inbox, string> = {
  hello: 'General',
  info: 'Business',
  help: 'Support',
};

export type ReplyChannel = 'email' | 'instagram' | 'phone' | 'other';

export interface InboxReply {
  id: string;
  channel: ReplyChannel;
  fromAddress: string | null;
  toAddress: string | null;
  subject: string | null;
  body: string | null;
  createdAt: string;
}

export interface InboxItem {
  /** "feedback:<uuid>", the one id the inbox passes around. */
  key: string;
  source: Source;
  id: string;
  createdAt: string;
  /** Which yepitshalal.com address the form emailed, and so which one replies. */
  inbox: Inbox;
  name: string | null;
  /** Only ever an address that passed the same check the forms use. */
  email: string | null;
  instagram: string | null;
  phone: string | null;
  /** One line: what this is about. */
  title: string;
  /** What they wrote in their own words, when the form has a box for it. */
  message: string | null;
  /** Everything else the form sent, in reading order. Empty values are dropped. */
  fields: [label: string, value: string][];
  /** Where the row is worked on: the existing admin page for that form. */
  adminHref: string | null;
  publicHref: string | null;
  /** The source table's own status (pending, queued, approved...), if it has one. */
  workflowStatus: string | null;
  readAt: string | null;
  archivedAt: string | null;
  replies: InboxReply[];
}

export type InboxStatus = 'to_answer' | 'answered' | 'no_reply_needed' | 'archived';

/**
 * Does this message wait on us until somebody answers it?
 *
 * Feedback, restaurants, verification, ownership and Founders are people
 * expecting to hear back. A city or language request is a vote, and its
 * answer is the day we get there, so it never sits in "To answer" by itself.
 * Anything without a way to reach the person cannot be answered, so it is
 * not counted against us either.
 */
export function needsReply(item: InboxItem): boolean {
  if (item.workflowStatus === 'rejected') return false;
  const reachable = Boolean(item.email || item.instagram || item.phone);
  if (!reachable) return false;
  switch (item.source) {
    case 'feedback':
    case 'submission':
    case 'verification':
    case 'ownership':
    case 'founder':
      return true;
    case 'where_next':
    case 'language':
      return false;
  }
}

export function statusOf(item: InboxItem): InboxStatus {
  if (item.archivedAt) return 'archived';
  if (item.replies.length > 0) return 'answered';
  return needsReply(item) ? 'to_answer' : 'no_reply_needed';
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseKey(key: string): { source: Source; id: string } | null {
  const [source, id] = key.split(':');
  if (!source || !id || !(source in SOURCES) || !UUID.test(id)) return null;
  return { source: source as Source, id };
}

function email(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return EMAIL.test(v) ? v : null;
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function yesNo(value: boolean | null | undefined): string | null {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'Not said';
}

/** PostgREST hands an embedded row back as an object or a one-item array. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function fieldsOf(pairs: [string, string | null | undefined][]): [string, string][] {
  return pairs.filter((p): p is [string, string] => typeof p[1] === 'string' && p[1].trim() !== '');
}

const CLAIM: Record<string, string> = {
  fully_halal: 'All the meat is halal',
  halal_options: 'Some halal options',
};
const PRAYER: Record<string, string> = {
  prayer_room: 'A prayer room',
  space: 'Somewhere to pray',
  none: 'Nowhere to pray',
};

type Row = Record<string, unknown>;

function fromFeedback(r: Row): Omit<InboxItem, 'readAt' | 'archivedAt' | 'replies'> {
  const message = text(r.message);
  return {
    key: `feedback:${r.id}`,
    source: 'feedback',
    id: String(r.id),
    createdAt: String(r.created_at),
    inbox: 'hello',
    name: null,
    email: email(r.email),
    instagram: null,
    phone: null,
    title: message ? message.split('\n')[0].slice(0, 90) : 'Feedback',
    message,
    fields: fieldsOf([['Sent from', text(r.page_url)]]),
    adminHref: null,
    publicHref: text(r.page_url),
    workflowStatus: text(r.status),
  };
}

function fromSubscriber(r: Row): Omit<InboxItem, 'readAt' | 'archivedAt' | 'replies'> {
  const place = text(r.wanted_place_label) ?? text(r.wanted_city);
  return {
    key: `where_next:${r.id}`,
    source: 'where_next',
    id: String(r.id),
    createdAt: String(r.created_at),
    inbox: 'hello',
    name: null,
    email: email(r.email),
    instagram: null,
    phone: null,
    title: place ? `Wants YepItsHalal in ${place}` : 'Wants YepItsHalal outside London',
    message: null,
    fields: fieldsOf([
      ['Asked for', place ?? 'No place given'],
      ['Country', text(r.wanted_country)],
      ['Where on the site', text(r.source)],
      ['Page language', text(r.locale)],
      ['On the list', r.status === 'active' ? 'Yes' : text(r.status)],
    ]),
    adminHref: '/admin/demand',
    publicHref: null,
    workflowStatus: text(r.status),
  };
}

function fromLanguage(r: Row): Omit<InboxItem, 'readAt' | 'archivedAt' | 'replies'> {
  const language = text(r.language) ?? 'a language';
  return {
    key: `language:${r.id}`,
    source: 'language',
    id: String(r.id),
    createdAt: String(r.created_at),
    inbox: 'hello',
    name: null,
    email: email(r.email),
    instagram: null,
    phone: null,
    title: `Wants the site in ${language}`,
    message: null,
    fields: fieldsOf([
      ['Language', language],
      ['Asked from', text(r.source)],
      ['Page language', text(r.locale)],
    ]),
    adminHref: '/admin/demand',
    publicHref: null,
    workflowStatus: null,
  };
}

function fromSubmission(r: Row): Omit<InboxItem, 'readAt' | 'archivedAt' | 'replies'> {
  const name = text(r.name) ?? 'A restaurant';
  const isEdit = Boolean(r.restaurant_id);
  return {
    key: `submission:${r.id}`,
    source: 'submission',
    id: String(r.id),
    createdAt: String(r.created_at),
    // A new restaurant is business, so info@. A change to a place we already
    // list is a correction, so help@. The same split the submit route makes.
    inbox: isEdit ? 'help' : 'info',
    name: text(r.contact_name),
    email: email(r.contact_email),
    instagram: null,
    phone: null,
    title: isEdit ? `Change suggested for ${name}` : `New restaurant: ${name}`,
    message: text(r.notes),
    fields: fieldsOf([
      ['Restaurant', name],
      ['Address', [text(r.address), text(r.postcode)].filter(Boolean).join(', ') || null],
      ['Borough', text(r.borough)],
      ['Cuisine', text(r.cuisine)],
      ['Halal, as they say it', r.halal_claim ? CLAIM[String(r.halal_claim)] ?? String(r.halal_claim) : 'Not said'],
      ['Serves pork', yesNo(r.serves_pork as boolean | null)],
      ['Serves alcohol', yesNo(r.serves_alcohol as boolean | null)],
      ['Certification body', text(r.certification_body)],
      ['Evidence link', text(r.evidence_url)],
      ['Prayer space', r.prayer_facility ? PRAYER[String(r.prayer_facility)] ?? null : null],
      ['Phone', text(r.phone)],
      ['Website', text(r.website)],
      ['Instagram', text(r.instagram)],
      ['They are', text(r.relationship)],
    ]),
    adminHref: `/admin/submissions/${r.id}`,
    publicHref: null,
    workflowStatus: text(r.status),
  };
}

function fromVerification(r: Row): Omit<InboxItem, 'readAt' | 'archivedAt' | 'replies'> {
  const restaurant = one(r.restaurants as { name: string; slug: string } | null);
  const name = restaurant?.name ?? 'a restaurant';
  return {
    key: `verification:${r.id}`,
    source: 'verification',
    id: String(r.id),
    createdAt: String(r.entered_queue_at),
    inbox: 'help',
    name: text(r.contact_name),
    email: email(r.contact_email),
    instagram: null,
    phone: null,
    title: `Check ${name}`,
    message: null,
    fields: fieldsOf([
      ['Restaurant', name],
      ['Queue', r.queue_type === 'priority' ? 'Priority (paid)' : 'Free'],
      ['Where it is', text(r.status)?.replace(/_/g, ' ')],
    ]),
    adminHref: `/admin/queue/${r.id}`,
    publicHref: restaurant?.slug ? `/restaurant/${restaurant.slug}` : null,
    workflowStatus: text(r.status),
  };
}

function fromOwnership(r: Row): Omit<InboxItem, 'readAt' | 'archivedAt' | 'replies'> {
  const restaurant = one(r.restaurants as { name: string; slug: string } | null);
  const user = one(r.users as { email: string } | null);
  const name = restaurant?.name ?? 'a restaurant';
  return {
    key: `ownership:${r.id}`,
    source: 'ownership',
    id: String(r.id),
    createdAt: String(r.created_at),
    inbox: 'info',
    name: null,
    email: email(user?.email),
    instagram: null,
    phone: null,
    title: `Wants to manage ${name}`,
    message: text(r.contact_note),
    fields: fieldsOf([
      ['Restaurant', name],
      ['Signed in as', text(user?.email)],
    ]),
    adminHref: '/admin/claims',
    publicHref: restaurant?.slug ? `/restaurant/${restaurant.slug}` : null,
    workflowStatus: text(r.status),
  };
}

function fromFounder(r: Row): Omit<InboxItem, 'readAt' | 'archivedAt' | 'replies'> {
  const business = text(r.business_name) ?? 'A business';
  const isFounder = r.tier === 'founder' && r.founder_number !== null;
  return {
    key: `founder:${r.id}`,
    source: 'founder',
    id: String(r.id),
    createdAt: String(r.created_at),
    inbox: 'info',
    name: text(r.contact_name),
    // The Founders form asks for Instagram or a phone number, never email.
    email: null,
    instagram: text(r.instagram)?.replace(/^@/, '') ?? null,
    phone: text(r.phone),
    title: isFounder ? `Founder #${r.founder_number}: ${business}` : `Free listing: ${business}`,
    message: null,
    fields: fieldsOf([
      ['Business', business],
      ['Status', isFounder ? `Founder #${r.founder_number}` : 'Standard free listing'],
      ['Location, as typed', text(r.location)],
      ['Postcode', [text(r.postcode), text(r.borough)].filter(Boolean).join(', ') || null],
      ['Came from', text(r.source)],
    ]),
    adminHref: '/admin/founders',
    publicHref: null,
    workflowStatus: text(r.status),
  };
}

// Enough to be the whole inbox for a long while: the site has had no form
// rows at all as of October 2026. When any one form passes this, the oldest
// fall off this list but stay on that form's own admin page.
const PER_SOURCE = 300;

export interface InboxData {
  items: InboxItem[];
  /** False until migration 0051 is applied: messages show, replies cannot be stored. */
  stateReady: boolean;
}

/** Loads once per request, however many components ask. */
export const loadInbox = cache(async (): Promise<InboxData> => {
  const db = createAdminSupabase();

  const [feedback, subscribers, languages, submissions, verifications, ownership, founders, state, replies] =
    await Promise.all([
      db.from('site_feedback').select('id, email, message, page_url, status, created_at')
        .order('created_at', { ascending: false }).limit(PER_SOURCE),
      db.from('subscribers')
        .select('id, email, wanted_city, wanted_place_label, wanted_country, source, locale, status, created_at')
        .order('created_at', { ascending: false }).limit(PER_SOURCE),
      db.from('language_requests').select('id, language, email, source, locale, created_at')
        .order('created_at', { ascending: false }).limit(PER_SOURCE),
      db.from('restaurant_submissions')
        .select('id, status, created_at, name, address, postcode, borough, phone, website, instagram, cuisine, relationship, contact_name, contact_email, halal_claim, serves_pork, serves_alcohol, certification_body, evidence_url, notes, restaurant_id, prayer_facility')
        .order('created_at', { ascending: false }).limit(PER_SOURCE),
      db.from('verification_requests')
        .select('id, queue_type, status, entered_queue_at, contact_name, contact_email, restaurants(name, slug)')
        .order('entered_queue_at', { ascending: false }).limit(PER_SOURCE),
      db.from('restaurant_ownership_claims')
        .select('id, status, contact_note, created_at, restaurants(name, slug), users(email)')
        .order('created_at', { ascending: false }).limit(PER_SOURCE),
      db.from('founder_applications')
        .select('id, created_at, tier, founder_number, status, business_name, location, postcode, borough, contact_name, instagram, phone, source')
        .order('created_at', { ascending: false }).limit(PER_SOURCE),
      db.from('admin_inbox_state').select('source, source_id, read_at, archived_at'),
      db.from('admin_replies')
        .select('id, source, source_id, channel, from_address, to_address, subject, body, created_at')
        .order('created_at', { ascending: true }),
    ]);

  const base = [
    ...((feedback.data ?? []) as Row[]).map(fromFeedback),
    ...((subscribers.data ?? []) as Row[]).map(fromSubscriber),
    ...((languages.data ?? []) as Row[]).map(fromLanguage),
    ...((submissions.data ?? []) as Row[]).map(fromSubmission),
    ...((verifications.data ?? []) as Row[]).map(fromVerification),
    ...((ownership.data ?? []) as Row[]).map(fromOwnership),
    ...((founders.data ?? []) as Row[]).map(fromFounder),
  ];

  const stateByKey = new Map<string, { read_at: string | null; archived_at: string | null }>();
  for (const s of (state.data ?? []) as Row[]) {
    stateByKey.set(`${s.source}:${s.source_id}`, {
      read_at: (s.read_at as string | null) ?? null,
      archived_at: (s.archived_at as string | null) ?? null,
    });
  }

  const repliesByKey = new Map<string, InboxReply[]>();
  for (const r of (replies.data ?? []) as Row[]) {
    const key = `${r.source}:${r.source_id}`;
    const list = repliesByKey.get(key) ?? [];
    list.push({
      id: String(r.id),
      channel: r.channel as ReplyChannel,
      fromAddress: (r.from_address as string | null) ?? null,
      toAddress: (r.to_address as string | null) ?? null,
      subject: (r.subject as string | null) ?? null,
      body: (r.body as string | null) ?? null,
      createdAt: String(r.created_at),
    });
    repliesByKey.set(key, list);
  }

  const items: InboxItem[] = base
    .map((item) => ({
      ...item,
      readAt: stateByKey.get(item.key)?.read_at ?? null,
      archivedAt: stateByKey.get(item.key)?.archived_at ?? null,
      replies: repliesByKey.get(item.key) ?? [],
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { items, stateReady: !state.error && !replies.error };
});

export async function getInboxItem(key: string): Promise<InboxItem | null> {
  const parsed = parseKey(key);
  if (!parsed) return null;
  const { items } = await loadInbox();
  return items.find((i) => i.key === key) ?? null;
}

// ---------------------------------------------------------------------------
// Writing back. Defaults the composer starts from; the admin edits all of it.

function firstName(name: string | null): string | null {
  const first = name?.trim().split(/\s+/)[0];
  if (!first || first.length < 2 || /\d|@/.test(first)) return null;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function defaultSubject(item: InboxItem): string {
  const restaurant = item.fields.find(([l]) => l === 'Restaurant')?.[1];
  switch (item.source) {
    case 'feedback':
      return 'Your feedback on YepItsHalal';
    case 'where_next': {
      const place = item.fields.find(([l]) => l === 'Asked for')?.[1];
      return place && place !== 'No place given' ? `YepItsHalal in ${place}` : 'YepItsHalal near you';
    }
    case 'language': {
      const language = item.fields.find(([l]) => l === 'Language')?.[1];
      return `YepItsHalal in ${language ?? 'your language'}`;
    }
    case 'submission':
      return item.title.startsWith('Change')
        ? `Your change to ${restaurant ?? 'a listing'}`
        : `${restaurant ?? 'Your restaurant'} on YepItsHalal`;
    case 'verification':
      return `Your request to check ${restaurant ?? 'a restaurant'}`;
    case 'ownership':
      return `Managing ${restaurant ?? 'your restaurant'} on YepItsHalal`;
    case 'founder':
      return 'Your Founders Club spot';
  }
}

export function defaultBody(item: InboxItem): string {
  const first = firstName(item.name);
  return `${first ? `Hi ${first},` : 'Hi,'}\n\n\n\nThanks,\nShabir\nYepItsHalal`;
}

/** What they sent, quoted under the reply so they know what it answers. */
export function quoteFor(item: InboxItem): { intro: string; lines: string[] } | null {
  const date = new Date(item.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London',
  });
  const where = SOURCES[item.source].hint.toLowerCase();
  const lines = item.message
    ? item.message.split('\n')
    : item.fields.slice(0, 3).map(([label, value]) => `${label}: ${value}`);
  if (lines.length === 0) return null;
  return { intro: `On ${date} you sent us this through yepitshalal.com (${where}):`, lines };
}

/** The address a reply leaves from, with a name a mail app can show. */
export function replyFrom(item: InboxItem): { header: string; address: string } {
  const address = INBOX[item.inbox];
  return { header: `YepItsHalal <${address}>`, address };
}

export function absoluteUrl(path: string | null): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${SITE_URL}${path}`;
}
