// server-only — never import from a 'use client' file.
// A cast member made with "Dress code: As per the photo" keeps the clothes of the owner's photo. Their look ends with a
// "Dress code: …" line instead of the usual "Outfit: …" one, so no schema change is needed and it reaches every photo
// prompt that gets the look. The slideshow photo plan wears this line instead of its own planned clothes.

/** Reference note of a cast member whose clothes may change with the scene. */
const PERSON_NOTE = 'keep the SAME person (face, hair, skin tone, build); change the pose, place and clothes as described here';
/** Reference note of a cast member with a dress code. */
const DRESS_CODE_NOTE = 'keep the SAME person (face, hair, skin tone, build) and the SAME clothes; change only the pose and place as described here';

const DRESS_CODE_LINE = /\s*Dress code:\s*(.+?)\.?\s*$/;

/** The clothes a member always wears; null when they have no dress code. */
export const dressCodeOf = (look: string): string | null => look.match(DRESS_CODE_LINE)?.[1] ?? null;

/** What a slide's photo model should keep from this member's anchor photo. */
export const personNote = (look: string): string => (dressCodeOf(look) ? DRESS_CODE_NOTE : PERSON_NOTE);
