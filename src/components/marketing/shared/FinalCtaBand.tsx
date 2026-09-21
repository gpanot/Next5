import { CtaLink } from './CtaLink';

type FinalCtaBandProps = { title: string; body: string; href: string; cta: string; secondary?: { href: string; cta: string } };

export const FinalCtaBand = ({ title, body, href, cta, secondary }: FinalCtaBandProps) => (
  <section className="px-5 pb-16 sm:px-8 sm:pb-24">
    <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 rounded-3xl bg-ink px-6 py-12 text-white sm:px-12 sm:py-16 lg:flex-row lg:items-center lg:justify-between dark:bg-app-panel dark:ring-1 dark:ring-app-line">
      <div className="max-w-xl">
        <h2 className="font-display text-[32px] font-medium leading-[1.08] text-balance sm:text-[40px]">{title}</h2>
        <p className="mt-3 text-[16px] text-white/70 dark:text-app-muted">{body}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
        <CtaLink href={href} variant="inverse" className="shrink-0 dark:bg-app-cta dark:text-app-cta-ink">
          {cta}
        </CtaLink>
        {secondary && (
          <CtaLink href={secondary.href} variant="inverse" className="shrink-0 dark:bg-app-cta dark:text-app-cta-ink">
            {secondary.cta}
          </CtaLink>
        )}
      </div>
    </div>
  </section>
);
