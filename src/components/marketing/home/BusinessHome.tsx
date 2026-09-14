import Link from 'next/link';
import { HOME } from '../../../content/business/marketing';
import { OldWayComparison } from '../brand/OldWayComparison';
import { FaqAccordion } from '../shared/FaqAccordion';
import { FinalCtaBand } from '../shared/FinalCtaBand';
import { GuaranteeRow } from '../shared/GuaranteeRow';
import { ProductHero } from '../shared/ProductHero';
import { Section } from '../shared/Section';
import { StepsGrid } from '../shared/StepsGrid';
import { HomeHeroVisual } from './HomeHeroVisual';
import { HomeProof } from './HomeProof';
import { ProductChooser } from './ProductChooser';

/**
 * Business home at `/`. Order follows the offer: outcome + free start → proof → price math → pick a studio →
 * how it works → promise (risk reversal) → objections → two direct starts.
 */
export const BusinessHome = () => (
  <>
    <ProductHero
      eyebrow={HOME.hero.eyebrow}
      title={HOME.hero.title}
      sub={HOME.hero.sub}
      note={HOME.hero.note}
      cta={{ href: '/brand', label: 'I sell a service' }}
      secondary={{ href: '/shop', label: 'I sell products online →' }}
      visual={<HomeHeroVisual />}
    />
    <Section tone="sunken" eyebrow={HOME.proof.eyebrow} title={HOME.proof.title} sub={HOME.proof.sub}><HomeProof /></Section>
    <Section eyebrow={HOME.comparison.eyebrow} title={HOME.comparison.title}>
      <OldWayComparison rows={HOME.comparison.rows} oldLabel={HOME.comparison.oldLabel} next5Label={HOME.comparison.next5Label} />
    </Section>
    <Section id="studios" tone="sunken" eyebrow="Pick your studio" title="Which one fits you?"><ProductChooser /></Section>
    <Section eyebrow="How it works" title="Set it up once. Post all month."><StepsGrid steps={HOME.steps} /></Section>
    <Section tone="sunken" eyebrow={HOME.promise.eyebrow} title={HOME.promise.title} sub={HOME.promise.sub}><GuaranteeRow items={HOME.guarantees} /></Section>
    <Section eyebrow="FAQ" title="Your questions, answered." align="center">
      <FaqAccordion items={HOME.faq} />
      <p className="mt-8 text-center text-[14px] text-app-muted">
        Want photos just for your own Instagram? <Link href="/photos" className="font-medium text-app-accent hover:text-app-ink">Try Next5 Photos →</Link>
      </p>
    </Section>
    <FinalCtaBand title={HOME.final.title} body={HOME.final.body} href={HOME.final.brand.href} cta={HOME.final.brand.cta} secondary={{ href: HOME.final.shop.href, cta: HOME.final.shop.cta }} />
  </>
);
