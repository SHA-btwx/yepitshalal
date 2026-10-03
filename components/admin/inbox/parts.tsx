import Link from 'next/link';
import clsx from 'clsx';
import {
  INBOX_LABEL,
  SOURCES,
  defaultBody,
  defaultSubject,
  needsReply,
  quoteFor,
  replyFrom,
  statusOf,
  type InboxItem,
} from '@/lib/admin/inbox';
import { logAnswer, markUnread, setArchived } from '@/lib/admin/inbox-actions';
import { ago, stamp } from '@/lib/admin/format';
import { INBOX } from '@/lib/site';
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  InstagramIcon,
  MailIcon,
  PhoneIcon,
} from '@/components/icons';
import { BUTTON_SECONDARY, FIELD } from '../ui';
import { ReplyComposer } from './ReplyComposer';
import { MarkReadOnOpen } from './MarkReadOnOpen';

/** The existing admin page each kind of message is worked on, by its path segment. */
const ADMIN_PAGE: Record<string, string> = {
  submissions: 'Submissions',
  queue: 'Verification queue',
  claims: 'Ownership claims',
  founders: 'Founders',
  demand: 'Where next',
};

export function SourceTag({ item }: { item: Pick<InboxItem, 'source'> }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-semibold text-ink/75">
      {SOURCES[item.source].label}
    </span>
  );
}

export function StatusPill({ item }: { item: InboxItem }) {
  const status = statusOf(item);
  if (status === 'answered')
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-halal-fullInk">
        <CheckIcon className="h-3.5 w-3.5" /> Answered
      </span>
    );
  if (status === 'to_answer')
    return <span className="shrink-0 text-[11px] font-semibold text-accent-ink">To answer</span>;
  if (status === 'archived') return <span className="shrink-0 text-[11px] font-semibold text-subtle">Archived</span>;
  return null;
}

/** Who sent it, as the list shows them: a name, else the address, else the handle. */
export function whoOf(item: InboxItem): string {
  return item.name ?? item.email ?? (item.instagram ? `@${item.instagram}` : null) ?? item.phone ?? 'No contact left';
}

export function MessageRow({ item, href, selected }: { item: InboxItem; href: string; selected?: boolean }) {
  const unread = !item.readAt && !item.archivedAt;
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-current={selected ? 'true' : undefined}
        className={clsx(
          'relative flex gap-3 px-4 py-3.5 transition-colors',
          selected ? 'bg-spice-soft' : 'hover:bg-sand-soft'
        )}
      >
        {selected && <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-spice" />}
        <span
          aria-hidden
          className={clsx('mt-[7px] h-2 w-2 shrink-0 rounded-full', unread ? 'bg-accent' : 'bg-transparent')}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={clsx('truncate text-sm', unread ? 'font-semibold text-ink' : 'font-medium text-ink/85')}>
              {item.title}
            </span>
            <span className="shrink-0 text-[11px] text-subtle">{ago(item.createdAt)}</span>
          </span>
          <span className="mt-1 flex items-center gap-2">
            <SourceTag item={item} />
            <span className="min-w-0 flex-1 truncate text-xs text-muted">{whoOf(item)}</span>
            <StatusPill item={item} />
          </span>
          {unread && <span className="sr-only">Not opened yet.</span>}
        </span>
      </Link>
    </li>
  );
}

