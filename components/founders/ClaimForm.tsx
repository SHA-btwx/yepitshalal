'use client';

import { useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { ArrowRightIcon, CheckIcon, InfoIcon } from '../icons';
import { fieldHint, fieldInput, fieldLabel, formError } from '../form';
import { ctaPrimary, ctaSecondary } from '../cta';
import { Swap } from '../motion/Swap';
import { Free } from '../Free';
import { useAvailability } from './AvailabilityProvider';
import { AnimatedNumber } from './LiveCount';
import { OfferList, standardOffer } from './Offers';
import { trackFounders } from './track';
import {
  FOUNDER,
  hasSubstance,
  isOpen,
  parseContact,
  spotsLeft,
  type ClaimError,
  type ClaimResponse,
  type ContactVia,
} from '@/lib/founders';

// Four questions, one button. Built to be finished standing up at a festival
// stall, one thumb on a phone, in about thirty seconds.
//
// The button says what the programme can still give: "Join the 100 Founders
// Club now" while spots are left, "List my restaurant for free" once they have
// gone. Neither is a promise: the database decides as the form arrives, and
// the answer says exactly what this restaurant got. The count shown here is
// read again when somebody starts typing.

type FieldName = NonNullable<ClaimError['field']>;

const MESSAGES: Record<FieldName, string> = {
  business_name: 'Add the name of your restaurant or business.',
  location: 'Add where you are in London: a postcode, or the area or market.',
  contact_name: 'Add your name and role, like "Aisha, Owner".',
  contact: 'Add your Instagram handle, like @yourplace, or a phone number.',
};

const ORDER: FieldName[] = ['business_name', 'location', 'contact_name', 'contact'];

function newToken(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return '';
  }
}

