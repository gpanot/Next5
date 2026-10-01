import { FAQ } from './pricing';

/** Objections, answered in plain words. Native <details> so it works without JS and with the keyboard. */
export function PricingFaq() {
  return (
    <section className="w-full text-left">
      <h3 className="text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl dark:text-zinc-100">Questions</h3>
      <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group p-4 md:p-5">
            <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink dark:text-zinc-100">
              {q}
              <span aria-hidden className="text-xl text-muted transition-transform duration-200 group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted dark:text-zinc-400">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