function ReachThem({ item }: { item: InboxItem }) {
  const handle = item.instagram;
  const phone = item.phone?.replace(/[^\d+]/g, '');
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">
        The Founders form asks for Instagram or a phone number, not email, so reply there. Then mark it answered
        here, so it leaves the To answer list.
      </p>
      <div className="flex flex-wrap gap-2">
        {handle && (
          <a href={`https://ig.me/m/${encodeURIComponent(handle)}`} target="_blank" rel="noopener noreferrer" className={BUTTON_SECONDARY}>
            <InstagramIcon className="h-4 w-4" /> Message @{handle}
          </a>
        )}
        {phone && (
          <>
            <a href={`tel:${phone}`} className={BUTTON_SECONDARY}>
              <PhoneIcon className="h-4 w-4" /> Call {item.phone}
            </a>
            <a href={`sms:${phone}`} className={BUTTON_SECONDARY}>
              Text
            </a>
          </>
        )}
      </div>
      <form action={logAnswer} className="space-y-3 rounded-xl border border-line bg-sand-soft/60 p-4">
        <input type="hidden" name="key" value={item.key} />
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">How did you answer?</legend>
          <div className="flex flex-wrap gap-2 text-sm">
            {(
              [
                ['instagram', 'Instagram'],
                ['phone', 'Phone or text'],
                ['other', 'Another way'],
              ] as const
            ).map(([value, label], i) => (
              <label
                key={value}
                className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-3 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white"
              >
                <input type="radio" name="channel" value={value} defaultChecked={i === (handle ? 0 : 1)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor={`note-${item.key}`} className="mb-1 block text-sm font-medium text-ink">
            Note, for later <span className="font-normal text-subtle">(optional)</span>
          </label>
          <textarea id={`note-${item.key}`} name="note" rows={2} className={FIELD} placeholder="Set up their listing for Monday" />
        </div>
        <button type="submit" className={BUTTON_SECONDARY}>
          <CheckIcon className="h-4 w-4" /> Mark as answered
        </button>
      </form>
    </div>
  );
}

function Conversation({ item }: { item: InboxItem }) {
  if (item.replies.length === 0) return null;
  return (
    <ol className="space-y-3">
      {item.replies.map((r) => (
        <li key={r.id} className="rounded-xl border border-line bg-white p-4">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle">
            <span className="inline-flex items-center gap-1 font-semibold text-halal-fullInk">
              <CheckIcon className="h-3.5 w-3.5" />
              {r.channel === 'email'
                ? 'You replied by email'
                : r.channel === 'instagram'
                  ? 'Answered on Instagram'
                  : r.channel === 'phone'
                    ? 'Answered by phone or text'
                    : 'Answered another way'}
            </span>
            <span>{stamp(r.createdAt)}</span>
          </p>
          {r.channel === 'email' && (
            <p className="mt-1.5 text-xs text-muted">
              From {r.fromAddress} to {r.toAddress}
            </p>
          )}
          {r.subject && <p className="mt-2 text-sm font-semibold text-ink">{r.subject}</p>}
          {r.body && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">{r.body}</p>}
        </li>
      ))}
    </ol>
  );
}

export function MessageDetail({
  item,
  backHref,
  emailReady,
  stateReady,
}: {
  item: InboxItem;
  backHref: string;
  emailReady: boolean;
  stateReady: boolean;
}) {
  const from = replyFrom(item);
  const quote = quoteFor(item);
  const archived = Boolean(item.archivedAt);
  const blocked = !stateReady
    ? 'Replies are off until the database update (migration 0051) is applied, so no email goes out without a record of it.'
    : !emailReady
      ? 'Email is off until RESEND_API_KEY is added in Vercel. Everything else here works.'
      : null;

  return (
    <article className="min-w-0 rounded-2xl border border-line bg-white shadow-sm">
      <MarkReadOnOpen itemKey={item.key} unread={!item.readAt && stateReady} />

      <header className="border-b border-line p-5">
        <Link
          href={backHref}
          scroll={false}
          className="mb-3 inline-flex min-h-[36px] items-center gap-1.5 text-sm font-semibold text-accent-ink lg:hidden"
        >
          <ArrowLeftIcon className="h-4 w-4" /> All messages
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <SourceTag item={item} />
          <StatusPill item={item} />
        </div>
        <h2 className="mt-2 font-display text-xl font-semibold leading-snug text-ink">{item.title}</h2>
        <p className="mt-1.5 text-sm text-muted">
          {item.name && <span className="font-medium text-ink">{item.name}</span>}
          {item.name && item.email && ' · '}
          {item.email && (
            <a href={`mailto:${item.email}`} className="hover:underline">
              {item.email}
            </a>
          )}
          {!item.name && !item.email && whoOf(item)}
        </p>
        <p className="mt-1 text-xs text-subtle">
          {stamp(item.createdAt)} · went to {INBOX[item.inbox]} ({INBOX_LABEL[item.inbox]})
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {item.adminHref && (
            <Link href={item.adminHref} className={BUTTON_SECONDARY}>
              Open in {ADMIN_PAGE[item.adminHref.split('/')[2]] ?? 'admin'}
            </Link>
          )}
          {item.publicHref && (
            <a href={item.publicHref} target="_blank" rel="noopener noreferrer" className={BUTTON_SECONDARY}>
              View page <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </a>
          )}
          {stateReady && item.readAt && !archived && (
            <form action={markUnread}>
              <input type="hidden" name="key" value={item.key} />
              <button type="submit" className={BUTTON_SECONDARY}>
                Mark unread
              </button>
            </form>
          )}
          {stateReady && (
            <form action={setArchived}>
              <input type="hidden" name="key" value={item.key} />
              <input type="hidden" name="archive" value={archived ? '0' : '1'} />
              <button type="submit" className={BUTTON_SECONDARY}>
                <ArchiveIcon className="h-4 w-4" /> {archived ? 'Move back to inbox' : 'Archive'}
              </button>
            </form>
          )}
        </div>
      </header>

      <div className="space-y-6 p-5">
        {item.message && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">What they wrote</h3>
            <p className="whitespace-pre-wrap rounded-xl bg-sand-soft px-4 py-3 text-[15px] leading-relaxed text-ink">
              {item.message}
            </p>
          </section>
        )}

        {item.fields.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">Details</h3>
            <dl className="divide-y divide-line rounded-xl border border-line">
              {item.fields.map(([label, value]) => (
                <div key={label} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="min-w-0 break-words text-ink">
                    {/^https?:\/\//.test(value) ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-accent-ink hover:underline">
                        {value.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {item.source === 'submission' && (
              <p className="mt-2 text-xs text-subtle">
                What they say about halal is their claim, not a label. It only becomes one through a completed check.
              </p>
            )}
          </section>
        )}

        {item.replies.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">Your answers</h3>
            <Conversation item={item} />
          </section>
        )}

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-subtle">
            <MailIcon className="h-4 w-4" />
            {item.replies.length > 0 ? 'Write again' : 'Reply'}
          </h3>
          {item.email ? (
            <ReplyComposer
              itemKey={item.key}
              from={from.header}
              to={item.email}
              subject={defaultSubject(item)}
              body={defaultBody(item)}
              quote={quote ? quote.lines.join(' ').slice(0, 120) : null}
              blocked={blocked}
            />
          ) : item.instagram || item.phone ? (
            stateReady ? (
              <ReachThem item={item} />
            ) : (
              <p className="text-sm text-muted">{blocked}</p>
            )
          ) : (
            <p className="rounded-xl bg-sand-soft px-4 py-3 text-sm text-muted">
              They did not leave a way to reach them, so there is nobody to reply to.
              {needsReply(item) ? '' : ' Nothing is needed here.'}
            </p>
          )}
        </section>
      </div>
    </article>
  );
}
