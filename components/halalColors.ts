import type { HalalClassification } from '@/lib/types';

// Single source of truth for the three halal-status colours, used by both
// the map pins and anywhere else that needs the raw colour (not the badge component).
export const HALAL_DOT_COLOR: Record<HalalClassification, string> = {
  fully_halal: '#1F7A45',
  halal_options: '#A8720F',
  unverified: '#6D766F',
};
