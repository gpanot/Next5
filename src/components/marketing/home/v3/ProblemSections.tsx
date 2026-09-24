import { AUDIENCE_COPY, type Audience } from './copy';
import { CheckIcon, XIcon } from './icons';
import { reveal } from './reveal';

export function PainSection({ audience }: { audience: Audience }) {
  const pains = [
    { title: 'No time', body: AUDIENCE_COPY[audience].pain1, fix: 'We make every post for you.', bodyClass: 'js-pain1' },
    { title: 'No idea what to post', body: 'You open the app, stare at it, and close it again.', fix: 'Your whole month is planned.' },
    { title: 'You hate being on camera', body: 'Filming yourself feels awkward, and it shows.', fix: 'Made from your photos. No filming.' },
  ];
  return (
    <section className="v3section">
      <div className="v3wrap">
        <div className="v3section-head" {...reveal()}>
          <h2>You know you should post every day.<br /><span className="v3muted">Here&rsquo;s why you don&rsquo;t.</span></h2>
        </div>
        <div className="v3pains">
          {pains.map((pain, i) => (
            <div className="v3pain" key={pain.title} {...reveal(i)}>
              <div className="x"><XIcon /></div>
              <h3>{pain.title}</h3>
              <p className={pain.bodyClass}>{pain.body}</p>
              <div className="fix"><CheckIcon />{pain.fix}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const WAYS = [
  { title: 'Hire an agency', price: '$1,000+', unit: '/month', points: ['Weeks to get started', 'Calls, briefs, revisions', 'Locked into a contract'] },
  { title: 'Do it yourself', price: '6+ hrs', unit: '/week', points: ['Film, edit, write, repeat', 'Learn CapCut and trends', 'Quit by week 3'] },
  { title: 'Paste a link', price: '3 min', unit: '/week', points: ['First video in 2 minutes', 'Swipe to pick your posts', 'Cancel in 2 clicks'], win: true },
];

export function WaysSection() {
  return (
    <section className="v3section">
      <div className="v3wrap">
        <div className="v3section-head" {...reveal()}>
          <h2>3 ways to get a month of videos.</h2>
          <p className="v3lede">Only one of them takes 3 minutes a week.</p>
        </div>
        <div className="v3ways">
          {WAYS.map((way, i) => (
            <div className={way.win ? 'v3way win' : 'v3way'} key={way.title} {...reveal(i)}>
              {way.win && <div className="badge">Next5</div>}
              <div className="v3way-t">{way.title}</div>
              <div className="v3way-p"><span data-count="">{way.price}</span><small>{way.unit}</small></div>
              <ul>
                {way.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="v3note">
          Most businesses pay $1,000 to $3,000 a month for social media management (Sprout Social, WebFX, 2026).
          43% of small business owners spend 6+ hours a week on social media (VerticalResponse).
        </p>
      </div>
    </section>
  );
}