export function ClaimForm() {
  const { availability, refresh, apply, source } = useAvailability();
  // An unknown count is treated as open: the server decides either way.
  const open = availability ? isOpen(availability) : true;
  const [token, setToken] = useState(newToken);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formErrorText, setFormErrorText] = useState<string | null>(null);
  const [done, setDone] = useState<ClaimResponse | null>(null);
  // The last spot went while this person was filling the form in.
  const [justFilled, setJustFilled] = useState(false);
  const started = useRef(false);
  const wasOpen = useRef(open);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const uid = useId();

  // The form stays put when the programme fills: what they typed is kept, and
  // they are told plainly what sending it will now mean.
  useEffect(() => {
    if (wasOpen.current && !open && started.current) setJustFilled(true);
    if (open) setJustFilled(false);
    wasOpen.current = open;
  }, [open]);

  function onFirstFocus() {
    if (started.current) return;
    started.current = true;
    trackFounders('founders_form_started', { state: open ? 'open' : 'full' });
    refresh();
  }

  function focusField(name: FieldName) {
    const el = formRef.current?.elements.namedItem(name);
    if (el instanceof HTMLInputElement) el.focus();
  }

  function validate(data: Record<string, string>): Partial<Record<FieldName, string>> {
    const errors: Partial<Record<FieldName, string>> = {};
    if (!hasSubstance(data.business_name?.trim() || null)) errors.business_name = MESSAGES.business_name;
    if (!hasSubstance(data.location?.trim() || null)) errors.location = MESSAGES.location;
    if (!hasSubstance(data.contact_name?.trim() || null)) errors.contact_name = MESSAGES.contact_name;
    if (!data.contact?.trim() || !parseContact(data.contact)) errors.contact = MESSAGES.contact;
    return errors;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const data = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;

    const errors = validate(data);
    setFormErrorText(null);
    setFieldErrors(errors);
    const first = ORDER.find((f) => errors[f]);
    if (first) {
      trackFounders('founders_form_error', { kind: 'validation' });
      focusField(first);
      return;
    }

    setSubmitting(true);
    trackFounders('founders_form_submitted', { state: open ? 'open' : 'full' });
    try {
      const res = await fetch('/api/founders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, client_token: token, source }),
      });
      const json = (await res.json().catch(() => ({}))) as Partial<ClaimResponse & ClaimError>;
      if (!res.ok || !('outcome' in json)) {
        const message = json.error ?? 'Something went wrong. Please try again.';
        trackFounders('founders_form_error', {
          kind: res.status === 429 ? 'rate_limited' : res.status >= 500 ? 'server' : 'validation',
        });
        if (json.field && ORDER.includes(json.field)) {
          setFieldErrors({ [json.field]: message });
          focusField(json.field);
        } else {
          setFormErrorText(message);
          requestAnimationFrame(() => errorRef.current?.focus());
        }
        return;
      }

      const answer = json as ClaimResponse;
      if (answer.outcome !== 'received') apply({ claimed: answer.claimed, cap: answer.cap });
      trackFounders('founders_application_result', {
        outcome: answer.outcome,
        tier: answer.outcome === 'duplicate' ? answer.tier : answer.outcome === 'founder' ? 'founder' : 'standard',
      });
      setDone(answer);
      requestAnimationFrame(() => {
        doneRef.current?.focus();
        doneRef.current?.closest('[data-claim-card]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch {
      setFormErrorText("That didn't send. Check your signal and try again.");
      trackFounders('founders_form_error', { kind: 'network' });
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  }

  function another() {
    setDone(null);
    setFieldErrors({});
    setFormErrorText(null);
    setToken(newToken());
    started.current = false;
  }

  return (
    // scroll-mt clears the sticky 56px site header when the answer is scrolled to.
    <div data-claim-card className="ground-light scroll-mt-20 rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgba(15,37,43,0.06),0_24px_60px_-28px_rgba(4,24,30,0.55)] sm:p-8">
      <Swap id={done ? `done-${done.outcome}` : 'form'}>
        {done ? (
          <Answer answer={done} headingRef={doneRef} onAnother={another} />
        ) : (
          <>
            <FormHeader open={open} />

            {justFilled && (
              <p role="status" className="mt-5 rounded-xl bg-sand px-4 py-3 text-sm font-medium leading-relaxed text-ink ring-1 ring-sand-line">
                The last Founder spot has just been claimed. You can still send this, and your
                restaurant gets a <Free>free</Free> standard listing.
              </p>
            )}

            <form
              ref={formRef}
              onSubmit={onSubmit}
              onFocus={onFirstFocus}
              noValidate
              className="mt-6 space-y-5"
              aria-describedby={`${uid}-agreement`}
            >
              {/* Nobody sees this; bots fill it in. */}
              <input type="text" name="company_website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

              <Field
                name="business_name"
                label="Restaurant or business name"
                autoComplete="organization"
                autoCapitalize="words"
                enterKeyHint="next"
                maxLength={120}
                error={fieldErrors.business_name}
              />
              <Field
                name="location"
                label="Location or postcode in London"
                hint="A postcode is best. A market or area works too."
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="next"
                maxLength={120}
                error={fieldErrors.location}
              />
              <Field
                name="contact_name"
                label="Your name and role"
                placeholder="Aisha, Owner"
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                maxLength={120}
                error={fieldErrors.contact_name}
              />
              <Field
                name="contact"
                label="Instagram handle or phone number"
                placeholder="@yourplace or 07…"
                hint="So I can reach you. Never published, never shared."
                autoComplete="tel"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                maxLength={100}
                error={fieldErrors.contact}
              />

              {formErrorText && (
                <p ref={errorRef} tabIndex={-1} role="alert" className={formError}>
                  {formErrorText}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={clsx(ctaPrimary, 'group w-full min-h-[56px] text-[15px]')}
              >
                {submitting
                  ? open
                    ? 'Claiming your spot…'
                    : 'Sending…'
                  : open
                    ? 'Join the 100 Founders Club now'
                    : 'List my restaurant for free'}
                {!submitting && (
                  <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" />
                )}
              </button>

              <p id={`${uid}-agreement`} className="text-[13px] leading-relaxed text-muted">
                {open ? (
                  <>
                    By joining, you&apos;re happy for us to repost the food videos you send us or tag us
                    in, and you&apos;ll keep your menu and halal details accurate. That&apos;s the whole
                    deal.{' '}
                  </>
                ) : (
                  <>Your details are only used to set up your listing. </>
                )}
                <a href="/privacy" className="font-semibold text-accent-ink underline decoration-accent-ink/30 underline-offset-[3px] hover:decoration-accent-ink">
                  How we use your details
                </a>
              </p>
            </form>
          </>
        )}
      </Swap>
    </div>
  );
}

function FormHeader({ open }: { open: boolean }) {
  const { availability } = useAvailability();

  if (!open) {
    return (
      <div>
        <h2 className="text-balance font-display text-[1.6rem] font-semibold leading-tight text-ink sm:text-[1.9rem]">
          Founder spots are full. Add your restaurant to YepItsHalal.
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Submit your restaurant for a <Free>free</Free> standard listing. It includes:
        </p>
        <OfferList items={standardOffer()} className="mt-4" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-[1.6rem] font-semibold leading-tight text-ink sm:text-[1.9rem]">
        Claim your Founder spot
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        {availability ? (
          <>
            <strong className="font-semibold text-ink">
              {availability.claimed === 0 ? (
                <>All {availability.cap} spots are open.</>
              ) : (
                <>
                  <AnimatedNumber value={spotsLeft(availability)} /> of {availability.cap} left.
                </>
              )}
            </strong>{' '}
            Four questions, about 30 seconds, and it&apos;s <Free>free</Free>.
          </>
        ) : (
          <>
            Four questions, about 30 seconds, and it&apos;s <Free>free</Free>. The moment you send
            it, our database tells you which spot is yours.
          </>
        )}
      </p>
    </div>
  );
}

function Field({
  name,
  label,
  hint,
  error,
  ...props
}: {
  name: FieldName;
  label: string;
  hint?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        className={clsx(
          fieldInput,
          'min-h-[52px]',
          error && 'border-halal-partialInk/60 focus:border-halal-partialInk focus:ring-halal-partialInk/20'
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-halal-partialInk">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className={fieldHint}>
          {hint}
        </p>
      )}
    </div>
  );
}

function reachLine(via: ContactVia): string {
  return via === 'instagram'
    ? "I'll message you myself on Instagram."
    : "I'll get in touch myself on the number you gave me.";
}

function Answer({
  answer,
  headingRef,
  onAnother,
}: {
  answer: ClaimResponse;
  headingRef: React.RefObject<HTMLHeadingElement>;
  onAnother: () => void;
}) {
  const heading = 'font-display text-[1.6rem] font-semibold leading-tight text-ink focus:outline-none sm:text-[1.9rem]';

  if (answer.outcome === 'received') {
    return (
      <div role="status">
        <h2 ref={headingRef} tabIndex={-1} className={heading}>
          Thanks, that&apos;s reached us.
        </h2>
      </div>
    );
  }

  const isFounder =
    answer.outcome === 'founder' || (answer.outcome === 'duplicate' && answer.tier === 'founder');
  const number = answer.outcome === 'founder' ? answer.founderNumber : answer.outcome === 'duplicate' ? answer.founderNumber : null;

  return (
    <div role="status">
      <span
        className={clsx(
          'inline-flex h-12 w-12 items-center justify-center rounded-full',
          isFounder ? 'bg-forest-deep text-accent-onDark' : 'bg-accent-soft text-accent-ink'
        )}
      >
        <CheckIcon className="h-6 w-6" strokeWidth={2} />
      </span>

      {answer.outcome === 'founder' && (
        <>
          <h2 ref={headingRef} tabIndex={-1} className={clsx(heading, 'mt-4')}>
            You&apos;re in. You&apos;re Founder #{answer.founderNumber} of {answer.cap}.
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            {answer.businessName} is one of the first {answer.cap} YepItsHalal Founders, and that&apos;s
            yours for life.
          </p>
        </>
      )}

      {answer.outcome === 'standard' && (
        <>
          <h2 ref={headingRef} tabIndex={-1} className={clsx(heading, 'mt-4')}>
            You&apos;re in.
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            The {answer.cap} Founder places had already been claimed, so this submission isn&apos;t
            Founder status. {answer.businessName} has still been submitted for a <Free>free</Free>{' '}
            YepItsHalal listing and the standard free restaurant features:
          </p>
          <OfferList items={standardOffer()} className="mt-4" />
        </>
      )}

      {answer.outcome === 'duplicate' && (
        <>
          <h2 ref={headingRef} tabIndex={-1} className={clsx(heading, 'mt-4')}>
            {answer.businessName} is already in.
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            {isFounder && number
              ? `You're Founder #${number} of ${answer.cap}. Your spot is safe, and sending the form again doesn't use another one.`
              : "It's down for a free standard listing. Sending the form again doesn't change anything, so there's nothing more to do."}
          </p>
        </>
      )}

      <div className="mt-6 border-t border-line pt-5">
        <h3 className="font-display text-lg font-semibold text-ink">What happens next</h3>
        <ol className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink/80">
          <li className="flex gap-3">
            <Step n={1} />
            <span>{reachLine(answer.contactVia)}</span>
          </li>
          <li className="flex gap-3">
            <Step n={2} />
            <span>We set up your listing together: hours, menu, halal details and photos.</span>
          </li>
          <li className="flex gap-3">
            <Step n={3} />
            <span>
              {isFounder ? (
                <>
                  When Discover opens, your 3 reel slots are waiting, <Free>free, forever</Free>.
                </>
              ) : (
                <>
                  When Discover opens, your <Free>free</Free> reel can go on it.
                </>
              )}
            </span>
          </li>
        </ol>
        <p className="mt-5 text-sm leading-relaxed text-muted">
          Can&apos;t wait? Message me on Instagram,{' '}
          <a
            href={FOUNDER.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackFounders('founders_instagram_clicked', { where: 'answer' })}
            className="font-semibold text-accent-ink underline decoration-accent-ink/30 underline-offset-[3px] hover:decoration-accent-ink"
          >
            @{FOUNDER.instagramHandle}
          </a>
          , and mention &ldquo;Festival Founder&rdquo;.
        </p>
      </div>

      <button type="button" onClick={onAnother} className={clsx(ctaSecondary, 'mt-6 w-full sm:w-auto')}>
        Add another location
      </button>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sand text-xs font-semibold text-spice-ink ring-1 ring-sand-line"
    >
      {n}
    </span>
  );
}
