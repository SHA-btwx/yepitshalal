import type { SceneArt } from '@/components/media/SceneMedia';

// Every picture made for the site, in one place, so the homepage, Discover,
// Add a restaurant and Support show the same street, the same room and the
// same loop rather than three versions of each. All were generated for
// YepItsHalal (see /image-credits): none shows a real restaurant, mosque or
// person, and none is ever used as a photo of a listed place.
//
// Widths are the files that exist in /public/media. A phone gets the tall
// composition where there is one: the street was recomposed vertically, with
// calm sky at the top and dark pavement at the bottom, so words can sit on it.

/** The London high street at dusk. The site's one recurring moving picture. */
export const STREET: SceneArt = {
  still: '/media/london-high-street-wide',
  widths: [640, 1120, 1600, 2400],
  alt: 'A London high street at dusk after rain, food shopfronts lit up',
  video: '/media/london-high-street.mp4',
  videoSmall: '/media/london-high-street-640.mp4',
  videoLabel: 'Evening on a wet London high street, people walking past lit food shopfronts',
  narrow: {
    still: '/media/london-high-street-tall',
    widths: [640, 1080],
    video: '/media/london-high-street-tall.mp4',
    below: 768,
  },
};

/** The same street in its wide composition only, for a frame that is wide on every screen. */
export const STREET_WIDE: SceneArt = { ...STREET, narrow: undefined, videoSmall: '/media/london-high-street-640.mp4' };

export const PRAYER_ROOM: SceneArt = {
  still: '/media/prayer-room-wide',
  widths: [960, 1600],
  alt: 'An empty prayer room with a green striped carpet and a shoe rack by the door',
};

/** The same room, closer: the prayer rows in the carpet and the shoe rack. For a wide band. */
export const PRAYER_CARPET: SceneArt = {
  still: '/media/prayer-room-carpet',
  widths: [960, 1600],
  alt: 'The green carpet of a prayer room, with its prayer rows, and a shoe rack by the door',
};

export const EVIDENCE: SceneArt = {
  still: '/media/reading-the-evidence-wide',
  widths: [960, 1600],
  alt: 'A takeaway menu, an order pad with handwritten notes and a pen on a wooden counter',
};

export const KITCHEN: SceneArt = {
  still: '/media/kitchen-pass-wide',
  widths: [960, 1600],
  alt: 'A plate of grilled lamb chops and saffron rice on a restaurant kitchen pass',
  video: '/media/kitchen-pass.mp4',
  videoSmall: '/media/kitchen-pass-640.mp4',
  videoLabel: 'A plate of lamb chops and saffron rice set down on a kitchen pass, steam rising',
};

/** Support, "what checking involves": someone writing it down. */
export const NOTES: SceneArt = {
  still: '/media/keeping-notes',
  widths: [640, 1120, 1600],
  alt: 'Hands writing notes in a notebook at a desk, beside a takeaway menu, a phone and a mug of tea',
  video: '/media/keeping-notes.mp4',
  videoSmall: '/media/keeping-notes-640.mp4',
  videoLabel: 'A hand writing a few words in a notebook under a desk lamp',
};

/** Support, "why it matters": a table deciding together. */
export const TABLE: SceneArt = {
  still: '/media/shared-table',
  widths: [640, 1120, 1600],
  alt: 'Hands sharing grilled chicken, lamb, saffron rice and salads across a restaurant table',
  video: '/media/shared-table.mp4',
  videoSmall: '/media/shared-table-640.mp4',
  videoLabel: 'Hands reaching across a shared restaurant table, steam rising from the rice',
};
