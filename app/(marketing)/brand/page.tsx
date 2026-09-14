import type { Metadata } from 'next';
import { BrandHeroVisual } from '../../../src/components/marketing/brand/BrandHeroVisual';
import { FormatsShowcase } from '../../../src/components/marketing/brand/FormatsShowcase';
import { IndustryTabs } from '../../../src/components/marketing/brand/IndustryTabs';
import { OldWayComparison } from '../../../src/components/marketing/brand/OldWayComparison';
import { SetsGallery } from '../../../src/components/marketing/brand/SetsGallery';
import { ThemesScroller } from '../../../src/components/marketing/brand/ThemesScroller';
import { FaqAccordion } from '../../../src/components/marketing/shared/FaqAccordion';
import { FinalCtaBand } from '../../../src/components/marketing/shared/FinalCtaBand';
import { GuaranteeRow } from '../../../src/components/marketing/shared/GuaranteeRow';
import { PricingPreview } from '../../../src/components/marketing/shared/PricingPreview';
import { ProductHero } from '../../../src/components/marketing/shared/ProductHero';
import { Section } from '../../../src/components/marketing/shared/Section';
import { StepsGrid } from '../../../src/components/marketing/shared/StepsGrid';
import { StickyMobileCta } from '../../../src/components/marketing/shared/StickyMobileCta';
import { BRAND } from '../../../src/content/business/marketing';

export const metadata: Metadata = {
  title: 'Next5 Brand — New photos of you every month',
  description: 'Send three selfies one time. Get new pro photos of you every month. Made for realtors, coaches and beauty pros.',
};

export default function BrandPage() {
  const start = { href: '/start/brand', label: BRAND.hero.cta };
  return (
    <>
      <ProductHero {...BRAND.hero} cta={start} secondary={{ href: '#pricing', label: 'See pricing' }} note="3 free photos. No card needed." visual={<BrandHeroVisual />} />
      <Section tone="sunken" eyebrow="Why Next5" title={BRAND.comparison.title}><OldWayComparison /></Section>
      <Section eyebrow="How it works" title="Five minutes. A whole month of photos."><StepsGrid steps={BRAND.steps} /></Section>
      <Section tone="sunken" eyebrow="Sets" title="Pick a set. Look the same in every post." sub="Your set is your look. Same light, same place, same style every time. Your feed looks like you."><SetsGallery /></Section>
      <Section eyebrow="Monthly themes" title="A new theme every month." sub="New ideas come out on the 1st. Use this month’s theme or any theme you like."><ThemesScroller /></Section>
      <Section tone="sunken" eyebrow="Made for your industry" title="Photos for the work you really do."><IndustryTabs /></Section>
      <Section eyebrow="Every format" title="The right size for every app." sub="We make each size on its own. Nothing gets cut off."><FormatsShowcase /></Section>
      <Section tone="sunken"><GuaranteeRow items={BRAND.guarantees} /></Section>
      <Section id="pricing" eyebrow="Pricing" title="You pay first. No surprise charges."><PricingPreview product="brand" /></Section>
      <Section tone="sunken" eyebrow="FAQ" title="Your questions, answered." align="center"><FaqAccordion items={BRAND.faq} /></Section>
      <div className="pt-16 sm:pt-24"><FinalCtaBand title="A month of new photos is five minutes away." body="Start with 3 free photos of you. No card needed." href={start.href} cta={start.label} /></div>
      <StickyMobileCta href={start.href} label="Start free" />
    </>
  );
}
