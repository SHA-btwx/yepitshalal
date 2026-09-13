/**
 * Turn a registration name into the name on the shopfront.
 *
 * Most listings came from the Food Standards Agency register, where the field is
 * the *legal* trading entity: "Nandos Chickenland Ltd t/a Nandos", "Private
 * corporate caterers ltd t/a olley's fish experience". Nobody searches for that,
 * and nobody recognises it in a list of results.
 *
 * Display only. The stored name is left alone, because it is what ties the row
 * back to its FHRS record.
 */

const TRADING_AS = /\b(?:t\/a|trading as)\b/i;
const ENTITY_SUFFIX = /[\s,]*\b(?:ltd|limited|plc|llp|inc)\b\.?\s*$/i;

export function cleanRestaurantName(name: string): string {
  let out = name.trim();

  // "X Ltd t/a Y" is two names; the second is the one on the door.
  const ta = out.split(TRADING_AS);
  if (ta.length > 1 && ta[ta.length - 1].trim()) {
    out = ta[ta.length - 1].trim();
  }

  out = out.replace(ENTITY_SUFFIX, '').trim();

  // A trailing "(Area)" duplicated the branch line it now sits beside.
  out = out.replace(/\s*\([^)]*\)\s*$/, '').trim();

  // All-caps registrations ("MAXIN CHICKEN") shout in a list of results.
  if (out.length > 3 && out === out.toUpperCase() && /[A-Z]{4,}/.test(out)) {
    out = out.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  }

  return out || name.trim();
}
