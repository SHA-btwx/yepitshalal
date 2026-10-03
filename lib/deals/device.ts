import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * How a diner's phone is known, without an account.
 *
 * Tapping Claim sets one cookie, yih_device: a random id and a signature. It
 * is set only then, because the diner asked for a code that works on their
 * phone and nowhere else, which makes it strictly necessary under PECR: no
 * consent box. /privacy says what it is.
 *
 * The database never sees the id. It stores device_hash, a keyed SHA-256 of
 * it, so the table alone cannot be matched to a phone. The key is
 * SUBMISSION_SALT, the secret the site already uses for connection hashes;
 * the labels below keep the two uses apart.
 *
 * Server only: this reads the secret.
 */

export const DEVICE_COOKIE = 'yih_device';
const MAX_AGE = 400 * 24 * 60 * 60; // the longest a browser keeps a cookie

function key(): string {
  const k = process.env.SUBMISSION_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16);
  if (!k) throw new Error('SUBMISSION_SALT is not set.');
  return k;
}

function sign(id: string): string {
  return createHmac('sha256', key()).update(`device-cookie:${id}`).digest('base64url').slice(0, 27);
}

function hashOf(id: string): string {
  return createHmac('sha256', key()).update(`device-hash:${id}`).digest('hex');
}

function idFrom(value: string | undefined): string | null {
  if (!value) return null;
  const [id, sig] = value.split('.');
  if (!id || !sig || !/^[A-Za-z0-9_-]{22}$/.test(id)) return null;
  const want = Buffer.from(sign(id));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return id;
}

/** The phone's hash, or null when it has never claimed (or the cookie was changed). */
export function readDeviceHash(): string | null {
  const id = idFrom(cookies().get(DEVICE_COOKIE)?.value);
  return id ? hashOf(id) : null;
}

/**
 * The phone's hash, setting the cookie first if it has none. Only callable
 * where a response can carry a cookie: a Route Handler or a Server Action.
 */
export function ensureDeviceHash(): string {
  const jar = cookies();
  const existing = idFrom(jar.get(DEVICE_COOKIE)?.value);
  if (existing) return hashOf(existing);
  const id = randomBytes(16).toString('base64url');
  jar.set(DEVICE_COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
  return hashOf(id);
}
