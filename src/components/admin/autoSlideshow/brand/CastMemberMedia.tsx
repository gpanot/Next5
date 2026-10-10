'use client';

import { Play } from 'lucide-react';
import { useState } from 'react';
import type { BrandCastMemberDto } from '../../../../types/admin/brandCast';

// 9:16 like the intro video, cropped the same way (cover, centered), so playing it looks like the photo coming alive.
export const photoBox = 'relative aspect-[9/16] overflow-hidden rounded-xl bg-app-sunken';
const badge = 'absolute inset-x-1.5 bottom-1.5 flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-black/60 px-1.5 py-1 text-[10px] font-semibold text-white sm:gap-1.5 sm:text-xs';

function Spinner({ light = false }: { light?: boolean }) {
  return <span aria-hidden className={`h-3.5 w-3.5 animate-spin rounded-full border-2 ${light ? 'border-white/40 border-t-white' : 'border-app-line border-t-app-ink'}`} />;
}

/** The intro's state over the photo: a play button when ready, a badge while it is made or when it failed. */
function IntroOverlay({ member, onPlay }: { member: BrandCastMemberDto; onPlay: () => void }) {
  if (member.introStatus === 'ready' && member.introUrl) {
    return (
      <button type="button" onClick={onPlay} aria-label={`Play ${member.name}'s intro video`} className="group absolute inset-0 flex items-center justify-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white shadow-sm transition group-hover:bg-black/70 group-active:scale-90">
          <Play aria-hidden className="ml-0.5 h-5 w-5" fill="currentColor" />
        </span>
      </button>
    );
  }
  if (member.introStatus === 'pending') return <span className={badge}><Spinner light /> Making video…</span>;
  if (member.introStatus === 'failed') return <span role="alert" className={badge}>Video failed</span>;
  return null;
}

/** A cast member's photo (or its making / failed state), and their intro video playing in its place once tapped. */
export function CastMemberMedia({ member }: { member: BrandCastMemberDto }) {
  const [playing, setPlaying] = useState(false);
  if (member.status === 'pending') {
    return (
      <div className={`${photoBox} flex flex-col items-center justify-center gap-2`} aria-label={`Making ${member.name}'s photo`}>
        <Spinner />
        <span className="text-xs text-app-muted">Making…</span>
      </div>
    );
  }
  if (!member.imageUrl) {
    return (
      <div className={`${photoBox} flex items-center justify-center p-2 text-center`}>
        <p role="alert" className="text-xs text-app-danger">{member.error ?? 'The photo failed.'}</p>
      </div>
    );
  }
  if (playing && member.introUrl) {
    return (
      <div className={`${photoBox} bg-black`}>
        <video src={member.introUrl} autoPlay playsInline controls onEnded={() => setPlaying(false)} aria-label={`${member.name}'s intro video`} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className={photoBox}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={member.imageUrl} alt={`${member.name}, from your brand cast`} loading="lazy" className="h-full w-full object-cover" />
      <IntroOverlay member={member} onPlay={() => setPlaying(true)} />
    </div>
  );
}
