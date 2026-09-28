/** Three-step strip under the hero: one icon and a few words per step. */
type Step = { title: string; icon: React.ReactNode };

const ICON_PROPS = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

const STEPS: Step[] = [
  {
    title: 'Paste your site',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
      </svg>
    ),
  },
  {
    title: 'We study the winners',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    title: 'Get ads ready to run',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <ol className="mt-16 grid w-full gap-3 sm:grid-cols-3">
      {STEPS.map((step, i) => (
        <li key={step.title} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">{step.icon}</span>
          <span>
            <span className="block text-[11px] font-semibold text-muted dark:text-zinc-500">Step {i + 1}</span>
            <span className="block text-sm font-semibold text-ink dark:text-zinc-100">{step.title}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
