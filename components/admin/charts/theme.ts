// Chart colours for the admin.
//
// The brand teals read as grey at chart sizes (they fail the chroma floor), so
// the series colours are a brand-leaning set checked with the dataviz skill's
// validator on white, all pairs: lightness band, chroma, colour-blind
// separation (worst pair 8.4, deuteranopia), normal-vision separation (17.3)
// and 3:1 contrast all pass. Keep this order: colour follows the series, and a
// series keeps its colour wherever it appears.
//
// The halal colours are not used for anything but halal labels, here as on the
// public site, because there they carry meaning.

export const SERIES = {
  one: '#1C84B0',
  two: '#E0702C',
  three: '#2EA86A',
} as const;

export const SERIES_ORDER = [SERIES.one, SERIES.two, SERIES.three];

export const GRID = '#E3EBEB';
export const SURFACE = '#FFFFFF';
