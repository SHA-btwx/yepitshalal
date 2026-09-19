import { ImageResponse } from 'next/og';
import { brandMarkSvg } from '@/lib/brandMark';

// The icon a phone puts on a home screen, and the one Google often picks for a
// search result because it is the largest we offer. It used to be the pin on a
// near-black square, which reads as a dark smudge at the size a result list
// shows it. It is the same green tile as everything else now.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(brandMarkSvg(180)).toString('base64')}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MARK_DATA_URI} width={180} height={180} alt="" />
      </div>
    ),
    { ...size, fonts: [] }
  );
}
