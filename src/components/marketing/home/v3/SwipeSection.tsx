import { AUDIENCE_COPY, type Audience } from './copy';
import { XIcon } from './icons';
import { reveal } from './reveal';

const STEPS = ['Paste your link once.', 'Swipe through your week.', 'Post with the caption ready.'];

function SwipeDeck({ audience }: { audience: Audience }) {
  return (
    <div className="v3deck-demo" aria-hidden="true" {...reveal(1)}>
      <div className="v3dd-day">Tuesday <span>6:30pm</span></div>
      <div className="v3dd-stack">
        <div className="v3dd-card b2" />
        <div className="v3dd-card b1" />
        <div className="v3dd-card top js-ddcard">
          <div className="v3ph" data-kind="video" style={{ position: 'absolute', inset: 0 }}>
            <div className="v3ph-label">Video option</div>
          </div>
          <div className="v3dd-hook js-ddhook">{AUDIENCE_COPY[audience].dd}</div>
        </div>
      </div>
      <div className="v3dd-btns">
        <span className="v3dd-no"><XIcon /></span>
        <span className="v3dd-yes">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        </span>
      </div>
    </div>
  );
}

export function SwipeSection({ audience }: { audience: Audience }) {
  return (
    <section className="v3section">
      <div className="v3wrap v3swipe-grid">
        <div>
          <div {...reveal()}>
            <h2>Your only job: swipe.</h2>
            <p className="v3lede">
              Every week we make options for each day. Swipe right on the one you like.
              Swipe left and we show you another.
            </p>
          </div>
          <ol className="v3mini-steps">
            {STEPS.map((step, i) => (
              <li key={step} {...reveal(i + 1)}><b>{i + 1}</b><span>{step}</span></li>
            ))}
          </ol>
        </div>
        <SwipeDeck audience={audience} />
      </div>
    </section>
  );
}
