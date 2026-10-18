import type { ProspectViewDay } from '../../types/admin/prospects';
import { PostFrame } from './PostCard';
import { initials } from './postLabels';

const h2 = 'm-0 font-display text-[clamp(1.7rem,5vw,2.6rem)] font-[800] leading-[1.05] tracking-[-0.03em] text-app-ink';

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 h-5 w-5 text-app-accent">
    <path d="M5 12l5 5L20 7" />
  </svg>
);

const CHANGES = [
  { title: 'Your name and logo', text: 'On every post, so people know who posted it.' },
  { title: 'Your own photos', text: 'From your website, or sent from your phone.' },
  { title: 'Faces that fit your customers', text: 'Pick the people who show up in your slideshows.' },
  { title: 'You approve before anything posts', text: 'Swipe to keep a post, or skip it and get another one for that day.' },
];

/** The first post as it is now, and as it looks once it is theirs (their name on a bar). */
export function CompareSection({ name, day }: { name: string; day: ProspectViewDay | undefined }) {
  const card = 'relative aspect-[9/16] overflow-hidden rounded-[18px] bg-zinc-900 shadow-sm';
  return (
    <section className="py-14">
      <div className="mx-auto grid max-w-[1180px] items-center gap-9 px-5 md:grid-cols-[1fr_1.05fr]">
        {day && (
          <div className="grid max-w-[460px] grid-cols-2 gap-3.5">
            <figure className="m-0">
              <div className={card}><PostFrame day={day} showState={false} /></div>
              <figcaption className="mt-2 text-[13px] text-app-muted"><b className="text-app-ink">Preview</b>, what you see today</figcaption>
            </figure>
            <figure className="m-0">
              <div className={card}>
                <PostFrame
                  day={day}
                  showState={false}
                  extra={
                    <div className="absolute inset-x-0 bottom-0 z-[1] flex items-center gap-2 bg-app-accent px-2.5 py-2 text-[11px] font-semibold text-white">
                      <i className="grid h-[22px] w-[22px] place-items-center rounded-md bg-white font-display text-[10px] font-[800] not-italic text-app-accent">{initials(name)}</i>
                      <span className="truncate">{name}</span>
                    </div>
                  }
                />
              </div>
              <figcaption className="mt-2 text-[13px] text-app-muted"><b className="text-app-ink">Yours</b>, after you claim</figcaption>
            </figure>
          </div>
        )}
        <div>
          <h2 className={h2}>This is the preview. Yours looks like your business.</h2>
          <ul className="m-0 mt-5 grid list-none gap-3.5 p-0">
            {CHANGES.map((c) => (
              <li key={c.title} className="grid grid-cols-[22px_1fr] items-start gap-3">
                <Check />
                <div>
                  <b className="block font-semibold text-app-ink">{c.title}</b>
                  <span className="text-[15px] text-app-muted">{c.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { title: 'Get your posts', text: 'Enter your work email. Takes under a minute.' },
  { title: 'Connect your accounts', text: 'TikTok or Instagram. Or download each post and share it yourself.' },
  { title: 'Approve, then it posts', text: 'Nothing goes out until you say yes. Keep going only if it works for you.' },
];

export function HowItWorks() {
  return (
    <section className="border-t border-app-line py-14">
      <div className="mx-auto max-w-[1180px] px-5">
        <h2 className={h2}>How it works</h2>
        <ol className="m-0 mt-6 grid list-none gap-6 p-0 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="mb-2.5 block font-display text-[44px] font-[800] leading-none text-app-accent">{i + 1}</span>
              <b className="mb-1 block text-[18px] font-semibold text-app-ink">{s.title}</b>
              <p className="m-0 max-w-[32ch] text-app-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Questions, with the price from the app's own pricing. */
export function LeadFaq({ name, price }: { name: string; price: string }) {
  const items = [
    { q: 'Do I need to film anything?', a: 'No. The posts are built from your website and short formats that already get views. You can add your own photos later if you want.' },
    { q: 'Who writes the captions?', a: 'We do, for each post, with a day to post it. You can change any of them before they go out.' },
    { q: 'What happens after these posts?', a: `Nothing, unless you want more. Each new post is ${price}. There is no plan to cancel.` },
    { q: 'Why did I get this?', a: `We saw ${name} online and made these posts to show what we do. If you would rather not hear from us, reply "stop" and we won't contact you again.` },
  ];
  return (
    <section className="mx-auto max-w-[760px] px-5 pb-16 md:max-w-[1180px]">
      <h2 className={`${h2} mb-3.5`}>Questions</h2>
      <div className="max-w-[760px]">
        {items.map((it) => (
          <details key={it.q} className="group border-t border-app-line py-4 last:border-b">
            <summary className="flex cursor-pointer list-none justify-between gap-4 font-semibold text-app-ink [&::-webkit-details-marker]:hidden">
              {it.q}
              <span aria-hidden className="text-[22px] leading-none text-app-muted group-open:hidden">+</span>
              <span aria-hidden className="hidden text-[22px] leading-none text-app-muted group-open:inline">−</span>
            </summary>
            <p className="m-0 mt-2.5 max-w-[62ch] text-app-muted">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
