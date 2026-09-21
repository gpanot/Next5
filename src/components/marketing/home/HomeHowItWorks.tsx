import { HOME_STEPS } from '../../../content/business/home';

/** Three numbered cards in a row. The month they produce is already shown in the hero calendar. */
export const HomeHowItWorks = () => (
  <ol className="grid gap-3 sm:grid-cols-3 sm:gap-5">
    {HOME_STEPS.map((step, index) => (
      <li key={step.title} className="flex flex-col gap-3 rounded-2xl bg-app-panel p-5 shadow-sm ring-1 ring-app-line transition-shadow duration-300 hover:shadow-md sm:p-6">
        <span className="font-display text-[40px] font-bold leading-none tabular-nums text-app-accent">0{index + 1}</span>
        <h3 className="text-[19px] font-semibold text-app-ink">{step.title}</h3>
        <p className="text-[16px] leading-relaxed text-app-muted">{step.body}</p>
      </li>
    ))}
  </ol>
);
