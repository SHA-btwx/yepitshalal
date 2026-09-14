/**
 * JSON-LD for a <script> tag. Names and addresses come from open data, and a
 * "</script>" inside one would end the tag early, so "<" is escaped.
 */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
