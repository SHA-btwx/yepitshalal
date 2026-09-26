// The 100 Founders Club, /founders: the parts both the page and the server
// need. Pure functions and constants only, no imports, so a client component
// can use them and the tests can run them directly.
//
// The database is the authority on every number here (0050_founders_club):
// what the page shows is a reading of it, and a claim is only ever decided by
// claim_founder_spot() on the server.

export const FOUNDERS_CAP = 100;

export const FOUNDER = {
  name: 'Shabir Ahmed',
  firstName: 'Shabir',
  title: 'Founder of YepItsHalal',
  instagramHandle: 'shabir_husain_ahmed',
  instagramUrl: 'https://instagram.com/shabir_husain_ahmed',
  /**
   * Shabir's own photo, supplied by him on 2026-09-26: the path under /public
   * without its extension. The file exists as .avif, .webp and .jpg, 384px
   * square, cropped to his face, with the camera metadata removed. Set it to
   * null and the page shows his initials. Never a stand-in portrait of
   * somebody else.
   */
  photo: '/founders/shabir-ahmed-384' as string | null,
} as const;

/** What the page knows about spots. `null` means the count could not be read. */
export interface Availability {
  claimed: number;
  cap: number;
}

export function spotsLeft(a: Availability): number {
  return Math.max(0, a.cap - a.claimed);
}

export function isOpen(a: Availability): boolean {
  return spotsLeft(a) > 0;
}

/**
 * The count in words, for the badge and the meter. Never a round-up, never a
 * "only": the number is the argument.
 */
export function spotsLabel(a: Availability): string {
  const left = spotsLeft(a);
  if (left === 0) return `All ${a.cap} Founder spots taken`;
  if (a.claimed === 0) return `All ${a.cap} Founder spots open`;
  if (left === 1) return `1 of ${a.cap} Founder spots left`;
  return `${left} of ${a.cap} Founder spots left`;
}

// ── What a claim can come back as ──────────────────────────────────────────

export type ClaimResponse =
  | {
      outcome: 'founder';
      founderNumber: number;
      businessName: string;
      contactVia: ContactVia;
      claimed: number;
      cap: number;
    }
  | { outcome: 'standard'; businessName: string; contactVia: ContactVia; claimed: number; cap: number }
  | {
      outcome: 'duplicate';
      tier: 'founder' | 'standard';
      founderNumber: number | null;
      businessName: string;
      contactVia: ContactVia;
      claimed: number;
      cap: number;
    }
  /** The spam trap was filled in. Says nothing, stores nothing. */
  | { outcome: 'received' };

export type ContactVia = 'instagram' | 'phone';

export interface ClaimError {
  error: string;
  /** The form field the message is about, so the page can focus it. */
  field?: 'business_name' | 'location' | 'contact_name' | 'contact';
}

// ── Reading the four answers ───────────────────────────────────────────────

/** A full UK postcode anywhere in the text, tidied to "E1 6RL", or null. */
export function findPostcode(text: string): string | null {
  const m = text.toUpperCase().match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/);
  return m ? `${m[1]} ${m[2]}` : null;
}

/**
 * An Instagram handle or a phone number, whichever the person typed. Returns
 * null when it is neither, so the form can say what it needs.
 */
export function parseContact(raw: string): { instagram: string | null; phone: string | null } | null {
  const text = raw.trim();
  if (!text) return null;

  const url = text.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})\/?(?:\?.*)?$/i);
  if (url) return { instagram: url[1].toLowerCase(), phone: null };

  const at = text.match(/^@([A-Za-z0-9._]{1,30})$/);
  if (at) return { instagram: at[1].toLowerCase(), phone: null };

  // Digits, spaces, brackets, dashes, dots and a leading plus: a phone number.
  if (/^\+?[\d\s().-]+$/.test(text)) {
    const digits = text.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) {
      return { instagram: null, phone: text.startsWith('+') ? `+${digits}` : digits };
    }
    return null;
  }

  // A handle typed without the @. It has to contain a letter, so "123" or
  // "..." is not mistaken for one.
  if (/^[A-Za-z0-9._]{2,30}$/.test(text) && /[A-Za-z]/.test(text)) {
    return { instagram: text.toLowerCase(), phone: null };
  }
  return null;
}

// Words that change nothing about which business it is.
const FILLER = new Set(['the', 'ltd', 'limited', 'llp', 'plc', 'co', 'uk', 'london']);

function keyWords(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !FILLER.has(w))
    .join('');
}

/**
 * Which business this is, for spotting the same one sent twice: the name,
 * plus the postcode (or the location as typed when there is no postcode).
 *
 * Deliberately narrow. "Al Noor Grill, E1 6RL" sent twice is one business.
 * "Al Noor Grill" in E1 and in E7 is two branches, and each can be a Founder.
 * Two different places with similar names are two businesses too. The same
 * business with its name typed two ways gets through, and that is the right
 * way round: Shabir can reject a duplicate in /admin/founders, which frees the
 * spot, but a real business wrongly turned away never comes back.
 */
export function dedupeKey(businessName: string, location: string, postcode: string | null): string {
  const place = postcode ? postcode.replace(/\s+/g, '') : keyWords(location);
  return `${keyWords(businessName)}|${place.toLowerCase()}`.slice(0, 300);
}

/** How somebody arrived, from ?src= on the page. Anything odd is dropped. */
export function cleanSource(src: unknown): string | null {
  if (typeof src !== 'string') return null;
  const s = src.trim().toLowerCase();
  return /^[a-z0-9_-]{1,40}$/.test(s) ? s : null;
}

/** Tidy free text: trimmed, single spaces, cut to `max`. Empty is null. */
export function cleanText(value: unknown, max: number): string | null {
  const s = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return s ? s.slice(0, max) : null;
}

/** At least two letters or digits, so "--" or "." is not a name. */
export function hasSubstance(value: string | null): value is string {
  return Boolean(value && (value.match(/[\p{L}\p{N}]/gu) ?? []).length >= 2);
}
