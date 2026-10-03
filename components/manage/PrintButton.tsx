'use client';

import { ctaPrimarySm } from '@/components/cta';

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={ctaPrimarySm}>
      Print poster and staff card
    </button>
  );
}
