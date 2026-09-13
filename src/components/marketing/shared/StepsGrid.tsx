import { MarketingImage } from './MarketingImage';

type Step = { title: string; body: string; image?: string };

/** Numbered steps (a real sequence) with optional photos. */
export const StepsGrid = ({ steps }: { steps: readonly Step[] }) => (
  <ol className="grid gap-8 md:grid-cols-3">
    {steps.map((step, index) => (
      <li key={step.title} className="flex flex-col gap-4">
        {step.image && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-app-sunken ring-1 ring-black/5 dark:ring-white/10">
            <MarketingImage src={step.image} sizes="(min-width: 768px) 33vw, 100vw" />
          </div>
        )}
        <div className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-[13px] font-semibold tabular-nums text-app-accent">
            {index + 1}
          </span>
          <div>
            <h3 className="text-[17px] font-semibold text-app-ink">{step.title}</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-app-muted">{step.body}</p>
          </div>
        </div>
      </li>
    ))}
  </ol>
);
