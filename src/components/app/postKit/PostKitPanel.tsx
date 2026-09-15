'use client';

import { Copy, Lock, Sparkles } from 'lucide-react';
import { AppLink as Link } from '../shell/AppLink';
import { useEffect, useRef, useState } from 'react';
import { track } from '../../../lib/analytics';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { BatchItemDto, PostKitDto } from '../../../types/business/batches';
import { AppButton } from '../../ui/AppButton';
import { ScoreCard } from './ScoreCard';

type PostKitPanelProps = {
  item: BatchItemDto;
  product: 'brand' | 'shop';
  allowed: boolean;
  onCopied: (what: string) => void;
  /** Start writing as soon as the panel opens (the Post Kit button on a photo). */
  autoGenerate?: boolean;
  /** Lets the page keep the new kit, so it isn't written twice. */
  onGenerated?: (kit: PostKitDto) => void;
  /** `card`: white floating card for the dark lightbox. `plain`: no card, for a dialog. */
  variant?: 'card' | 'plain';
};

const CopyBlock = ({ label, text, onCopy }: { label: string; text: string; onCopy: () => void }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-medium uppercase tracking-wide text-app-muted">{label}</p>
      <button type="button" onClick={onCopy} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-app-accent hover:bg-app-sunken" aria-label={`Copy ${label.toLowerCase()}`}>
        <Copy aria-hidden className="h-3 w-3" /> Copy
      </button>
    </div>
    <p className="whitespace-pre-line text-[14px] leading-snug text-app-ink">{text}</p>
  </div>
);

/** Score + Post Kit for one photo, shown in the lightbox. A locked Post Kit says what Growth adds. */
export const PostKitPanel = ({ item, product, allowed, onCopied, autoGenerate = false, onGenerated, variant = 'card' }: PostKitPanelProps) => {
  const [kit, setKit] = useState<PostKitDto | null>(item.postKit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = async (what: string, text: string) => {
    await navigator.clipboard.writeText(text);
    onCopied(what);
  };

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ postKit: PostKitDto }>(`/api/app/items/${item.id}/post-kit`, { method: 'POST' });
      setKit(res.postKit);
      onGenerated?.(res.postKit);
      track('post_kit_created', { product });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not write this Post Kit.');
    } finally {
      setBusy(false);
    }
  };

  const started = useRef(false);
  useEffect(() => {
    if (!autoGenerate || !allowed || kit || started.current) return;
    started.current = true;
    void generate();
    // Runs once when the panel opens; `generate` is recreated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, allowed, kit]);

  const all = kit ? [kit.hook, kit.caption, kit.hashtags.join(' ')].join('\n\n') : '';

  return (
    <div className={variant === 'card' ? 'flex max-h-[46vh] flex-col gap-4 overflow-y-auto rounded-2xl bg-app-panel p-4 text-app-ink shadow-lg' : 'flex flex-col gap-4 text-app-ink'}>
      {item.score !== null && <ScoreCard score={item.score} details={item.scoreDetails} />}
      {!allowed && !kit && (
        <p className="flex items-start gap-2 rounded-lg bg-app-sunken px-3 py-2 text-[13px]">
          <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>With Growth, we write the hook, caption{product === 'shop' ? ', product description' : ''} and hashtags for this photo. <Link href="/app/billing" className="font-medium text-app-accent underline">See Growth</Link></span>
        </p>
      )}
      {allowed && !kit && autoGenerate && busy && (
        <p className="flex items-center gap-2 text-[13px] text-app-muted" aria-live="polite">
          <Sparkles aria-hidden className="h-4 w-4 animate-pulse text-app-accent" />Writing your hook, caption{product === 'shop' ? ', description' : ''} and hashtags… about 10 seconds.
        </p>
      )}
      {allowed && !kit && !(autoGenerate && busy) && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-app-muted">Get a hook, caption{product === 'shop' ? ', description' : ''} and hashtags for this photo.</p>
          <AppButton size="sm" loading={busy} iconLeft={<Sparkles className="h-3.5 w-3.5" />} onClick={generate}>Post Kit</AppButton>
        </div>
      )}
      {error && <p className="text-[12px] text-app-danger">{error}</p>}
      {kit && (
        <section aria-label="Post Kit" className="flex flex-col gap-3 border-t border-app-line pt-3">
          <CopyBlock label="Hook" text={kit.hook} onCopy={() => void copy('Hook', kit.hook)} />
          <CopyBlock label="Caption" text={kit.caption} onCopy={() => void copy('Caption', kit.caption)} />
          <CopyBlock label="Hashtags" text={kit.hashtags.join(' ')} onCopy={() => void copy('Hashtags', kit.hashtags.join(' '))} />
          {kit.description && <CopyBlock label="Product description" text={kit.description} onCopy={() => void copy('Description', kit.description ?? '')} />}
          <AppButton size="sm" variant="secondary" iconLeft={<Copy className="h-3.5 w-3.5" />} onClick={() => void copy('Post', all)}>Copy whole post</AppButton>
        </section>
      )}
    </div>
  );
};
