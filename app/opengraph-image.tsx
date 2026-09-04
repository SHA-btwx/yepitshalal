import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M12 2c-3.6 0-6.5 2.8-6.5 6.4C5.5 13 12 21 12 21s6.5-8 6.5-12.6C18.5 4.8 15.6 2 12 2Z" fill="#1C9A4B"/>
  <path d="M9 8.6l2.1 2.2L15.3 6.4" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;
const MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString('base64')}`;

// Fetched over the network rather than read from a local file -- avoids
// depending on the (single-weight, Latin-only) font @vercel/og bundles by
// default, and sidesteps local-file resolution entirely.
const INTER_BOLD_URL =
  'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf';

export default async function OpengraphImage() {
  const fontData = await fetch(INTER_BOLD_URL).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#14181A',
          fontFamily: 'Inter',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK_DATA_URI} width={88} height={88} alt="" />
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, color: 'white' }}>
            Yep<span style={{ color: '#1C9A4B' }}>Its</span>Halal
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 34, color: 'rgba(255,255,255,0.75)' }}>
          Find halal food near you — no guessing.
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Inter', data: fontData, weight: 700, style: 'normal' }] }
  );
}
