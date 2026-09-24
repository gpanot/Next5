import { AUDIENCE_COPY, type Audience } from './copy';
import { reveal } from './reveal';

const FAQS = [
  { q: 'What if the videos aren’t good?', a: 'Swipe left and we make another. If a video gets your business wrong, we remake it free. And your first one costs nothing, so you’ll know before you pay.' },
  { q: 'Will people know it’s AI?', a: 'Your videos use your real photos and your real details. Nothing is invented about your business.' },
  { q: 'Do you post for me?', a: 'Not yet. Today you post from your phone with the caption ready to copy. Posting for you is coming next, included in your plan.' },
  { q: 'What do I need to start?', a: 'One link. Your Zillow listing, your website, or your TikTok Shop product. That’s it.' },
  { q: 'Can I cancel?', a: 'Anytime, in 2 clicks. No contract, no call. Every video you made stays yours.' },
];

export function FaqSection() {
  return (
    <section className="v3section" id="faq">
      <div className="v3wrap">
        <div className="v3section-head" {...reveal()}><h2>Still on the fence?</h2></div>
        <div className="v3faq">
          {FAQS.map((faq, i) => (
            <details key={faq.q} open={i === 0} {...reveal(i)}>
              <summary>{faq.q}</summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCtaSection({ audience }: { audience: Audience }) {
  return (
    <section className="v3final">
      <div className="v3wrap">
        <div className="v3final-box" {...reveal()}>
          <h2>You have two options.</h2>
          <div className="v3two">
            <p><b>Option 1:</b> keep telling yourself you&rsquo;ll post next week.</p>
            <p><b>Option 2:</b> paste your link and watch your first video in 2 minutes. Free.</p>
          </div>
          <form className="v3linkbox js-form2" autoComplete="off">
            <label htmlFor="link2">Your link</label>
            <input id="link2" className="js-input2" type="url" inputMode="url" enterKeyHint="go" placeholder={AUDIENCE_COPY[audience].ph} />
            <button className="v3btn" type="submit">Make my free video</button>
          </form>
          <p className="v3fine-w">No card. Keep the video even if you never pay.</p>
        </div>
      </div>
    </section>
  );
}
