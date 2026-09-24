import type { ReactNode } from 'react';
import { AUDIENCE_COPY, type Audience } from './copy';
import { CheckIcon } from './icons';
import { reveal } from './reveal';

function OfferRow({ children, value, bonus = false, index }: { children: ReactNode; value: string; bonus?: boolean; index: number }) {
  return (
    <div className={bonus ? 'row bonus' : 'row'} {...reveal(index)}>
      <span className="item">
        {bonus ? <em>Bonus</em> : <CheckIcon />}
        <span>{children}</span>
      </span>
      <span className="val">{value}</span>
    </div>
  );
}

export function OfferSection({ audience }: { audience: Audience }) {
  const c = AUDIENCE_COPY[audience];
  return (
    <section className="v3section v3offer-sec" id="offer">
      <div className="v3wrap">
        <div className="v3section-head v3center" {...reveal()}>
          <h2>Here&rsquo;s everything you get.</h2>
          <p className="v3lede">Every month, for one price.</p>
        </div>
        <div className="v3stack">
          <OfferRow value="$800" index={0}><b>20 videos a month</b> made from your <span className="js-noun">{c.noun}</span> photos</OfferRow>
          <OfferRow value="$400" index={1}><b>10 <span className="js-photos">{c.photos}</span></b> for the days between videos</OfferRow>
          <OfferRow value="Included" index={2}><b>Your month planned</b>, one post for every day</OfferRow>
          <OfferRow value="Included" index={3}><b>Hooks, captions and hashtags</b> written for every post</OfferRow>
          <OfferRow value="Included" index={4}><b>Up to 5 options a day.</b> Swipe until you love it.</OfferRow>
          <OfferRow value="Free" bonus index={0}><b>Your first video free</b>, before you pay anything</OfferRow>
          <OfferRow value="$100" bonus index={1}><b>A 15-minute setup call</b> with the founder to plan your first month</OfferRow>
          <OfferRow value="$150" bonus index={2}><b>Profile makeover:</b> new bio and a pro headshot</OfferRow>
          <div className="v3total" {...reveal()}><span>Total value</span><s data-count="">$1,450</s></div>
          <div className="v3price-row" {...reveal()}>
            <div>
              <div className="v3today">Founding price, locked for life</div>
              <div className="v3price-big"><span data-count="">$249</span><small>/month</small></div>
              <div className="v3per">That&rsquo;s about $8 a post. Goes to $349 after the first 50 businesses.</div>
            </div>
            <a className="v3btn v3btn-signal v3btn-lg" href="#top">Start with a free video</a>
          </div>
          <p className="v3vnote">Values use the low end of typical freelance rates of $40 to $150 per post (WebFX, 2026).</p>
        </div>
      </div>
    </section>
  );
}
