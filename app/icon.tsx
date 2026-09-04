import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// satori (what ImageResponse renders through) doesn't support raw <svg>/<path>
// elements as JSX children -- only a constrained HTML-like subset (div, img,
// etc). The pin mark is rendered as an <img> pointing at a data-URI-encoded
// SVG instead, which satori treats like any other image.
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M12 2c-3.6 0-6.5 2.8-6.5 6.4C5.5 13 12 21 12 21s6.5-8 6.5-12.6C18.5 4.8 15.6 2 12 2Z" fill="#1C9A4B"/>
  <path d="M9 8.6l2.1 2.2L15.3 6.4" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;
const MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString('base64')}`;

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MARK_DATA_URI} width={32} height={32} alt="" />
      </div>
    ),
    { ...size, fonts: [] }
  );
}
