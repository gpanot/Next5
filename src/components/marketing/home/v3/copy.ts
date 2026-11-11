/**
 * Realtor copy for homepage v3 (home services and TikTok Shop were dropped 2026-11-11).
 * Single source of truth: the server render reads it directly and the inline
 * script receives it as JSON so the audience toggle swaps the same strings.
 */
export type Audience = 'realtor';

export const AUDIENCES: Audience[] = ['realtor'];

export interface AudienceCopy {
  h1: string;
  sub: string;
  ph: string;
  demo: string;
  hooks: string[];
  facts: string[];
  s0: string;
  noun: string;
  photos: string;
  statNum: string;
  statText: string;
  src: string;
  pain1: string;
  fit1: string;
  dd: string;
}

export const AUDIENCE_COPY: Record<Audience, AudienceCopy> = {
  realtor: {
    h1: 'Every listing, turned into a month of videos.',
    sub: "Paste your Zillow link. In 2 minutes you're watching your first video. Your whole month is planned before you finish your coffee.",
    ph: 'zillow.com/homedetails/...',
    demo: 'https://www.zillow.com/homedetails/1204-Oak-Ridge-Dr-Austin-TX',
    hooks: ['Wait till you see the kitchen.', 'This backyard sold me.', '3 bd in Austin. Come look.'],
    facts: ['$649,000', '3 bd', '2 ba', 'Austin, TX'],
    s0: 'Pulling your 24 listing photos',
    noun: 'listing',
    photos: 'photos of you',
    statNum: '39%',
    statText: 'of realtors say social media brings their best leads, more than any other tool.',
    src: 'NAR Technology Survey, 2025',
    pain1: 'Showings, calls, paperwork. Posting is always tomorrow.',
    fit1: 'You have listings and want more people to see them',
    dd: "You're gonna fall in love with this one.",
  },
};
