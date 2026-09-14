/**
 * Phone numbers arrive in whatever shape each source used: "+442076463364",
 * "020 7646 3364", or two numbers in one OpenStreetMap field separated by ";".
 * These return each number once, written the way a UK caller would dial it,
 * and a tel: target that works.
 */
export function splitPhones(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[;,/]|\bor\b/)) {
    const digits = part.replace(/[^\d+]/g, '');
    if (digits.replace(/\D/g, '').length < 10) continue;
    const national = digits.startsWith('+44') ? `0${digits.slice(3)}` : digits.startsWith('44') && digits.length === 12 ? `0${digits.slice(2)}` : digits;
    if (seen.has(national)) continue;
    seen.add(national);
    out.push(national);
  }
  return out;
}

export function formatUkPhone(national: string): string {
  const d = national.replace(/\D/g, '');
  if (d.length !== 11 || !d.startsWith('0')) return national;
  if (d.startsWith('02')) return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
  if (d.startsWith('07') || d.startsWith('03') || d.startsWith('08')) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}
