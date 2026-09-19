import { formatCheckedDate } from '@/components/HalalEvidencePanel';
import type { HalalStatus } from './types';

/**
 * The answer to "is this halal?", in one sentence, in the same words everywhere.
 *
 * The question people type is "is X halal", so that is the question the page
 * answers: in its title, in its description, in the heading above the evidence,
 * and in the FAQ markup that answer engines read. One function so those four
 * can never drift apart and say four different things about one restaurant.
 *
 * It never says more than the evidence does. "Yes" only appears for a place
 * with strong evidence that all its meat is halal; everything else says what is
 * actually known, and every answer ends by pointing at the restaurant itself.
 */

export interface HalalAnswer {
  /** "Yes", "Partly", "Not confirmed", "Not checked yet". The short answer. */
  verdict: string;
  /** A full sentence, 20 to 40 words, safe to publish anywhere. */
  sentence: string;
}

export function halalAnswerFor(options: {
  name: string;
  status: HalalStatus | null;
  summary: string | null;
  checkedAt: string | null;
}): HalalAnswer {
  const { name, status, summary } = options;
  const because = summary ? `${summary.replace(/\.$/, '')}.` : '';
  const checked = options.checkedAt ? ` Last checked ${formatCheckedDate(options.checkedAt)}.` : '';

  switch (status) {
    case 'fully_halal':
      return {
        verdict: 'Yes',
        sentence: `Yes. There is strong evidence that all the meat served at ${name} is halal. ${because}${checked} If it matters to you, confirm it with the restaurant when you order.`.replace(/\s+/g, ' '),
      };
    case 'halal_options':
      return {
        verdict: 'Partly',
        sentence: `Partly. ${name} serves halal food alongside food that is not halal. ${because}${checked} Ask for the halal items when you order.`.replace(/\s+/g, ' '),
      };
    case 'unverified':
      return {
        verdict: 'Not confirmed',
        sentence: `We cannot confirm it. There are signs that ${name} serves halal food, but nobody has verified it. ${because}${checked} Unverified never means not halal: ask the restaurant.`.replace(/\s+/g, ' '),
      };
    case 'unknown':
      return {
        verdict: 'Not checked yet',
        sentence: `We do not know yet. Nobody has checked ${name}, and we have found nothing it or anyone else has said about its meat. That is a reason to ask, not an answer.`,
      };
    default:
      return {
        verdict: 'Not known',
        sentence: `We have no evidence either way about ${name}. That does not mean it is not halal. It means we cannot tell you.`,
      };
  }
}
