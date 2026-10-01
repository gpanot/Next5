import Image from 'next/image';
import { SplitWords } from '../../../motion/SplitWords';
import { AUDIENCE_COPY, type Audience } from './copy';
import { CheckIcon, TikTokIcon, VolumeOffIcon, VolumeOnIcon } from './icons';

/** Phone-filmed stills for the audiences without a demo video yet. Both are in public/images/manifest.json. */
const DEMO_STILLS: { only: Audience; src: string; alt: string }[] = [
  { only: 'service', src: '/images/business/us/service-video.png', alt: 'Electrician talking to the camera beside an open breaker panel, filmed on a phone' },
  { only: 'seller', src: '/images/business/us/shop-video.png', alt: 'Young woman showing a beige trench coat to the camera in her bright bedroom' },
];

const AUDIENCE_LABELS: { id: Audience; label: string }[] = [
  { id: 'realtor', label: 'Realtor' },
  { id: 'service', label: 'Home services' },
  { id: 'seller', label: 'TikTok Shop' },
];

function AudienceToggle({ audience }: { audience: Audience }) {
  return (
    <div className="v3aud" role="group" aria-label="I am a" data-intro="1">
      {AUDIENCE_LABELS.map(({ id, label }) => (
        <button key={id} type="button" data-aud={id} aria-pressed={audience === id ? 'true' : 'false'}>
          {label}
        </button>
      ))}
    </div>
  );
}

function HeroDemo({ audience }: { audience: Audience }) {
  const c = AUDIENCE_COPY[audience];
  return (
    <div className="v3stage" data-intro="2" data-intro-lift="64" data-tilt-zone="">
      <div className="v3phone" data-tilt="">
        <div className="v3phone-notch" />
        <div className="v3phone-screen">

          {/* ── Background layer ── */}
          {/* Non-realtor: a phone-filmed still of the kind of video we make */}
          {DEMO_STILLS.map((still) => (
            <Image key={still.only} className="v3photo" data-only={still.only} src={still.src} alt={still.alt} fill sizes="(max-width: 520px) 236px, 290px" />
          ))}
          {/* Realtor: the actual UGC clone video — plays after build animation */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            className="v3ugc-vid js-realtor-video"
            data-only="realtor"
            src="/realtor-ugc-clone.mp4"
            playsInline
            muted
            loop
            preload="none"
          />

          {/* ── Realtor-only decorations (sit above video, below build overlay) ── */}
          {/* TikTok badge */}
          <div className="v3tktk-badge" data-only="realtor" aria-hidden="true">
            <TikTokIcon /> TikTok
          </div>
          {/* Mute/unmute toggle — top-right, realtor only, shown when video plays */}
          <button
            className="v3mute-btn js-mute-btn"
            data-only="realtor"
            aria-label="Toggle sound"
            type="button"
          >
            <span className="v3mute-off"><VolumeOffIcon /></span>
            <span className="v3mute-on"><VolumeOnIcon /></span>
          </button>
          {/* Realtor headshot inset — bottom-right corner */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="v3headshot" data-only="realtor" aria-hidden="true">
            <img src="/realtor-headshot.jpeg" alt="" />
          </div>

          {/* ── Overlay: hook (service/seller only) + facts (all audiences) ── */}
          <div className="v3video-ov">
            {/* Hook text — hidden for realtor via data-only + CSS */}
            <div data-only="service seller">
              <div className="v3hook js-hook">{c.hooks[0]}</div>
              <div className="v3hookdots"><i className="on" /><i /><i /></div>
            </div>
            {/* Facts: price/beds/baths for realtor, service facts, product stats */}
            <div className="v3facts js-facts">
              {c.facts.map((fact) => <span key={fact}>{fact}</span>)}
            </div>
          </div>

          {/* ── Build animation (z-index:2, fades out on .done) ── */}
          <div className="v3build js-build" aria-live="polite">
            <h4>Making your video</h4>
            <ul className="v3steps-live">
              <li><i className="dot" /><span className="js-s0">{c.s0}</span></li>
              <li><i className="dot" /><span>Writing your hook</span></li>
              <li><i className="dot" /><span>Putting it together</span></li>
              <li><i className="dot" /><span>Your video is ready</span></li>
            </ul>
            <div className="v3thumbs js-thumbs">
              <div /><div /><div /><div /><div /><div /><div /><div />
            </div>
            {/* Progress bar — animated by JS via CSS custom property */}
            <div className="v3progress" aria-hidden="true">
              <div className="v3progress-bar js-progress-bar" />
            </div>
          </div>

        </div>
      </div>
      <div className="v3side-card v3timer">
        <b>Time you spent</b>
        <div className="big-n">0 min</div>
        <span>filming, editing, writing captions</span>
      </div>
    </div>
  );
}

export function HeroSection({ audience }: { audience: Audience }) {
  const c = AUDIENCE_COPY[audience];
  return (
    <section className="v3hero">
      <div className="v3wrap v3hero-grid">
        <div>
          <AudienceToggle audience={audience} />
          <h1 data-intro-split="">
            <SplitWords className="js-h1a" text={c.h1} />
            <SplitWords className="l2" text="Without filming a single one." />
          </h1>
          <p className="v3lede js-sub" data-intro="3">{c.sub}</p>

          <form className="v3linkbox js-form" autoComplete="off">
            <label htmlFor="link1">Your link</label>
            <input id="link1" className="js-input" type="url" inputMode="url" enterKeyHint="go" placeholder={c.ph} />
            <button className="v3btn v3btn-signal" type="submit">Make my free video</button>
          </form>

          <div className="v3fine" data-intro="4">
            <span><CheckIcon />Free video, no card</span>
            <span><CheckIcon />2 minutes</span>
            <span><CheckIcon />Keep it even if you never pay</span>
          </div>

          <div className="v3stars" data-intro="5">
            <span className="v3stat-pill">
              <b className="js-statnum">{c.statNum}</b>
              <span className="js-stattext"> {c.statText}</span>
            </span>
            <span className="v3src js-src">{c.src}</span>
          </div>
        </div>
        <HeroDemo audience={audience} />
      </div>
    </section>
  );
}
