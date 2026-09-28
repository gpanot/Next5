import type { MetaAdVideoDto } from '../../../types/admin/metaAds';

/** One "Generate video ad" click: its first video plus the variations filmed from the same avatar and script. */
export type VideoVersion = { id: string; number: number; duration: number; first: MetaAdVideoDto; videos: MetaAdVideoDto[] };

const byCreated = (a: MetaAdVideoDto, b: MetaAdVideoDto) => a.createdAt.localeCompare(b.createdAt);

/** Groups an ad's videos into versions, V1 first. A variation whose version is not in the list is dropped. */
export const groupVersions = (videos: MetaAdVideoDto[]): VideoVersion[] => {
  const sorted = [...videos].sort(byCreated);
  return sorted
    .filter((v) => !v.variationOfId)
    .map((first, i) => ({
      id: first.id,
      number: i + 1,
      duration: first.duration,
      first,
      videos: [first, ...sorted.filter((v) => v.variationOfId === first.id)],
    }));
};
