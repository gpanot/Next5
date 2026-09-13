import Link from 'next/link';
import { HomeHeroVisual } from './HomeHeroVisual';
import { ProductChooser } from './ProductChooser';
import { FaqAccordion } from '../shared/FaqAccordion';
import { FinalCtaBand } from '../shared/FinalCtaBand';
import { GuaranteeRow } from '../shared/GuaranteeRow';
import { ProductHero } from '../shared/ProductHero';
import { Section } from '../shared/Section';
import { StepsGrid } from '../shared/StepsGrid';
import { BRAND, HOME } from '../../../content/business/marketing';

/** Business home at `/` (Brand + Shop chooser). Rendered inside MarketingShell. */
export const BusinessHome = () => (
  <>
    <ProductHero
      {...HOME.hero}
      cta={{ href: '/brand', label: 'For professionals' }}
      secondary={{ href: '/shop', label: 'For online shops →' }}
      visual={<HomeHeroVisual />}
    />
    <Section id="products" tone="sunken" eyebrow="Two studios" title="Choose the studio built for your work."><ProductChooser /></Section>
    <Section eyebrow="How it works" title="Set it up once. Post all month."><StepsGrid steps={HOME.steps} /></Section>
    <Section tone="sunken"><GuaranteeRow items={BRAND.guarantees} /></Section>
    <Section eyebrow="FAQ" title="Questions, answered." align="center">
      <FaqAccordion items={HOME.faq} />
      <p className="mt-8 text-center text-[14px] text-app-muted">
        Looking for a personal photoshoot? <Link href="/photos" className="font-medium text-app-accent hover:text-app-ink">Next5 Photos →</Link>
      </p>
    </Section>
    <FinalCtaBand title="Stop recycling the same five photos." body="Try Next5 free — 3 photos of you, or one product worn." href="/brand" cta="Get started" />
  </>
);
