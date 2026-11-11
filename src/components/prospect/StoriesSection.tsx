import { MarketingImage } from '../marketing/shared/MarketingImage';

const SLIDES = [
  '/images/auto-slideshow/realtor-habits/1.jpg',
  '/images/auto-slideshow/realtor-habits/4.jpg',
  '/images/auto-slideshow/listing-video-tips/1.jpg',
];

const WAYS = [
  { title: 'Add your team', text: 'Add a photo of you or a team member, and we make your brand face from it.' },
  { title: 'Or make a brand avatar', text: 'Camera shy? We make a face for your brand. It stays the same in every post.' },
  { title: 'We write the stories', text: 'New stories for your faces every 14 days, built on what your customers ask.' },
];

/** The Brand Cast idea: recurring faces and a month of stories. Follows the "this is the preview" section. */
export function StoriesSection() {
  return (
    <section className="border-t border-app-line py-14">
      <div className="mx-auto grid max-w-[1180px] items-center gap-9 px-5 md:grid-cols-[1.05fr_1fr]">
        <div>
          <h2 className="m-0 font-display text-[clamp(1.7rem,5vw,2.6rem)] font-[800] leading-[1.05] tracking-[-0.03em] text-app-ink">We create stories for you</h2>
          <p className="m-0 mt-3 max-w-[46ch] text-[17px] text-app-muted">People trust a face they see again and again. So your posts keep the same faces, with a new story each time.</p>
          <ul className="m-0 mt-6 grid list-none gap-4 p-0">
            {WAYS.map((way, i) => (
              <li key={way.title} className="grid grid-cols-[32px_1fr] gap-3">
                <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-app-accent-soft font-display text-[14px] font-[800] text-app-accent">{i + 1}</span>
                <div>
                  <b className="block font-semibold text-app-ink">{way.title}</b>
                  <span className="text-[15px] text-app-muted">{way.text}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="m-0 mt-6 rounded-xl bg-app-accent-soft px-4 py-3 font-semibold text-app-ink">Showing up often is the key to trust and engagement. We keep you showing up.</p>
        </div>
        <div>
          <ul className="m-0 grid list-none grid-cols-3 gap-2.5 p-0">
            {SLIDES.map((src) => (
              <li key={src} className="relative aspect-[4/5] overflow-hidden rounded-xl bg-zinc-900 shadow-sm">
                <MarketingImage src={src} sizes="(min-width: 768px) 180px, 31vw" className="object-cover" />
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2 text-[13px] text-app-muted">Example stories made with Next5.</p>
        </div>
      </div>
    </section>
  );
}
