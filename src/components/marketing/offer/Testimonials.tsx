import { Quote } from 'lucide-react';
import { OFFER_SHARED, type Testimonial } from '../../../content/business/offer';
import { Section } from '../shared/Section';

/** Placeholders render outside production (or with NEXT5_SHOW_PLACEHOLDER_TESTIMONIALS=true on a preview) so the layout is ready. */
const showPlaceholders = (): boolean => process.env.NODE_ENV !== 'production' || process.env.NEXT5_SHOW_PLACEHOLDER_TESTIMONIALS === 'true';

const Card = ({ t }: { t: Testimonial }) => (
  <figure className="relative flex flex-col gap-4 rounded-2xl border border-app-line bg-app-panel p-6">
    {!t.verified && <span className="label-caps absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800">Example</span>}
    <Quote aria-hidden className="h-6 w-6 text-app-accent" />
    <blockquote className="text-[16px] leading-relaxed text-app-ink">“{t.quote}”</blockquote>
    {t.result && (
      <p className="rounded-xl bg-app-sunken px-3 py-2 text-[14px] text-app-muted">
        {t.result.label}: <span className="tabular-nums">{t.result.before}</span> → <span className="font-semibold tabular-nums text-app-ink">{t.result.after}</span>
      </p>
    )}
    <figcaption className="mt-auto flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-app-accent-soft text-[15px] font-semibold text-app-accent" aria-hidden>{t.name[0]}</span>
      <span className="text-[14px] leading-tight"><span className="block font-semibold text-app-ink">{t.name}</span><span className="text-app-muted">{t.role} · {t.city}</span></span>
    </figcaption>
  </figure>
);

/** Member stories. Only verified ones ship to production; with none, the whole section is hidden. */
export const Testimonials = ({ items, tone = 'plain' }: { items: readonly Testimonial[]; tone?: 'plain' | 'sunken' }) => {
  const visible = items.filter((t) => t.verified || showPlaceholders());
  if (visible.length === 0) return null;
  const hasPlaceholders = visible.some((t) => !t.verified);
  return (
    <Section tone={tone} eyebrow="Real results" title={OFFER_SHARED.testimonialsTitle} sub={hasPlaceholders ? OFFER_SHARED.testimonialsPlaceholderNote : undefined}>
      <div className="grid gap-4 md:grid-cols-3">{visible.map((t) => <Card key={t.id} t={t} />)}</div>
    </Section>
  );
};
