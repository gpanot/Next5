'use client';

/**
 * SuggestedSlides — the slide list inside the Researcher's "See Template" panel.
 *
 * Given a niche it asks the LLM to rewrite the template's generic
 * example slides for that niche, grounded in the source video's transcript, so
 * both the slide text and its background image prompt are ready to use.
 * Without them (or while the call is in flight) it shows the static template.
 */

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { forgetNicheSlides, getNicheSlides, type NicheSlide } from '../../../lib/nicheSlides';
import { useLabClient } from '../LabClientProvider';

/** A finished generation attempt. `slides: null` means the attempt failed. */
type SettledSlides = { requestKey: string; slides: NicheSlide[] | null; generated: boolean };

type SuggestedSlidesProps = {
  /** Static example slides from the Phase 0A template — the fallback. */
  fallbackSlides: NicheSlide[];
  /** Phase 0A template id, used for generation and as a cache key. */
  templateId: number;
  /** Niche the user searched, e.g. "auto mechanic". Empty disables generation. */
  niche?: string;
  videoId: string;
  hook?: string;
  transcript?: string;
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={`Copy the slide ${label}`}
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="shrink-0 whitespace-nowrap rounded bg-orange-50 px-1.5 py-0.5 text-[9px] font-medium text-orange-600 transition-colors hover:bg-orange-100"
    >
      {copied ? 'Copied' : `Copy ${label}`}
    </button>
  );
}

function SlideSkeleton() {
  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-orange-200 bg-white px-2.5 py-2">
      <div className="h-3 w-4/5 animate-pulse rounded bg-orange-100" />
      <div className="ml-4 h-2.5 w-11/12 animate-pulse rounded bg-orange-50" />
    </li>
  );
}

export function SuggestedSlides({
  fallbackSlides,
  templateId,
  niche,
  videoId,
  hook,
  transcript,
}: SuggestedSlidesProps) {
  const client = useLabClient();
  const trimmedNiche = niche?.trim() ?? '';
  const canGenerate = Boolean(trimmedNiche);
  /** Bumped by Regenerate so the effect re-runs for the same inputs. */
  const [nonce, setNonce] = useState(0);
  /** Identifies the request the panel is currently showing, or waiting on. */
  const requestKey = canGenerate ? `${trimmedNiche}|${videoId}|${templateId}|${nonce}` : '';

  const [settled, setSettled] = useState<SettledSlides | null>(null);

  useEffect(() => {
    if (!requestKey) return;
    let active = true;
    getNicheSlides(client, { niche: trimmedNiche, templateId, videoId, hook, transcript })
      .then((result) => {
        if (active) setSettled({ requestKey, slides: result.slides, generated: result.generated });
      })
      .catch(() => {
        if (active) setSettled({ requestKey, slides: null, generated: false });
      });
    return () => { active = false; };
  }, [requestKey, client, trimmedNiche, templateId, videoId, hook, transcript]);

  // A result from an older request is stale — keep showing the loading state.
  const current = settled?.requestKey === requestKey ? settled : null;
  const isLoading = Boolean(requestKey) && current === null;
  const failed = current !== null && current.slides === null;
  const isFallbackCopy = current !== null && current.slides !== null && !current.generated;
  const slides = current?.slides ?? null;

  const regenerate = () => {
    if (!canGenerate) return;
    forgetNicheSlides(client, { niche: trimmedNiche, templateId, videoId, hook, transcript });
    setNonce((n) => n + 1);
  };

  const shown = slides ?? fallbackSlides;

  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
          Suggested slides
          {slides !== null && !isFallbackCopy && (
            <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-medium normal-case tracking-normal text-green-700">
              written for {trimmedNiche}
            </span>
          )}
          {isLoading && (
            <span className="ml-1.5 inline-flex items-center gap-1 text-[9px] font-medium normal-case tracking-normal text-orange-600">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              writing for {trimmedNiche}…
            </span>
          )}
        </p>
        {canGenerate && !isLoading && (
          <button
            type="button"
            onClick={regenerate}
            className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-orange-600 transition-colors hover:bg-orange-100"
          >
            <RefreshCw className="h-2.5 w-2.5" />
            Regenerate
          </button>
        )}
      </div>

      {failed && (
        <p className="mb-1 text-[10px] text-red-600">
          Could not write slides for this niche — showing the generic template. Try Regenerate.
        </p>
      )}
      {isFallbackCopy && (
        <p className="mb-1 text-[10px] text-amber-700">
          AI copy is unavailable right now — these are the generic template slides.
        </p>
      )}

      <ol className="flex flex-col gap-1">
        {isLoading
          ? Array.from({ length: fallbackSlides.length || 4 }, (_, i) => <SlideSkeleton key={i} />)
          : shown.map((slide, i) => (
            <li key={i} className="flex flex-col gap-1 rounded-lg border border-orange-200 bg-white px-2.5 py-1.5">
              <div className="flex gap-1.5">
                <span className="mt-px shrink-0 text-[10px] font-bold text-orange-400">{i + 1}</span>
                <span className="flex-1 text-[11px] leading-snug text-ink">{slide.text}</span>
                <CopyButton value={slide.text} label="text" />
              </div>
              <div className="flex items-start gap-1.5 pl-4">
                <span className="mt-px shrink-0 text-[9px] text-muted/70">🎨</span>
                <span className="flex-1 text-[10px] italic leading-snug text-muted">{slide.bgPrompt}</span>
                <CopyButton value={slide.bgPrompt} label="prompt" />
              </div>
            </li>
          ))}
      </ol>
    </div>
  );
}
