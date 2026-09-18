/**
 * Brand Studio monthly themes. Spec: 01-product-spec.md §2.3.
 * Cover paths reference docs/business-studios/04-image-prompts.md (B9–B16).
 */

import type { ThemeSeed } from './types';

const IMG = '/images/business/brand/themes';

export const THEMES: readonly ThemeSeed[] = [
  {
    id: 'just-listed',
    title: 'Showing a Home',
    description: 'Warm, happy photos of you showing a new home.',
    coverImage: `${IMG}/just-listed.png`,
    featuredMonth: '2026-10',
    sortOrder: 1,
    scenes: [
      { id: 'doorway-welcome', label: 'Doorway welcome', direction: 'Standing in an open front doorway, arm gesturing inward in welcome, no house numbers.' },
      { id: 'reviewing-plans', label: 'Reviewing plans', direction: 'Reviewing floor plans on a kitchen island, looking up at the camera.' },
      { id: 'bright-hallway', label: 'Bright hallway', direction: 'Walking through a bright hallway toward the camera, natural stride.' },
      { id: 'keys-in-hand', label: 'Keys in hand', direction: 'Close-up of her holding a set of plain house keys near her smile, no logos.' },
      { id: 'balcony-view', label: 'Balcony view', direction: 'Leaning on a balcony railing with a wide view behind, relaxed.' },
      { id: 'sofa-laugh', label: 'Candid laugh', direction: 'Candid laugh while sitting on the arm of a sofa.' },
    ],
  },
  {
    id: 'market-update',
    title: 'Market Update',
    description: 'Look like the expert when you share the numbers.',
    coverImage: `${IMG}/market-update.png`,
    featuredMonth: '2026-11',
    sortOrder: 2,
    scenes: [
      { id: 'pointing-screen', label: 'Presenting', direction: 'Pointing toward a completely blank wall-mounted screen while looking at the camera.' },
      { id: 'desk-notes', label: 'At the desk', direction: 'At a desk with a laptop (screen not visible) and handwritten notes, looking up.' },
      { id: 'talking-to-camera', label: 'Talking to camera', direction: 'Half body, talking directly to the camera with an expressive hand gesture.' },
      { id: 'window-thinking', label: 'Thoughtful', direction: 'Thoughtful look out of a large window, three-quarter profile.' },
      { id: 'walking-tablet', label: 'On the move', direction: 'Walking with a tablet under her arm, confident stride.' },
      { id: 'arms-crossed', label: 'Confident portrait', direction: 'Confident portrait with arms loosely crossed, slight smile.' },
    ],
  },
  {
    id: 'client-meeting',
    title: 'Client Meeting',
    description: 'Show clients what it is like to work with you.',
    coverImage: `${IMG}/client-meeting.png`,
    featuredMonth: null,
    sortOrder: 3,
    scenes: [
      { id: 'handshake', label: 'Handshake', direction: 'Warm handshake with a client whose face is out of frame or turned away.' },
      { id: 'explaining', label: 'Explaining', direction: 'Explaining something at a table with an open notebook, client seen from behind and out of focus.' },
      { id: 'listening', label: 'Listening', direction: 'Listening attentively with a notebook, gentle nod.' },
      { id: 'welcome-door', label: 'Welcome', direction: 'Welcoming someone at an office door, smiling, the other person out of frame.' },
      { id: 'coffee-chat', label: 'Coffee chat', direction: 'Relaxed coffee chat at a lounge table, mid-conversation.' },
      { id: 'pen-ready', label: 'Ready to sign', direction: 'Close-up of her hand offering a pen over a blank document, face softly visible.' },
    ],
  },
  {
    id: 'behind-the-scenes',
    title: 'Behind the Scenes',
    description: 'The real, busy side of your work.',
    coverImage: `${IMG}/behind-the-scenes.png`,
    featuredMonth: null,
    sortOrder: 4,
    scenes: [
      { id: 'phone-walk', label: 'On a call', direction: 'Walking along a bright corridor on a phone call, candid.' },
      { id: 'car-door', label: 'Heading out', direction: 'Opening a car door, glancing back with a smile, no car badges or plates.' },
      { id: 'prepping-docs', label: 'Prepping', direction: 'Organising documents in folders on a desk, focused.' },
      { id: 'coffee-on-the-go', label: 'Coffee on the go', direction: 'Holding a plain takeaway coffee cup, mid-stride.' },
      { id: 'candid-laugh', label: 'Candid laugh', direction: 'Genuine candid laugh looking slightly off camera.' },
      { id: 'end-of-day', label: 'End of day', direction: 'Closing a laptop at the end of the day, warm evening light.' },
    ],
  },
  {
    id: 'new-year-goals',
    title: 'New Year, New Goals',
    description: 'Fresh-start photos for January.',
    coverImage: `${IMG}/new-year-goals.png`,
    featuredMonth: '2027-01',
    sortOrder: 5,
    scenes: [
      { id: 'planner', label: 'Planning', direction: 'Writing in a linen-covered planner, focused and hopeful.' },
      { id: 'sunrise-window', label: 'Sunrise', direction: 'Standing by a window at sunrise, golden light on her face.' },
      { id: 'confident-portrait', label: 'Fresh portrait', direction: 'Clean confident portrait with a fresh, optimistic expression.' },
      { id: 'workspace-reset', label: 'Workspace reset', direction: 'Arranging a tidy minimal workspace.' },
      { id: 'toast-smile', label: 'Celebrate', direction: 'Raising a plain glass in a celebratory toast, no labels.' },
      { id: 'calendar-wall', label: 'Big plans', direction: 'Pointing at a blank wall calendar with sticky notes, smiling.' },
    ],
  },
  {
    id: 'holiday-greetings',
    title: 'Holiday Greetings',
    description: 'Warm holiday photos for your year-end wishes.',
    coverImage: `${IMG}/holiday-greetings.png`,
    featuredMonth: '2026-12',
    sortOrder: 6,
    scenes: [
      { id: 'festive-living-room', label: 'Festive home', direction: 'In a softly decorated living room with warm string-light bokeh, no religious symbols.' },
      { id: 'gift-wrap', label: 'Gift wrap', direction: 'Wrapping a gift in plain kraft paper, smiling.' },
      { id: 'cosy-knit', label: 'Cosy portrait', direction: 'Cosy portrait in a knit sweater with warm lamp light.' },
      { id: 'window-lights', label: 'Window lights', direction: 'By a window with warm bokeh lights, gentle smile.' },
      { id: 'table-setting', label: 'Table setting', direction: 'Setting a festive dinner table with candles and greenery.' },
      { id: 'wave', label: 'Season’s greetings', direction: 'Waving warmly at the camera.' },
    ],
  },
  {
    id: 'tet-greetings',
    title: 'Lunar New Year Greetings',
    description: 'Lunar New Year wishes for your clients.',
    coverImage: `${IMG}/tet-greetings.png`,
    featuredMonth: '2027-02',
    sortOrder: 7,
    scenes: [
      { id: 'ao-dai-portrait', label: 'Áo dài portrait', direction: 'Wearing an elegant modern red silk áo dài, graceful portrait.' },
      { id: 'peach-blossom', label: 'Peach blossom', direction: 'Beside a vase of pink peach blossom branches in a bright modern interior.' },
      { id: 'red-envelope', label: 'Lucky envelope', direction: 'Holding a plain red envelope with no characters, warm smile.' },
      { id: 'tea-table', label: 'Tea table', direction: 'Pouring tea at a low wooden tea table with candied fruit tray.' },
      { id: 'home-entrance', label: 'Welcome home', direction: 'At a home entrance decorated with apricot blossoms, welcoming.' },
      { id: 'warm-portrait', label: 'Warm wishes', direction: 'Warm close portrait with blossom bokeh behind.' },
    ],
  },
  {
    id: 'open-house',
    title: 'Open House Weekend',
    description: 'Invite buyers in with bright, happy photos.',
    coverImage: `${IMG}/open-house.png`,
    featuredMonth: null,
    sortOrder: 8,
    scenes: [
      { id: 'entrance-welcome', label: 'At the entrance', direction: 'Welcoming at the entrance of a bright home, open posture.' },
      { id: 'staging-vase', label: 'Final touches', direction: 'Placing a vase of white flowers on a dining table.' },
      { id: 'tour-gesture', label: 'Guided tour', direction: 'Guided tour gesture toward a bright living room.' },
      { id: 'garden-terrace', label: 'Garden terrace', direction: 'Standing on a garden terrace with greenery.' },
      { id: 'clipboard', label: 'Checklist', direction: 'Holding a clipboard with a blank checklist, smiling.' },
      { id: 'steps-portrait', label: 'Relaxed portrait', direction: 'Relaxed portrait sitting on front steps of a modern home, no house numbers.' },
    ],
  },
];
