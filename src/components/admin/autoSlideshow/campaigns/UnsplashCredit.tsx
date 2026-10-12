'use client';

import { UNSPLASH_HOME_URL, type CampaignCredit, type CampaignPhotoDto } from '../../../../types/admin/slideshowCampaign';

type Props = { credit: CampaignCredit; className?: string };

/** "Photo by <name> on Unsplash", both linked: the credit Unsplash's API rules ask for wherever one of its photos shows. */
export function UnsplashCredit({ credit, className = '' }: Props) {
  const link = 'underline decoration-white/30 underline-offset-2 transition hover:text-white hover:decoration-white';
  return (
    <span className={className}>
      Photo by{' '}
      <a href={credit.url} target="_blank" rel="noreferrer" className={link}>{credit.name}</a>
      {' '}on{' '}
      <a href={UNSPLASH_HOME_URL} target="_blank" rel="noreferrer" className={link}>Unsplash</a>
    </span>
  );
}

/** Credits of the hook rotation's Unsplash photos, numbered like their thumbs. Nothing when none is from Unsplash. */
export function HookPhotoCredits({ photoIndexes, photos }: { photoIndexes: number[]; photos: CampaignPhotoDto[] }) {
  const credited = photoIndexes.flatMap((p, i) => {
    const credit = photos[p]?.credit;
    return credit ? [{ number: i + 1, credit }] : [];
  });
  if (credited.length === 0) return null;
  return (
    <ul className="space-y-0.5 text-xs text-white/60">
      {credited.map(({ number, credit }) => (
        <li key={number}>
          <span className="font-bold text-white/40">{number}</span> · <UnsplashCredit credit={credit} />
        </li>
      ))}
    </ul>
  );
}
