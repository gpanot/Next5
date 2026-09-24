import { AUDIENCE_COPY, type Audience } from './copy';
import { CheckIcon, XIcon } from './icons';
import { reveal } from './reveal';

const GUARANTEE_POINTS = [
  { title: 'Remake guarantee.', body: 'Any video looks off, we remake it free.' },
  { title: 'Cancel in 2 clicks.', body: 'No contract, no call.' },
  { title: 'Keep everything.', body: 'Every video you made is yours.' },
];

export function GuaranteeSection() {
  return (
    <section className="v3section" id="guarantee">
      <div className="v3wrap">
        <div className="v3guar3" {...reveal()}>
          <div className="v3seal">
            <div>30<small>DAY</small></div>
          </div>
          <div>
            <h2>The Beat Your Feed Guarantee.</h2>
            <p className="v3lede">
              Post 12 Next5 videos in 30 days. If they don&rsquo;t get more views than your last 12 posts,
              your next month is free. You check it in your own stats. No forms, no arguing.
            </p>
            <div className="v3g-mini">
              {GUARANTEE_POINTS.map((point) => (
                <div key={point.title}>
                  <CheckIcon />
                  <div><b>{point.title}</b> {point.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface Stat {
  value: string;
  text: string;
  source: string;
  href: string;
  only?: Audience;
}

const NAR_2025 = 'https://www.nar.realtor/research-and-statistics/research-reports/realtor-technology-survey';
const ROOFING_2025 = 'https://digitaledition.roofingcontractor.com/may-2025/homeowner-survey/';
const MODERN_RETAIL = 'https://www.modernretail.co/operations/tiktok-shop-says-sales-from-u-s-small-businesses-climbed-66-in-2025/';

const STATS: Stat[] = [
  { only: 'realtor', value: '39%', text: 'of realtors say social media brings their best leads. No other tool comes close.', source: 'NAR Technology Survey, 2025', href: 'https://houstonagentmagazine.com/2025/09/19/nar-technology-survey/' },
  { only: 'realtor', value: '66%', text: 'of realtors adopt new tech for one reason: to save time.', source: 'NAR Technology Survey, 2025', href: NAR_2025 },
  { only: 'service', value: '40%', text: 'of millennial homeowners use social media to find roofing contractors.', source: 'Roofing Contractor homeowner survey, 2025', href: ROOFING_2025 },
  { only: 'service', value: '67%', text: 'of homeowners say online reviews are very or extremely important when they hire.', source: 'Roofing Contractor homeowner survey, 2025', href: ROOFING_2025 },
  { only: 'seller', value: '215,000+', text: 'US small businesses now sell on TikTok Shop. That’s who you compete with for views.', source: 'TikTok Shop via Modern Retail, 2026', href: MODERN_RETAIL },
  { only: 'seller', value: '+66%', text: 'sales growth for US small businesses on TikTok Shop in 2025.', source: 'TikTok Shop via Modern Retail, 2026', href: MODERN_RETAIL },
  { value: '6+ hrs', text: 'a week is what 43% of small business owners spend on social media. Next5 takes 3 minutes.', source: 'VerticalResponse survey', href: 'https://verticalresponse.com/blog/how-much-time-should-your-small-business-spend-on-social-media-marketing/' },
];

export function NumbersSection() {
  return (
    <section className="v3section">
      <div className="v3wrap">
        <div className="v3section-head" {...reveal()}>
          <h2>The numbers don&rsquo;t lie.</h2>
          <p className="v3lede">Your customers are already scrolling. The only question is whether they see you.</p>
        </div>
        <div className="v3nums">
          {STATS.map((stat, i) => (
            <div className="v3num" key={stat.value} data-only={stat.only} {...reveal(stat.only ? i % 2 : 2)}>
              <div className="n" data-count="">{stat.value}</div>
              <p>{stat.text}</p>
              <a className="v3src" href={stat.href} rel="nofollow noopener" target="_blank">{stat.source}</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FitSection({ audience }: { audience: Audience }) {
  return (
    <section className="v3section">
      <div className="v3wrap v3fit">
        <div className="v3fit-col yes" {...reveal()}>
          <h3>This is for you if</h3>
          <ul>
            <li><CheckIcon /><span className="js-fit1">{AUDIENCE_COPY[audience].fit1}</span></li>
            <li><CheckIcon /><span>You know you should post more, but don&rsquo;t</span></li>
            <li><CheckIcon /><span>You&rsquo;d rather spend 3 minutes than 3 hours</span></li>
          </ul>
        </div>
        <div className="v3fit-col no" {...reveal(1)}>
          <h3>This is not for you if</h3>
          <ul>
            <li><XIcon /><span>You love filming and editing yourself</span></li>
            <li><XIcon /><span>You want a video editor with 100 buttons</span></li>
            <li><XIcon /><span>You&rsquo;re looking for someone to run your paid ads</span></li>
          </ul>
        </div>
      </div>
    </section>
  );
}
