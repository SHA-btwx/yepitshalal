'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { voteForArea } from '@/lib/supporter-actions';
import { CheckIcon, MapPinIcon } from './icons';

// The one thing supporters get that nobody else does: a say in what we check
// next. The standings shown here are counted in the database, not here, and a
// vote can be changed until the month ends.

export interface VoteArea {
  borough: string;
  /** Places in that borough nobody has checked yet. What a vote would aim at. */
  notChecked: number;
}

export interface VoteRow {
  borough: string;
  votes: number;
  mine: boolean;
}

function SubmitButton({ changing }: { changing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-accent-ink disabled:opacity-60"
    >
      {pending ? 'Saving…' : changing ? 'Change my vote' : 'Cast my vote'}
    </button>
  );
}

export function AreaVote({ areas, tally }: { areas: VoteArea[]; tally: VoteRow[] }) {
  const mine = tally.find((t) => t.mine)?.borough ?? '';
  const [choice, setChoice] = useState(mine || areas[0]?.borough || '');
  const [failed, setFailed] = useState<string | null>(null);
  const month = new Date().toLocaleDateString('en-GB', { month: 'long' });
  const leader = tally[0];

  if (areas.length === 0) return null;

  return (
    <section aria-labelledby="area-vote" className="mt-4 rounded-2xl border border-line bg-white p-5 shadow-sm">
      <h2 id="area-vote" className="flex items-center gap-1.5 font-display text-lg font-semibold text-ink">
        <MapPinIcon className="h-[18px] w-[18px] text-accent-ink" />
        Where should we check next?
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Pick an area and we put it at the top of the queue. One vote each for {month}, and you can
        change it until the month ends.
      </p>

      <form
        action={async (formData) => {
          setFailed(null);
          try {
            await voteForArea(formData);
          } catch (e) {
            setFailed((e as Error).message || 'That did not save. Try again.');
          }
        }}
        className="mt-4 space-y-3"
      >
        <label className="block">
          <span className="text-sm font-medium text-ink">Area</span>
          <select
            name="borough"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-white px-3 text-[16px] text-ink focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent-ink/20 sm:text-sm"
          >
            {areas.map((a) => (
              <option key={a.borough} value={a.borough}>
                {a.borough}
                {a.notChecked > 0 ? ` (${a.notChecked} not checked yet)` : ''}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton changing={Boolean(mine)} />
      </form>

      {failed && (
        <p role="alert" className="mt-2 text-sm font-medium text-halal-partialInk">
          {failed}
        </p>
      )}

      {mine && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-halal-fullInk">
          <CheckIcon className="h-4 w-4" />
          Your vote this month: {mine}
        </p>
      )}

      {tally.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle">{month} so far</h3>
          <ul className="mt-2 space-y-1.5">
            {tally.slice(0, 5).map((row) => (
              <li key={row.borough} className="flex items-center justify-between gap-3 text-sm">
                <span className={row.mine ? 'font-semibold text-ink' : 'text-ink/80'}>{row.borough}</span>
                <span className="text-muted">
                  {row.votes} {row.votes === 1 ? 'vote' : 'votes'}
                </span>
              </li>
            ))}
          </ul>
          {leader && (
            <p className="mt-2 text-xs text-subtle">
              {leader.borough} is ahead. We check the winner next month and say so when we do.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
