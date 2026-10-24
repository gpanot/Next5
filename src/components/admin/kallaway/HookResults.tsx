'use client';

import { useState } from 'react';
import type { HookSubject, HookVariant, KallawayHooksResult } from '../../../lib/kallaway/types';
import { amberTag, eyebrowClass, softCard } from '../scriptGenerator/ui';
import { HighlightedHook, PartsList } from './HighlightedHook';

const SUBJECT_LABEL: Record<HookSubject, string> = { viewer: 'You (viewer)', creator: 'I / We (creator)', named: 'Named subject' };

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button type="button" onClick={copy} className="min-h-9 rounded-lg bg-app-sunken px-3 text-xs font-semibold text-app-ink transition hover:opacity-80 active:scale-[0.98]">
      {copied ? 'Copied' : 'Copy hook'}
    </button>
  );
}

function VariantCard({ variant, index }: { variant: HookVariant; index: number }) {
  return (
    <article className={`${softCard} space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <span className={amberTag}>Variant {String.fromCharCode(65 + index)} · {SUBJECT_LABEL[variant.subjectType]}</span>
        <CopyButton text={variant.spoken} />
      </div>
      <HighlightedHook hook={variant.spoken} parts={variant.parts} />
      {variant.onScreen && <p className="text-sm text-app-ink"><span className="font-semibold">On screen (hook):</span> {variant.onScreen}</p>}
      {variant.onScreenAudience && <p className="text-sm text-app-ink"><span className="font-semibold">On screen (audience):</span> {variant.onScreenAudience}</p>}
      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <p className="rounded-xl bg-app-sunken p-3 text-app-muted"><span className="font-semibold text-app-ink">Base state:</span> {variant.baseState}</p>
        <p className="rounded-xl bg-app-sunken p-3 text-app-muted"><span className="font-semibold text-app-ink">New reality:</span> {variant.newReality}</p>
      </div>
      <PartsList parts={variant.parts} />
      {variant.why && <p className="text-xs text-app-muted"><span className="font-semibold text-app-ink">Why:</span> {variant.why}</p>}
    </article>
  );
}

export function HookResults({ result }: { result: KallawayHooksResult }) {
  const { original, variants } = result;
  return (
    <div className="space-y-4">
      {original.hook && (
        <section className={`${softCard} space-y-3`}>
          <p className={eyebrowClass}>Your current hook</p>
          <HighlightedHook hook={original.hook} parts={original.parts} />
          <PartsList parts={original.parts} />
          {original.verdict && <p className="text-sm text-app-ink"><span className="font-semibold">Verdict:</span> {original.verdict}</p>}
        </section>
      )}
      <p className={eyebrowClass}>3 variants to test</p>
      {variants.map((v, i) => <VariantCard key={v.subjectType} variant={v} index={i} />)}
    </div>
  );
}

export function HookResultsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Writing hooks">
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-app-panel" />)}
      <p className="text-center text-xs text-app-muted">Breaking down your hook and writing 3 variants…</p>
    </div>
  );
}
