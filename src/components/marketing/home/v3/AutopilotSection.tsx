import { SplitWords } from '../../../motion/SplitWords';
import { CheckIcon } from './icons';
import { reveal } from './reveal';

/**
 * "Autopilots": the six realtor playbooks (src/lib/realtorPlaybooks.ts) and what they get you.
 * Replaced the old "Your only job: swipe" section on 2026-11-13.
 */
const AUTOPILOTS = [
  { name: 'Just listed', what: '7 days of posts from one Zillow link.', mix: '2 videos · 5 slideshows' },
  { name: 'Open house', what: '3 days that end on the open house day.', mix: 'Comment RSVP to save a spot' },
  { name: 'Price drop', what: 'The new price, told in 3 posts.', mix: '2 videos · 1 slideshow' },
  { name: 'Just sold', what: '2 days of proof that you sell homes.', mix: 'DM VALUE for a home value' },
  { name: 'Market update', what: 'Your area’s numbers, every Monday.', mix: 'Every stat has a source' },
  { name: 'No listing this week', what: 'Buyer and seller tips fill the empty days.', mix: 'Your face or faceless' },
];

const OUTCOMES = [
  { big: '30', line: 'posts a month, one for every day. Even on your busiest week.' },
  { big: '0', line: 'hours filming or editing. Voice, music and captions are done.' },
  { big: '1', line: 'tap to approve the plan. It goes on your calendar.' },
];

const PROMISES = [
  'Every caption ends with a lead keyword: TOUR, RSVP, VALUE',
  'Every post is checked for Fair Housing wording',
  'When one plan ends, the next one fills the gap',
];

function AutopilotCard({ a, index }: { a: (typeof AUTOPILOTS)[number]; index: number }) {
  return (
    <li className="v3ap-card" {...reveal(index)}>
      <span className="v3ap-dot" aria-hidden="true" />
      <b>{a.name}</b>
      <span className="v3ap-what">{a.what}</span>
      <span className="v3ap-mix">{a.mix}</span>
    </li>
  );
}

export function AutopilotSection() {
  return (
    <section className="v3section" id="autopilots">
      <div className="v3wrap">
        <div className="v3section-head" {...reveal()}>
          <p className="v3eyebrow">Autopilots</p>
          <h2 data-split=""><SplitWords text="Pick a moment. Autopilot posts for a week." /></h2>
          <p className="v3lede">
            New listing, open house, price drop, sale. Each moment has its own Autopilot. It plans the days,
            makes the posts and writes the captions.
          </p>
        </div>
        <ul className="v3ap-grid">
          {AUTOPILOTS.map((a, i) => <AutopilotCard key={a.name} a={a} index={i} />)}
        </ul>
        <div className="v3ap-outcomes">
          {OUTCOMES.map((o, i) => (
            <div key={o.big + o.line} className="v3ap-out" {...reveal(i)}>
              <b>{o.big}</b>
              <span>{o.line}</span>
            </div>
          ))}
        </div>
        <ul className="v3ap-promises">
          {PROMISES.map((p, i) => <li key={p} {...reveal(i)}><CheckIcon />{p}</li>)}
        </ul>
      </div>
    </section>
  );
}
