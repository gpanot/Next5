import { HOME_STEPS } from '../../../content/business/home';
import { MiniCalendar } from './MiniCalendar';

/** Three steps on one side, the month they produce on the other. */
export const HomeHowItWorks = () => (
  <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
    <ol className="flex flex-col gap-6">
      {HOME_STEPS.map((step, index) => (
        <li key={step.title} className="flex gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-[15px] font-semibold tabular-nums text-app-accent">{index + 1}</span>
          <div>
            <h3 className="text-[18px] font-semibold text-app-ink">{step.title}</h3>
            <p className="mt-1 text-[16px] leading-relaxed text-app-muted">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
    <MiniCalendar />
  </div>
);
