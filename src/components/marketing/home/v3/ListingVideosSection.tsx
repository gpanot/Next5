import { SplitWords } from '../../../motion/SplitWords';
import { reveal } from './reveal';

/**
 * "From your Zillow listing": the two voiced videos the listing-video pipeline made, unedited,
 * from 2784 Bell Dr, Smyrna (25 photos). Files: public/videos/listing/bell-*.{mp4,jpg}.
 */
const VIDEOS = [
  { id: 'editorial', name: 'Editorial tour', line: 'Calm, magazine look. Ends on the price.' },
  { id: 'rate', name: 'Rate this house', line: 'Room by room. Asks viewers for a 1–10.' },
];

const STEPS = ['Share your Zillow link.', 'Wait 2 minutes.', 'Post on TikTok, Instagram and Facebook.'];

export function ListingVideosSection() {
  return (
    <section className="v3section" id="listing-videos">
      <div className="v3wrap v3lv-grid">
        <div className="v3lv-head" {...reveal()}>
            <p className="v3eyebrow">From your Zillow listing</p>
            <h2 data-split=""><SplitWords text="Your listing in. Your videos out." /></h2>
            <p className="v3lede">
              Fully automated from a new listing (2784 Bell Dr, Smyrna, 25 photos): no hand-picked photos or
              hand-written copy. Voice, music and captions included.
            </p>
        </div>
        <div className="v3lv-steps">
          <ol className="v3mini-steps">
            {STEPS.map((step, i) => (
              <li key={step} {...reveal(i + 1)}><b>{i + 1}</b><span>{step}</span></li>
            ))}
          </ol>
          <p className="v3lv-note" {...reveal(4)}>
            These are 2 of <b>20 templates</b> you can reuse on every listing.
          </p>
        </div>
        <div className="v3lv-videos">
          {VIDEOS.map((video, i) => (
            <figure className="v3lv-card" key={video.id} {...reveal(i + 1)}>
              <div className="v3lv-frame">
                <video
                  src={`/videos/listing/bell-${video.id}.mp4`}
                  poster={`/videos/listing/bell-${video.id}.jpg`}
                  aria-label={`${video.name} video made from the 2784 Bell Dr listing`}
                  controls
                  playsInline
                  muted
                  loop
                  autoPlay
                  preload="none"
                />
              </div>
              <figcaption>
                <b>{video.name}</b>
                <span>{video.line}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
