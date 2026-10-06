import { PRICE_CENTS, PRICE_LABEL, STACK_TOTAL, VALUE_STACK, money } from './pricing';

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0 text-emerald-500">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Hormozi-style stack: everything in one slideshow, what each piece costs to hire out, then the real price. */
export function ValueStack() {
  return (
    <section className="w-full text-left">
      <h3 className="text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl dark:text-zinc-100">What you get for {PRICE_LABEL}</h3>
      <p className="mt-2 text-center text-base text-muted dark:text-zinc-400">Every single slideshow. Every single day.</p>
      <ul className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {VALUE_STACK.map((item) => (
          <li key={item.title} className="flex items-start gap-3 p-4 md:p-5">
            <Check />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink dark:text-zinc-100">{item.title}</p>
              <p className="mt-0.5 text-sm text-muted dark:text-zinc-400">{item.detail}</p>
            </div>
            <span className="shrink-0 text-sm text-muted tabular-nums line-through decoration-red-400 dark:text-zinc-500">${item.anchor}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 bg-zinc-50 p-4 md:p-5 dark:bg-zinc-950">
          <span className="text-sm font-semibold text-muted dark:text-zinc-400">If you hired it out</span>
          <span className="text-lg font-bold text-muted tabular-nums line-through decoration-red-400 dark:text-zinc-500">${STACK_TOTAL}</span>
        </li>
        <li className="flex items-center justify-between gap-3 bg-blue-600 p-4 text-white md:p-5 dark:bg-blue-500">
          <span className="font-semibold">Your price</span>
          <span className="text-3xl font-extrabold tabular-nums">{money(PRICE_CENTS)}</span>
        </li>
      </ul>
    </section>
  );
}
