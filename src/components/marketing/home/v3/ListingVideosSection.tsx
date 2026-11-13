import { SplitWords } from '../../../motion/SplitWords';
import { InViewVideo } from './InViewVideo';
import { ZillowIcon } from './icons';
import { reveal } from './reveal';

/**
 * "From your Zillow listing": six voiced videos the listing-video pipeline made, unedited,
 * from 2784 Bell Dr, Smyrna (25 photos). Files: public/videos/listing/bell-*.{mp4,jpg}.
 * Names and lines match PRESET_META in src/server/realtorVideo/presets.ts.
 */
const VIDEOS = [
  { id: 'editorial', name: 'Editorial tour', line: 'Calm, magazine look. Ends on the price.' },
  { id: 'rate', name: 'Rate this house', line: 'Room by room. Asks viewers for a 1–10.' },
  { id: 'pov', name: 'POV: you live here', line: 'Told to the viewer, like they just moved in.' },
  { id: 'top3', name: '3 things I love', line: 'A numbered countdown of the best parts.' },
  { id: 'alert', name: 'New listing alert', line: 'Bright series look, photo cards and notes.' },
  { id: 'luxe', name: 'Luxury showcase', line: 'Dark and slow, big titles. For high-end homes.' },
];

/** Total templates in the library; the 6 above are the ones rendered for this listing. */
const TEMPLATE_TOTAL = '20+';

const STEPS = ['Share your Zillow link.', 'Wait 2 minutes.', 'Post on TikTok, Instagram and Facebook.'];

/** Last tile: a stack of template frames that says the 6 shown are only part of the library. */
function MoreTemplates() {
  return (
    <div className="v3lv-card v3lv-more" {...reveal(2)}>
      <div className="v3lv-frame v3lv-more-frame">
        <div className="v3lv-stack" aria-hidden="true">
          {['luxe', 'top3', 'alert'].map((id) => (
            <span key={id} style={{ backgroundImage: `url(/videos/listing/bell-${id}.jpg)` }} />
          ))}
        </div>
        <p><b>{TEMPLATE_TOTAL}</b><span>templates</span></p>
      </div>
      <div className="v3lv-more-cap">
        <b>And many more</b>
        <span>A template for every kind of post: tours, countdowns, alerts and more.</span>
      </div>
    </div>
  );
}

export function ListingVideosSection() {
  return (
    <section className="v3section" id="listing-videos">
      <div className="v3wrap">
        <div className="v3lv-top">
          <div {...reveal()}>
            <p className="v3eyebrow"><ZillowIcon size={18} />From your Zillow listing</p>
            <h2 data-split=""><SplitWords text="Your listing in. Your videos out." /></h2>
            <p className="v3lede">
              One listing (2784 Bell Dr, Smyrna, 25 photos), {VIDEOS.length} of our {TEMPLATE_TOTAL} templates. Fully automated: no hand-picked
              photos or hand-written copy. Voice, music and captions included.
            </p>
          </div>
          <ol className="v3mini-steps">
            {STEPS.map((step, i) => (
              <li key={step} {...reveal(i + 1)}><b>{i + 1}</b><span>{step}</span></li>
            ))}
          </ol>
        </div>
        <div className="v3lv-videos">
          {VIDEOS.map((video, i) => (
            <figure className="v3lv-card" key={video.id} {...reveal(i % 3)}>
              <div className="v3lv-frame">
                <InViewVideo
                  src={`/videos/listing/bell-${video.id}.mp4`}
                  poster={`/videos/listing/bell-${video.id}.jpg`}
                  label={`${video.name} video made from the 2784 Bell Dr listing`}
                />
              </div>
              <figcaption>
                <b>{video.name}</b>
                <span>{video.line}</span>
              </figcaption>
            </figure>
          ))}
          <MoreTemplates />
        </div>
        <p className="v3lv-note" {...reveal()}>
          {TEMPLATE_TOTAL} templates made for real estate. Use any of them on every listing, or let Autopilot rotate them across your week.
        </p>
      </div>
    </section>
  );
}
