// server-only — never import from a 'use client' file.
// What she does in a photo of a real property: a pose that fits the room, and a mood that fits the occasion.
// Every line only uses what is already in the photo. Furniture is always "if there is one", nothing is
// opened, moved or added, and the only prop is one she holds. Plan: docs/business-studios/14-property-create-plan.md.

import type { Occasion } from '../../../lib/listingOccasions';
import type { PhotoTag } from '../../../lib/listingPhotos';

/** Three poses per room, one per look, so three looks of one photo never repeat. */
const ROOM_POSES: Record<PhotoTag, readonly [string, string, string]> = {
  exterior: [
    'Standing in front of the home, turned slightly toward it, one open hand gesturing to the house.',
    'Standing near the front entrance, facing the camera.',
    'A few steps in front of the home, half turned to look back at it over her shoulder.',
  ],
  porch: [
    'Standing at the entry beside the front door, facing the camera.',
    'Standing at the edge of the porch, turned toward the camera with a relaxed posture.',
    'Standing beside the front door with a welcoming open-hand gesture toward the entry.',
  ],
  living: [
    'Standing in the middle of the room, gesturing toward the space.',
    'Standing near a window if there is one, in a three-quarter profile toward the camera.',
    'Standing beside existing seating if there is any, one hand resting lightly on its back; otherwise standing relaxed.',
  ],
  kitchen: [
    'Standing beside the counter, one hand resting lightly on it.',
    'Standing at the island or counter, looking up at the camera.',
    'Standing in the kitchen, gesturing toward the room.',
  ],
  dining: [
    'Standing beside the dining table if there is one, gesturing toward the room.',
    'Standing at the edge of the room, facing the camera.',
    'Standing near a window if there is one, looking toward the camera.',
  ],
  bedroom: [
    'Standing near the window if there is one, facing the camera.',
    'Standing at the side of the room, gesturing toward the space.',
    'Standing near the doorway of the room, half turned toward the camera.',
  ],
  yard: [
    'Standing in the yard, gesturing toward the home or garden.',
    'Walking slowly toward the camera through the outdoor space.',
    'Standing at the edge of the patio or deck if there is one, looking out; otherwise standing on the lawn.',
  ],
  bath: [
    'Standing in the doorway of the bathroom, gesturing toward the room.',
    'Standing beside the vanity if there is one, facing the camera.',
    'Standing at the side of the room, half turned toward the camera.',
  ],
  // Drone shots, close-ups and floor plans rarely hold a person; keep her small and to the side.
  aerial: [
    'Standing small in the foreground to one side, facing the camera.',
    'Standing small at the edge of the frame, gesturing toward the view.',
    'Standing small to one side, half turned toward the view.',
  ],
  detail: [
    'Standing to one side of the frame, gesturing toward the feature.',
    'Standing beside the feature, facing the camera.',
    'Standing slightly behind the feature, looking at the camera.',
  ],
  floorplan: [
    'Standing to one side of the frame, facing the camera.',
    'Standing to one side of the frame, gesturing toward the space.',
    'Standing to one side of the frame, half turned toward the space.',
  ],
};

/** For photos without a room tag: poses that fit any space. */
const NEUTRAL_POSES: readonly [string, string, string] = [
  'Standing naturally in the space, facing the camera.',
  'Standing to one side of the frame, gesturing toward the space.',
  'A relaxed half turn toward the space, looking back at the camera.',
];

/** Mood and gesture. Plain keys are the only prop, because she holds them — they are not part of the home. */
const OCCASION_DIRECTIONS: Record<Occasion, string> = {
  coming_soon: 'A curious, excited expression, as if giving a first sneak peek before anyone else sees it.',
  just_listed: 'Proud, happy and welcoming, holding a set of plain house keys with no logos or tags.',
  for_sale: 'Warm and inviting, as if showing the home to a buyer.',
  open_house: 'Welcoming and open, as if greeting guests arriving to look around.',
  under_contract: 'Pleased and calm, a quiet satisfied smile.',
  just_sold: 'Joyful and celebrating, holding a set of plain house keys up near her smile, no logos or tags.',
};

const isTag = (tag: string | null | undefined): tag is PhotoTag => typeof tag === 'string' && tag in ROOM_POSES;

/** The pose for one look of one photo. `look` wraps, so a fourth look would reuse the first pose. */
export const roomPose = (tag: string | null | undefined, look: number): string => {
  const poses = isTag(tag) ? ROOM_POSES[tag] : NEUTRAL_POSES;
  return poses[((look % poses.length) + poses.length) % poses.length]!;
};

export const occasionDirection = (occasion: Occasion): string => OCCASION_DIRECTIONS[occasion];

/** Stable id for the calendar's "no two alike in a row" rule and the zip file name. */
export const roomSceneId = (tag: string | null | undefined, look: number): string => `${isTag(tag) ? tag : 'room'}-${look + 1}`;
