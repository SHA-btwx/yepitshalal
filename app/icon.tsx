import { ImageResponse } from 'next/og';
import { brandMarkSvg } from '@/lib/brandMark';

// 96, not 32. Google will not show a favicon smaller than 48px and asks for a
// multiple of 48, which is why a search result had a blank square where the
// mark should be. app/favicon.ico covers the crawler that looks for a file at
// the root instead of reading the link tag, and both draw the same mark.
export const size = { width: 96, height: 96 };
export const contentType = 'image/png';

// satori (what ImageResponse renders through) doesn't support raw <svg>/<path>
// elements as JSX children -- only a constrained HTML-like subset (div, img,
// etc). The mark is rendered as an <img> pointing at a data-URI-encoded SVG
// instead, which satori treats like any other image.
const MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(brandMarkSvg(96)).toString('base64')}`;

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MARK_DATA_URI} width={96} height={96} alt="" />
      </div>
    ),
    { ...size, fonts: [] }
  );
}
