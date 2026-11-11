import { MarketingImage } from '../../marketing/shared/MarketingImage';
import { BlueprintVideo } from './BlueprintVideo';
import type { BlueprintMedia, BlueprintStep } from './blueprintContent';

function Media({ media }: { media: BlueprintMedia }) {
  if (media.kind === 'video') return <div className="mx-auto w-full max-w-[420px]"><BlueprintVideo src={media.src} poster={media.poster} label={media.label} /></div>;
  return (
    <figure className="m-0 mx-auto w-full max-w-[320px]">
      <div style={{ aspectRatio: media.ratio }} className="relative overflow-hidden rounded-xl border border-app-line bg-zinc-100 shadow-sm dark:bg-zinc-800">
        <MarketingImage src={media.src} sizes="320px" className="object-cover" />
      </div>
      <figcaption className="mt-2 text-[13px] text-app-muted">{media.caption}</figcaption>
    </figure>
  );
}

function Stats({ stats }: { stats: NonNullable<BlueprintStep['stats']> }) {
  return (
    <dl className="m-0 mt-5 grid gap-2.5 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-app-line p-4">
          <dd className="m-0 font-display text-[28px] font-[800] leading-none tracking-[-0.02em] text-app-accent">{stat.value}</dd>
          <dt className="mt-2 text-[14px] leading-snug text-app-muted">
            {stat.label} <a href="#blueprint-sources" className="text-app-muted underline underline-offset-2 transition hover:text-app-ink" aria-label={`Source ${stat.source}`}>[{stat.source}]</a>
          </dt>
        </div>
      ))}
    </dl>
  );
}

function Cards({ cards }: { cards: NonNullable<BlueprintStep['cards']> }) {
  return (
    <ul className="m-0 mt-5 grid list-none gap-2.5 p-0 sm:grid-cols-2">
      {cards.map((card) => (
        <li key={card.title} className="rounded-xl border border-app-line p-4">
          <b className="block text-[17px] font-semibold text-app-ink">{card.title}</b>
          <span className="mt-0.5 block text-[14px] font-semibold text-app-accent">{card.job}</span>
          <p className="m-0 mt-2 text-[15px] text-app-muted">{card.text}</p>
        </li>
      ))}
    </ul>
  );
}

/** One numbered step: why it matters, what to do, how Next5 helps, and its proof or picture. */
export function BlueprintStepView({ step, index }: { step: BlueprintStep; index: number }) {
  return (
    <li id={`blueprint-step-${index + 1}`} className="scroll-mt-4 border-t border-app-line py-10 md:py-14">
      <div className={`grid gap-8 ${step.media ? 'md:grid-cols-[1.25fr_1fr] md:items-start' : ''}`}>
        <div className="min-w-0 max-w-[720px]">
          <span className="font-display text-[15px] font-[800] uppercase tracking-[0.08em] text-app-accent">Step {index + 1}</span>
          <h3 className="m-0 mt-1 font-display text-[clamp(1.5rem,4.4vw,2.1rem)] font-[800] leading-[1.1] tracking-[-0.025em] text-app-ink">{step.title}</h3>
          {step.paragraphs.map((text) => <p key={text} className="m-0 mt-3 text-[17px] leading-relaxed text-app-muted">{text}</p>)}
          {step.stats && <Stats stats={step.stats} />}
          {step.cards && <Cards cards={step.cards} />}
          <p className="m-0 mt-5 font-semibold text-app-ink">Do this:</p>
          <ul className="m-0 mt-2 grid list-disc gap-1.5 pl-5 text-[16px] text-app-muted marker:text-app-accent">
            {step.doThis.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p className="m-0 mt-5 rounded-xl bg-app-accent-soft px-4 py-3 text-[15px] text-app-ink"><b className="font-semibold">With Next5:</b> {step.next5}</p>
        </div>
        {step.media && <Media media={step.media} />}
      </div>
    </li>
  );
}
