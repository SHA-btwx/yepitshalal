'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { sendReply, type ReplyState } from '@/lib/admin/inbox-actions';
import { ReplyIcon } from '@/components/icons';
import { FIELD } from '../ui';

// The reply box. From and To are shown, never editable: the server reads both
// from the stored message, so what is on screen is exactly where it goes.

function SendButton({ to, disabled }: { to: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-accent-ink active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <ReplyIcon className="h-4 w-4" />
      {pending ? 'Sending…' : `Send to ${to}`}
    </button>
  );
}

export function ReplyComposer({
  itemKey,
  from,
  to,
  subject,
  body,
  quote,
  blocked,
}: {
  itemKey: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  /** The first lines of what they sent, shown so the checkbox says what it adds. */
  quote: string | null;
  /** Why sending is off, if it is. */
  blocked: string | null;
}) {
  const [state, action] = useFormState<ReplyState, FormData>(sendReply, { status: 'idle' });
  const form = useRef<HTMLFormElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // A sent reply clears the box back to the greeting and sign-off.
  useEffect(() => {
    if (state.status === 'sent') form.current?.reset();
  }, [state]);

  // Start the cursor on the empty line between the greeting and the sign-off.
  function focusBody() {
    const el = textarea.current;
    if (!el || el.value !== body) return;
    const at = body.indexOf('\n\n') + 2;
    if (at > 1) el.setSelectionRange(at, at);
  }

  return (
    <form ref={form} action={action} className="space-y-3">
      <input type="hidden" name="key" value={itemKey} />

      <dl className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-sm">
        <dt className="text-subtle">From</dt>
        <dd className="min-w-0 truncate font-medium text-ink">{from}</dd>
        <dt className="text-subtle">To</dt>
        <dd className="min-w-0 truncate font-medium text-ink">{to}</dd>
      </dl>

      <div>
        <label htmlFor={`subject-${itemKey}`} className="mb-1 block text-sm font-medium text-ink">
          Subject
        </label>
        <input id={`subject-${itemKey}`} name="subject" defaultValue={subject} maxLength={200} required className={FIELD} />
      </div>

      <div>
        <label htmlFor={`body-${itemKey}`} className="mb-1 block text-sm font-medium text-ink">
          Your reply
        </label>
        <textarea
          ref={textarea}
          id={`body-${itemKey}`}
          name="body"
          defaultValue={body}
          rows={9}
          required
          onFocus={focusBody}
          className={`${FIELD} resize-y leading-relaxed`}
        />
      </div>

      {quote && (
        <label className="flex items-start gap-2.5 text-sm text-ink/85">
          <input type="checkbox" name="include_quote" defaultChecked className="mt-0.5 h-4 w-4 accent-[#276F0A]" />
          <span>
            Put what they sent underneath, so they know what this answers
            <span className="mt-0.5 block truncate text-xs text-subtle">“{quote}”</span>
          </span>
        </label>
      )}

      {state.status === 'error' && (
        <p role="alert" className="rounded-xl bg-[#FBE7E2] px-3.5 py-2.5 text-sm text-[#9A2E16]">
          {state.message}
        </p>
      )}
      {state.status === 'sent' && (
        <p role="status" className="rounded-xl bg-halal-fullSoft px-3.5 py-2.5 text-sm text-halal-fullInk">
          Sent to {state.to}. A copy went to {from.match(/<(.+)>/)?.[1] ?? 'the inbox'}, and their answer will come back there.
        </p>
      )}
      {blocked && (
        <p className="rounded-xl bg-halal-partialSoft px-3.5 py-2.5 text-sm text-halal-partialInk">{blocked}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-xs text-subtle">Sent through Resend. Nothing is tracked.</p>
        <SendButton to={to} disabled={Boolean(blocked)} />
      </div>
    </form>
  );
}
