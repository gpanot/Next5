'use client';

import { Pencil, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { DEMO_INFLUENCER, influencerSamples } from '../../../content/business/influencer';
import { useApi } from '../../../hooks/useApi';
import type { SetTemplateDto, StudioSetDto } from '../../../types/business/catalog';
import type { ProductLineDto } from '../../../types/business/me';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonGrid } from '../../ui/Skeleton';
import { AppLink as Link } from '../shell/AppLink';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { ArchiveSetDialog } from './ArchiveSetDialog';
import { InfluencerCard } from './InfluencerCard';
import { InfluencersList } from './InfluencersList';
import { LookCard, type LookPhoto } from './LookCard';
import { useStylePreviews } from './useStylePreviews';

const primary = 'inline-flex h-10 items-center gap-1.5 rounded-full bg-app-cta px-4 text-[13px] font-medium text-app-cta-ink transition-opacity duration-200 hover:opacity-90';
const secondary = 'inline-flex h-10 items-center gap-1.5 rounded-full border border-app-line px-4 text-[13px] font-medium text-app-ink transition-colors duration-200 hover:bg-app-sunken';

const samplePhotos = (product: ProductLineDto, templateId: string, name: string): LookPhoto[] =>
  influencerSamples(product, templateId).map((src, i) => ({ src, alt: `${DEMO_INFLUENCER.name} in the ${name} ${product === 'shop' ? 'look' : 'style'}, photo ${i + 1}` }));

const SectionTitle = ({ title, sub }: { title: string; sub: string }) => (
  <div className="flex flex-col gap-0.5">
    <h2 className="text-[18px] font-semibold text-app-ink">{title}</h2>
    <p className="text-[14px] text-app-muted">{sub}</p>
  </div>
);

/**
 * Shop look cards: selfie-based "You" card + swipeable style cards.
 * Only rendered for the shop product.
 */
const ShopSetsList = () => {
  const { product, me } = useWorkspace();
  const sets = useApi<{ sets: StudioSetDto[] }>(product ? `/api/app/sets?product=${product}` : null);
  const templates = useApi<{ templates: SetTemplateDto[] }>(product ? `/api/app/templates?product=${product}` : null);
  const [archiving, setArchiving] = useState<StudioSetDto | null>(null);
  const canPreview = Boolean(me?.workspace?.hasIdentity);
  const previews = useStylePreviews(sets.data?.sets, canPreview, sets.refresh);

  if (!product) return null;
  if ((sets.loading && !sets.data) || (templates.loading && !templates.data)) return <SkeletonGrid count={4} cols={2} />;
  if (sets.error && !sets.data) return <ErrorState message={sets.error} onRetry={sets.refresh} />;

  const noun = 'look';
  const mine = sets.data?.sets ?? [];
  const used = new Set(mine.map((s) => s.templateId));
  const more = (templates.data?.templates ?? []).filter((t) => !used.has(t.id));
  const captionFor = (set: StudioSetDto): string => {
    const preview = previews.previewOf(set);
    if (preview.status === 'ready') return `First ${preview.photos.length === 1 ? 'photo is' : `${preview.photos.length} photos are`} you, free. Then examples of ${DEMO_INFLUENCER.name}.`;
    if (preview.status === 'generating') return 'Making your free preview. It takes about a minute.';
    return previews.blockedReason(set.id) ?? `Example photos of ${DEMO_INFLUENCER.name}. Add your selfies to see yourself here.`;
  };

  return (
    <div className="flex flex-col gap-8">
      <InfluencerCard product={product} styleCount={mine.length} />

      {mine.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle title="Your looks" sub={`Pick one when you create. Every photo in a ${noun} has the same light and place.`} />
          <div className="grid gap-4 lg:grid-cols-2">
            {mine.map((set) => (
              <LookCard
                key={set.id}
                title={set.name}
                subtitle={`${set.templateName} · Used in ${set.batchCount} batch${set.batchCount === 1 ? '' : 'es'}`}
                photos={[
                  ...previews.previewOf(set).photos.map((src, i) => ({ src, alt: `You in ${set.name}, preview ${i + 1}`, remote: true })),
                  ...samplePhotos(product, set.templateId, set.templateName),
                ]}
                pending={previews.previewOf(set).status === 'generating' ? 3 : 0}
                caption={captionFor(set)}
                onArchive={() => setArchiving(set)}
                actions={
                  <>
                    <Link href={`/app/create?set=${set.id}`} className={primary}><Sparkles aria-hidden className="h-4 w-4" /> Create with this {noun}</Link>
                    <Link href={`/app/sets/${set.id}`} className={secondary}><Pencil aria-hidden className="h-4 w-4" /> Edit</Link>
                  </>
                }
              />
            ))}
          </div>
        </section>
      )}

      {more.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle title={mine.length ? `Add a ${noun}` : `Create your first ${noun}`} sub={`Swipe to see real photos. Add as many ${noun}s as you like.`} />
          <div className="grid gap-4 lg:grid-cols-2">
            {more.map((t) => (
              <LookCard
                key={t.id}
                title={t.name}
                subtitle={t.description}
                photos={samplePhotos(product, t.id, t.name)}
                actions={<Link href={`/app/sets/new?template=${t.id}`} className={secondary}><Plus aria-hidden className="h-4 w-4" /> Add this {noun}</Link>}
              />
            ))}
          </div>
        </section>
      )}

      {archiving && <ArchiveSetDialog setId={archiving.id} name={archiving.name} noun="shop look" onClose={() => setArchiving(null)} onArchived={() => { setArchiving(null); sets.refresh(); }} />}
    </div>
  );
};

/**
 * Brand → AI influencer portrait grid.
 * Shop → selfie-based card + swipeable look cards.
 */
export const SetsList = ({ showArchived = false }: { showArchived?: boolean }) => {
  const { product } = useWorkspace();
  if (product === 'brand') return <InfluencersList showArchived={showArchived} />;
  return <ShopSetsList />;
};
