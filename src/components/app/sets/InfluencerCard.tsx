'use client';

import { Camera, ChevronDown, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { DEMO_INFLUENCER } from '../../../content/business/influencer';
import { useApi } from '../../../hooks/useApi';
import type { ProductLineDto } from '../../../types/business/me';
import { AppButton } from '../../ui/AppButton';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { EditPhotosDialog } from './IdentityPhotosCard';
import { IdentityPhotoGrid, type Identity } from './IdentityPhotoGrid';

type Props = { product: ProductLineDto; styleCount: number };

/**
 * "Your AI influencer": the person in every photo. It is her, from her selfies; until she adds them,
 * the demo influencer stands in so the page still shows what the styles mean.
 */
export const InfluencerCard = ({ product, styleCount }: Props) => {
  const { me, refresh: refreshMe } = useWorkspace();
  const { data, loading, refresh } = useApi<{ identities: Identity[] }>(`/api/app/identity?product=${product}`);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const photos = data?.identities ?? [];
  const isDemo = !loading && photos.length === 0;
  const portrait = photos.find((p) => p.kind === 'face')?.url ?? photos[0]?.url ?? null;
  const name = isDemo ? DEMO_INFLUENCER.name : me?.user.displayName || 'You';
  const noun = product === 'shop' ? 'look' : 'style';
  const changed = () => { refresh(); refreshMe(); };

  return (
    <section aria-label="Your AI influencer" className="flex flex-col gap-4 rounded-3xl border border-app-line bg-app-panel p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative aspect-[4/5] w-full max-w-[200px] shrink-0 overflow-hidden rounded-2xl bg-app-sunken sm:w-44">
          {loading ? <span className="absolute inset-0 animate-pulse bg-app-sunken" /> : isDemo ? (
            <Image src={DEMO_INFLUENCER.portrait} alt={`${DEMO_INFLUENCER.name}, the example influencer`} fill sizes="200px" className="object-cover" />
          ) : portrait ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
            <img src={portrait} alt="Your photo" className="h-full w-full object-cover" />
          ) : null}
          {isDemo && <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">Example</span>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-app-accent-soft px-2.5 py-1 text-[12px] font-semibold text-app-accent">
            <Sparkles aria-hidden className="h-3.5 w-3.5" /> Your AI influencer
          </p>
          <h2 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-app-ink">{name}</h2>
          <p className="text-[15px] leading-snug text-app-muted">
            {isDemo
              ? `This is ${DEMO_INFLUENCER.name}, our example. Add 3 selfies and every ${noun} below becomes you.`
              : `Every photo we make is you. Same face in every ${noun}.`}
          </p>
          {!isDemo && !loading && (
            <p className="text-[13px] text-app-ink">{photos.length} photo{photos.length === 1 ? '' : 's'} of you · {styleCount} {noun}{styleCount === 1 ? '' : 's'}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {isDemo ? (
              <AppButton iconLeft={<Camera className="h-4 w-4" />} onClick={() => setAdding(true)}>Make it you</AppButton>
            ) : (
              <AppButton variant="secondary" disabled={loading} onClick={() => setOpen((v) => !v)} iconRight={<ChevronDown aria-hidden className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />}>
                {open ? 'Hide your photos' : 'See and edit your photos'}
              </AppButton>
            )}
          </div>
        </div>
      </div>
      {open && photos.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-app-line pt-4">
          <IdentityPhotoGrid product={product} photos={photos} onChanged={changed} />
          <button type="button" onClick={() => setAdding(true)} className="self-start text-[13px] font-medium text-app-muted transition-colors duration-200 hover:text-app-ink">Retake all photos</button>
        </div>
      )}
      {adding && <EditPhotosDialog product={product} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); changed(); }} />}
    </section>
  );
};
