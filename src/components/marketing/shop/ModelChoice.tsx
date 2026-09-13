import { Sparkles, UserRound } from 'lucide-react';

const OPTIONS = [
  { icon: UserRound, title: 'Wear it yourself', body: 'Upload two selfies and one full-body photo once. Every product can be worn by you — your customers already know your face.' },
  { icon: Sparkles, title: 'Studio models', body: 'Six Next5 models of different ages and body types, available on every product. Pro plans include all six.' },
] as const;

export const ModelChoice = () => (
  <div className="grid gap-4 md:grid-cols-2">
    {OPTIONS.map(({ icon: Icon, title, body }) => (
      <div key={title} className="flex gap-4 rounded-2xl border border-app-line bg-app-panel p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent"><Icon aria-hidden className="h-5 w-5" /></span>
        <div>
          <h3 className="text-[17px] font-semibold text-app-ink">{title}</h3>
          <p className="mt-1 text-[15px] leading-relaxed text-app-muted">{body}</p>
        </div>
      </div>
    ))}
  </div>
);
