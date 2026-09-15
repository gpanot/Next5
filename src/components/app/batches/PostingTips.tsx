'use client';

import { Info, X } from 'lucide-react';
import { AppLink as Link } from '../shell/AppLink';
import { postingTipsStore } from '../../../lib/localStore';

export const PostingTips = ({ visibleAiTag }: { visibleAiTag: boolean }) => {
  const dismissed = postingTipsStore.useValue();
  if (dismissed === 'true' || dismissed === undefined) return null;
  return (
    <aside className="flex gap-3 rounded-2xl border border-app-info/30 bg-app-info/10 p-4 text-[14px] text-app-ink">
      <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-app-info" />
      <div className="flex-1">
        <p className="font-semibold">Posting on TikTok Shop or Shopee</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-app-muted">
          <li>Turn on the AI-generated label when you post.</li>
          <li>Check every photo matches the real item — colour, print and length. Redo it free if not.</li>
          <li>Keep real customer photos real.</li>
        </ul>
        <p className="mt-2 text-[13px] text-app-muted">Visible AI tag on new photos: <strong className="text-app-ink">{visibleAiTag ? 'on' : 'off'}</strong> · <Link href="/app/settings" className="text-app-accent hover:text-app-ink">Change</Link></p>
      </div>
      <button type="button" aria-label="Dismiss tips" onClick={() => postingTipsStore.set('true')} className="flex h-8 w-8 items-center justify-center rounded-full text-app-muted hover:bg-app-sunken"><X aria-hidden className="h-4 w-4" /></button>
    </aside>
  );
};
