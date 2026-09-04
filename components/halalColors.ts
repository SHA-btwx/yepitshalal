import type { HalalClassification } from '@/lib/types';

// Single source of truth for the three halal-status colours, used by both
// the map pins and anywhere else that needs the raw colour (not the badge component).
export const HALAL_DOT_COLOR: Record<HalalClassification, string> = {
  fully_halal: '#1F7A45',
  halal_options: '#A8720F',
  unverified: '#6D766F',
};

// Map pins are imperative DOM, outside React, so they can't reuse HalalBadge —
// but a pin that announces only its colour is useless to a screen reader, and
// this keeps the wording identical to the badge.
export const HALAL_PIN_LABEL: Record<HalalClassification, string> = {
  fully_halal: 'Fully Halal',
  halal_options: 'Halal Options',
  unverified: 'Unverified',
};
