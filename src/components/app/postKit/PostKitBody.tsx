'use client';

import { Copy, Lock, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { track } from '../../../lib/analytics';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { PostKitDto } from '../../../types/business/batches';
import { AppButton } from '../../ui/AppButton';
import { AppLink as Link } from '../shell/AppLink';

export type PostKitBodyProps = {
  /** Kit already written, if any. */
  initialKit: PostKitDto | null;
  /** POST endpoint that writes (and caches) the kit. */
  endpoint: string;
  product: 'brand' | 'shop';
  allowed: boolean;
  onCopied: (what: string) => void;
  /** Start writing as soon as it opens. */
  autoGenerate?: boolean;
  /** Lets the page keep the new kit, so it isn't written twice. */
  onGenerated?: (kit: PostKitDto) => void;
  /** Shows "Write a new one" once a kit exists. */
  allowRewrite?: boolean;
  /** What the kit is for, in the prompt line: "this photo" or "this listing". */
  subject?: string;
};

const CopyBlock = ({ label, text, onCopy }: { label: string; text: string; onCopy: () => void }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-medium uppercase tracking-wide text-app-muted">{label}</p>
      <button type="button" onClick={onCopy} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-app-accent transition-colors duration-200 hover:bg-app-sunken" aria-label={`Copy ${label.toLowerCase()}`}>
        <Copy aria-hidden className="h-3 w-3" /> Copy
      </button>
    </div>
    <p className="whitespace-pre-line text-[14px] leading-snug text-app-ink">{text}</p>
  </div>
);

/** Writes, shows and copies a Post Kit. A locked kit says what Growth adds. */
export const PostKitBody = ({ initialKit, endpoint, product, allowed, onCopied, autoGenerate = false, onGenerated, allowRewrite = false, subject = 'this photo' }: PostKitBodyProps) => {
  const [kit, setKit] = useState<PostKitDto | null>(initialKit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const parts = `hook, caption${product === 'shop' ? ', description' : ''} and hashtags`;

  const copy = async (what: string, text: string) => {
    await navigator.clipboard.writeText(text);
    onCopied(what);
  };

  const generate = async (rewrite = false) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ postKit: PostKitDto }>(endpoint, { method: 'POST', json: { rewrite } });
      setKit(res.postKit);
      onGenerated?.(res.postKit);
      track('post_kit_created', { product });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not write this Post Kit.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!autoGenerate || !allowed || kit || started.current) return;
    started.current = true;
    void generate();
    // Runs once when it opens; `generate` is recreated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, allowed, kit]);

  const all = kit ? [kit.hook, kit.caption, kit.hashtags.join(' ')].join('\n\n') : '';

  return (
    <div className="flex flex-col gap-4">
      {!allowed && !kit && (
        <p className="flex items-start gap-2 rounded-lg bg-app-sunken px-3 py-2 text-[13px] text-app-ink">
          <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>With Growth, we write the {parts} for {subject}. <Link href="/app/billing" className="font-medium text-app-accent underline">See Growth</Link></span>
        </p>
      )}
      {allowed && busy && (
        <p className="flex items-center gap-2 text-[13px] text-app-muted" aria-live="polite">
          <Sparkles aria-hidden className="h-4 w-4 animate-pulse text-app-accent" />Writing your {parts}… about 10 seconds.
        </p>
      )}
      {allowed && !kit && !busy && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-app-muted">Get a {parts} for {subject}.</p>
          <AppButton size="sm" iconLeft={<Sparkles className="h-3.5 w-3.5" />} onClick={() => void generate()}>Post Kit</AppButton>
        </div>
      )}
      {error && <p role="alert" className="text-[12px] text-app-danger">{error}</p>}
      {kit && (
        <section aria-label="Post Kit" className={`flex flex-col gap-3 border-t border-app-line pt-3 transition-opacity duration-200 ${busy ? 'opacity-50' : ''}`}>
          <CopyBlock label="Hook" text={kit.hook} onCopy={() => void copy('Hook', kit.hook)} />
          <CopyBlock label="Caption" text={kit.caption} onCopy={() => void copy('Caption', kit.caption)} />
          <CopyBlock label="Hashtags" text={kit.hashtags.join(' ')} onCopy={() => void copy('Hashtags', kit.hashtags.join(' '))} />
          {kit.description && <CopyBlock label="Product description" text={kit.description} onCopy={() => void copy('Description', kit.description ?? '')} />}
          <div className="flex flex-wrap gap-2">
            <AppButton size="sm" variant="secondary" iconLeft={<Copy className="h-3.5 w-3.5" />} onClick={() => void copy('Post', all)}>Copy whole post</AppButton>
            {allowRewrite && allowed && <AppButton size="sm" variant="secondary" iconLeft={<RefreshCw className="h-3.5 w-3.5" />} loading={busy} onClick={() => void generate(true)}>Write a new one</AppButton>}
          </div>
        </section>
      )}
    </div>
  );
};
