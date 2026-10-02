'use client';

import type { BrandProfile } from '../../../types/admin/companyIntel';

type Props = { url: string; profile: BrandProfile | null };

export function BrandCard({ url, profile }: Props) {
  const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '');

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-line bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => <span key={i} className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />)}
        </div>
        <p className="flex-1 truncate rounded border border-line bg-white py-0.5 text-center text-[10px] text-muted dark:border-zinc-800 dark:bg-zinc-900">{domain}</p>
      </div>

      <div className="relative h-40 bg-zinc-100 dark:bg-zinc-800">
        {profile?.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.heroImageUrl} alt={`${profile.brandName} website`} className="h-full w-full object-cover" />
        ) : (
          <div className={['absolute inset-0 flex flex-col justify-end gap-2 p-4', profile ? '' : 'animate-pulse'].join(' ')}>
            <div className="h-5 w-20 rounded bg-white/70 dark:bg-zinc-700" />
            <div className="h-3 w-3/4 rounded bg-white/70 dark:bg-zinc-700" />
          </div>
        )}
      </div>

      {profile ? (
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-3">
            {profile.faviconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.faviconUrl} alt="" className="h-10 w-10 rounded-lg border border-line object-contain p-1 dark:border-zinc-800" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-xs font-bold dark:border-zinc-800">{profile.brandName.charAt(0)}</span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink dark:text-zinc-100">{profile.brandName}</p>
              <p className="text-[11px] text-muted">{profile.domain}</p>
            </div>
          </div>
          {profile.palette.length > 0 && (
            <div className="flex gap-2">
              {profile.palette.map((hex) => <span key={hex} title={hex} className="h-8 flex-1 rounded" style={{ background: hex }} />)}
            </div>
          )}
          <p className="text-xs leading-relaxed font-medium text-ink dark:text-zinc-200">{profile.valueProp}</p>
          {profile.audience && <p className="text-[11px] leading-relaxed text-muted">{profile.audience}</p>}
          {profile.slideshowStyle && (
            <div className="flex items-start gap-2 border-t border-line pt-3 dark:border-zinc-800">
              <span
                title="Slide headline box"
                className="mt-0.5 flex h-5 w-7 shrink-0 items-center justify-center rounded text-[9px] font-bold"
                style={{ background: profile.slideshowStyle.boxColor, color: profile.slideshowStyle.boxTextColor, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' }}
              >
                Aa
              </span>
              <p className="text-[11px] leading-relaxed text-muted">
                <span className="font-semibold text-ink dark:text-zinc-200">Slideshow look: </span>
                {profile.slideshowStyle.photoStyle}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {['w-1/2', 'w-full', 'w-5/6'].map((w) => <div key={w} className={`h-3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800 ${w}`} />)}
        </div>
      )}
    </div>
  );
}
