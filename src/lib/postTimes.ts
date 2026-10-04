// Post times on one calendar day, shared by the calendar (client) and the ideas planner (server).

/** Most posts on one day, Blitz and Auto Slideshow together. */
export const MAX_PER_DAY = 5;

/** Post times for 1 to 5 posts on a day, spread over the hours people scroll most. */
export const POST_TIMES: Record<number, string[]> = {
  1: ['19:00'],
  2: ['12:00', '19:00'],
  3: ['09:00', '13:00', '19:00'],
  4: ['09:00', '12:00', '16:00', '19:00'],
  5: ['08:00', '11:00', '14:00', '17:00', '20:00'],
};
