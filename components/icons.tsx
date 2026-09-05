// Inline SVG icon set, drawn on a 24px grid in the Phosphor outline idiom
// (round caps/joins, 1.75 stroke). Inline rather than a package because the
// product needs ~15 glyphs — shipping an icon library for that would cost more
// bytes than the whole set.
//
// Every icon is `aria-hidden` by default: an icon is decoration unless the
// control around it says otherwise. When an icon is the *only* content of a
// button, put the meaning on the button (`aria-label`), not the glyph.

interface IconProps {
  className?: string;
  strokeWidth?: number;
}

function Svg({
  className = 'h-5 w-5',
  strokeWidth = 1.75,
  children,
  fill = 'none',
}: IconProps & { children: React.ReactNode; fill?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function SearchIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.2 16.2 4.3 4.3" />
    </Svg>
  );
}

export function MapPinIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </Svg>
  );
}

export function CrosshairIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </Svg>
  );
}

export function MapIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 4 3 6.5v13.5L9 17.5m0-13.5 6 2.5m-6-2.5v13.5m6-11v13.5m0-13.5 6-2.5v13.5L15 20" />
    </Svg>
  );
}

export function ListIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function ForkKnifeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 3v6a2.5 2.5 0 0 0 5 0V3M9.5 11.5V21" />
      <path d="M17.5 3c-1.4 1.2-2 3-2 5.2 0 1.6.7 2.6 2 2.9V21" />
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p} strokeWidth={p.strokeWidth ?? 2.2}>
      <path d="m4.5 12.5 4.5 4.5L19.5 6.5" />
    </Svg>
  );
}

export function SealCheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m12 2.5 2.3 2 3-.3 1 2.9 2.6 1.6-1 2.9 1 2.9-2.6 1.6-1 2.9-3-.3-2.3 2-2.3-2-3 .3-1-2.9L2.1 16.5l1-2.9-1-2.9 2.6-1.6 1-2.9 3 .3 2.3-2Z" />
      <path d="m8.8 12.1 2.2 2.2 4.2-4.5" strokeWidth={p.strokeWidth ?? 2} />
    </Svg>
  );
}

export function LockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </Svg>
  );
}

export function XIcon(p: IconProps) {
  return (
    <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </Svg>
  );
}

export function PhoneIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7.4 3.5h-2A2.4 2.4 0 0 0 3 6c0 8.3 6.7 15 15 15a2.4 2.4 0 0 0 2.5-2.4v-2l-4.4-1.7-1.9 2.3a14.4 14.4 0 0 1-5.4-5.4l2.3-1.9L9.4 5.5Z" />
    </Svg>
  );
}

export function GlobeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.2 2.4 3.3 5.3 3.3 8.5S14.2 18.1 12 20.5c-2.2-2.4-3.3-5.3-3.3-8.5S9.8 5.9 12 3.5Z" />
    </Svg>
  );
}

export function NavigationIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20.5 3.5 3.9 10.2c-.8.3-.7 1.5.1 1.7l6.6 1.6 1.6 6.6c.2.8 1.4.9 1.7.1L20.5 3.5Z" />
    </Svg>
  );
}

export function SparkleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.2 13.7 9 19.5 10.7 13.7 12.4 12 18.2 10.3 12.4 4.5 10.7 10.3 9 12 3.2Z" />
      <path d="M18.6 15.6 19.3 18l2.4.7-2.4.7-.7 2.4-.7-2.4-2.4-.7 2.4-.7.7-2.4Z" />
    </Svg>
  );
}

export function ArrowRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </Svg>
  );
}

export function ArrowUpRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 17 17 7M8.5 7H17v8.5" />
    </Svg>
  );
}

export function SlidersIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
      <circle cx="15" cy="8" r="2.2" />
      <circle cx="9" cy="16" r="2.2" />
    </Svg>
  );
}

export function InfoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.9" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function HeartHandIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 20.5S4.5 15.9 4.5 10.6A3.9 3.9 0 0 1 12 8.7a3.9 3.9 0 0 1 7.5 1.9c0 5.3-7.5 9.9-7.5 9.9Z" />
    </Svg>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function UserIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Svg>
  );
}

export function WarningIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4.2 2.8 19.2h18.4L12 4.2Z" />
      <path d="M12 10v3.6" />
      <circle cx="12" cy="16.6" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function TrashIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 6.5h15M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
      <path d="M6.6 6.5 7.5 19a1.6 1.6 0 0 0 1.6 1.5h5.8a1.6 1.6 0 0 0 1.6-1.5l.9-12.5" />
      <path d="M10.4 10.2v6.4M13.6 10.2v6.4" />
    </Svg>
  );
}

export function StarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.6Z" />
    </Svg>
  );
}

// Halal status marks. These are fill-based rather than stroke-based, and they
// carry the meaning themselves: solid-with-a-tick = we checked and it's all
// halal; half-filled = some of the menu; dashed-and-empty = we haven't looked.
// That reads before the words do, and the three are still distinguishable with
// no colour at all — which colour-coded dots were not.
export function HalalFullMark({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="9" fill="currentColor" />
      <path
        d="m5.8 10.2 2.8 2.8 5.6-5.9"
        fill="none"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HalalPartialMark({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" focusable="false">
      {/* Left half solid, right half open — "some of the menu, not all of it". */}
      <path d="M10 1.4a8.6 8.6 0 0 0 0 17.2Z" fill="currentColor" />
      <circle cx="10" cy="10" r="8.6" fill="none" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

export function HalalUnknownMark({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" focusable="false">
      <circle
        cx="10"
        cy="10"
        r="8.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeDasharray="3.1 3.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
