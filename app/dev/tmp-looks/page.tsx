'use client';

import { influencerSamples, DEMO_INFLUENCER } from '../../../src/content/business/influencer';
import { LookCard } from '../../../src/components/app/sets/LookCard';
import { BusinessSurface } from '../../../src/components/ui/BusinessSurface';
import Image from 'next/image';

const btn = 'inline-flex h-10 items-center rounded-full bg-app-cta px-4 text-[13px] font-medium text-app-cta-ink';
export default function TmpLooks() {
  const photos = (p: 'brand' | 'shop', id: string) => influencerSamples(p, id).map((src) => ({ src, alt: '' }));
  return (
    <BusinessSurface className="p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="flex flex-col gap-5 rounded-3xl border border-app-line bg-app-panel p-6 sm:flex-row sm:items-center">
          <div className="relative aspect-[4/5] w-44 overflow-hidden rounded-2xl"><Image src={DEMO_INFLUENCER.portrait} alt="" fill className="object-cover" /></div>
          <div><p className="text-app-accent">Your AI influencer</p><h2 className="font-display text-[28px] font-bold text-app-ink">Sarah</h2></div>
        </section>
        <div className="grid gap-4 lg:grid-cols-2">
          <LookCard title="Listing Interior" subtitle="Listing Interior · Used in 3 batches" photos={photos('brand', 'listing-interior')} pending={2} caption="Making your free preview. It takes about a minute." onArchive={() => undefined} actions={<span className={btn}>Create with this style</span>} />
          <LookCard title="Beige Wall" subtitle="Warm plaster wall" photos={photos('shop', 'beige-wall')} caption="Example photos of Sarah." actions={<span className={btn}>Add this look</span>} />
        </div>
      </div>
    </BusinessSurface>
  );
}
