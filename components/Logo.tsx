// Inline mark echoing the real YepItsHalal brand icon (pin + checkmark) used on
// Instagram and social. Swap for the actual logo file once it's dropped into
// /public — this is a lightweight stand-in, not the final asset.
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2c-3.6 0-6.5 2.8-6.5 6.4C5.5 13 12 21 12 21s6.5-8 6.5-12.6C18.5 4.8 15.6 2 12 2Z"
        fill="#1C9A4B"
      />
      <path
        d="M9 8.6l2.1 2.2L15.3 6.4"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function LogoLockup() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <LogoMark />
      <span className="font-display text-lg font-semibold tracking-tight text-ink">
        Yep<span className="text-accent">Its</span>Halal
      </span>
    </span>
  );
}
