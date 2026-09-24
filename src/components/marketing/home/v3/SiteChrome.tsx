/** Promo bar, nav, footer and sticky mobile CTA for homepage v3. */
import Link from 'next/link';

export function PromoBar() {
  return (
    <div className="v3promo">
      <span className="long">Founding price: $249/month, locked for life for the first 50 businesses. Then $349.</span>
      <span className="short">$249/month for life. First 50 only.</span>{' '}
      <a href="#offer">See the offer</a>
    </div>
  );
}

export function SiteNav() {
  return (
    <header className="v3nav">
      <div className="v3wrap">
        <a className="v3logo" href="#top">NEXT<span>5</span></a>
        <nav className="v3nav-links" aria-label="Main">
          <a href="#offer">The offer</a>
          <a href="#guarantee">Guarantee</a>
          <a href="#faq">Questions</a>
        </nav>
        <div className="v3nav-right">
          <Link className="v3login" href="/app/login">Log in</Link>
          <a className="v3btn v3btn-sm" href="#top">Get my free video</a>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="v3footer">
      <div className="v3wrap">
        <div>
          <span className="v3logo">NEXT<span>5</span></span>
          <p style={{ marginTop: '8px' }}>Videos and posts for realtors, home services and TikTok Shop sellers.</p>
        </div>
        <nav aria-label="Footer">
          <a href="/legal/terms">Terms</a>
          <a href="/legal/privacy">Privacy</a>
          <a href="mailto:hello@next5.ai">Contact</a>
        </nav>
      </div>
    </footer>
  );
}

export function StickyCta() {
  return (
    <div className="v3sticky-cta js-sticky-cta">
      <a className="v3btn v3btn-signal" href="#top">Make my free video</a>
    </div>
  );
}
