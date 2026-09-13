import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeHeroVisual } from '../../../src/components/marketing/home/HomeHeroVisual';
import { ProductChooser } from '../../../src/components/marketing/home/ProductChooser';
import { FaqAccordion } from '../../../src/components/marketing/shared/FaqAccordion';
import { FinalCtaBand } from '../../../src/components/marketing/shared/FinalCtaBand';
import { GuaranteeRow } from '../../../src/components/marketing/shared/GuaranteeRow';
import { ProductHero } from '../../../src/components/marketing/shared/ProductHero';
import { Section } from '../../../src/components/marketing/shared/Section';
import { StepsGrid } from '../../../src/components/marketing/shared/StepsGrid';
import { BRAND, HOME } from '../../../src/content/business/marketing';

export const metadata: Metadata = {
  title: 'Next5 — Photos of you that work as hard as you do',
  description: 'On-brand photos for professionals and on-model photos for online shops, every month, without a photoshoot.',
};

export default function HomePreviewPage() {
  return (
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
}
