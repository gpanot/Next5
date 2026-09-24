import { AUDIENCE_COPY, type Audience } from './copy';
import { CheckIcon, PlayIcon } from './icons';

const AUDIENCE_LABELS: { id: Audience; label: string }[] = [
  { id: 'realtor', label: 'Realtor' },
  { id: 'service', label: 'Home services' },
  { id: 'seller', label: 'TikTok Shop' },
];

function AudienceToggle({ audience }: { audience: Audience }) {
  return (
    <div className="v3aud" role="group" aria-label="I am a">
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
    <div className="v3stage">
      <div className="v3phone">
        <div className="v3phone-notch" />
        <div className="v3phone-screen">
          <div className="v3ph" data-kind="video" style={{ position: 'absolute', inset: 0 }}>
            <div className="v3ph-label">
              <PlayIcon />
              <span className="js-phlabel">{c.label}</span>
            </div>
          </div>
          <div className="v3video-ov">
            <div>
              <div className="v3hook js-hook">{c.hooks[0]}</div>
              <div className="v3hookdots"><i className="on" /><i /><i /></div>
            </div>
            <div className="v3facts js-facts">
              {c.facts.map((fact) => <span key={fact}>{fact}</span>)}
            </div>
          </div>
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
          <h1>
            <span className="js-h1a">{c.h1}</span>
            <span className="l2">Without filming a single one.</span>
          </h1>
          <p className="v3lede js-sub">{c.sub}</p>

          <form className="v3linkbox js-form" autoComplete="off">
            <label htmlFor="link1">Your link</label>
            <input id="link1" className="js-input" type="url" inputMode="url" enterKeyHint="go" placeholder={c.ph} />
            <button className="v3btn v3btn-signal" type="submit">Make my free video</button>
          </form>

          <div className="v3fine">
            <span><CheckIcon />Free video, no card</span>
            <span><CheckIcon />2 minutes</span>
            <span><CheckIcon />Keep it even if you never pay</span>
          </div>

          <div className="v3stars">
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
