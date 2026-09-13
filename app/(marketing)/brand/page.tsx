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
  title: 'Next5 Brand — Monthly on-brand photos of you',
  description: 'Upload three selfies once and get fresh, professional photos of yourself every month. Built for realtors, coaches and beauty pros.',
};

export default function BrandPage() {
  const start = { href: '/start/brand', label: BRAND.hero.cta };
  return (
    <>
      <ProductHero {...BRAND.hero} cta={start} secondary={{ href: '#pricing', label: 'See pricing' }} note="3 free photos. No payment details needed." visual={<BrandHeroVisual />} />
      <Section tone="sunken" eyebrow="Why Next5" title={BRAND.comparison.title}><OldWayComparison /></Section>
      <Section eyebrow="How it works" title="Five minutes a month for a month of photos."><StepsGrid steps={BRAND.steps} /></Section>
      <Section tone="sunken" eyebrow="Sets" title="Pick a set. Keep your look consistent." sub="Your set is your signature look — the same light, place and style in every batch, so your feed feels like you."><SetsGallery /></Section>
      <Section eyebrow="Monthly themes" title="A new theme every month." sub="Fresh ideas drop on the 1st. Use the featured theme or any theme in the library."><ThemesScroller /></Section>
      <Section tone="sunken" eyebrow="Made for your industry" title="Photos for the way you actually work."><IndustryTabs /></Section>
      <Section eyebrow="Every format" title="Sized for every place you post." sub="Each format is created at its own shape — nothing gets awkwardly cropped."><FormatsShowcase /></Section>
      <Section tone="sunken"><GuaranteeRow items={BRAND.guarantees} /></Section>
      <Section id="pricing" eyebrow="Pricing" title="Prepaid plans. No auto-charge."><PricingPreview product="brand" /></Section>
      <Section tone="sunken" eyebrow="FAQ" title="Questions, answered." align="center"><FaqAccordion items={BRAND.faq} /></Section>
      <div className="pt-16 sm:pt-24"><FinalCtaBand title="Your next month of photos is five minutes away." body="Start with 3 free photos of you. No payment details needed." href={start.href} cta={start.label} /></div>
      <StickyMobileCta href={start.href} label="Start free" />
    </>
  );
}
