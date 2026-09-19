/**
 * The site's mark, as one SVG, for every icon that represents the site.
 *
 * It used to differ per file: /icon drew a green pin on nothing, and
 * /apple-icon drew the same green pin on near-black. Google picks whichever it
 * likes and renders it small, against a white result page or a dark one, and a
 * dark green pin on a dark square is the muddy circle that showed up in search.
 *
 * So: a solid green tile with a white pin on it. It holds its shape at 16px,
 * it has contrast against a page of either colour, and it is the same drawing
 * in the .ico, the PNG icon and the touch icon.
 */
export function brandMarkSvg(size: number): string {
  const r = Math.round(size * 0.22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="${(r / size) * 48}" fill="#1C9A4B"/>
  <path d="M24 8.5c-5.4 0-9.8 4.2-9.8 9.6C14.2 25 24 39.5 24 39.5S33.8 25 33.8 18.1c0-5.4-4.4-9.6-9.8-9.6Z" fill="#FFFFFF"/>
  <path d="M19.3 18.4l3.4 3.5 6.4-6.9" stroke="#1C9A4B" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;
}
