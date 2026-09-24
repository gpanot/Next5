'use client';

import { useState } from 'react';
import type React from 'react';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { useContentTemplates } from '../shared/useContentTemplates';
import { TemplateRequirements } from '../shared/TemplateRequirements';
import { ScriptSheet } from './ScriptSheet';
import { SuggestedSlides } from './SuggestedSlides';

export type ResearchVideo = {
  id: string;
  video_url: string;
  thumbnail: string;
  author: string;
  views: number;
  likes: number;
  /** ISO date the video was posted. Missing on searches cached before dates were added. */
  posted_at?: string | null;
  /** Duration in seconds. Missing on results cached before duration was tracked. */
  duration?: number | null;
  hook: string;
  raw_transcript: string;
  /**
   * Phase 0A template the research API classified this video as. Missing on
   * searches cached before classification existed — the hook is matched instead.
   */
  template_id?: number | null;
};

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};

/**
 * Seconds, from a value that may be milliseconds. Searches cached before the
 * API normalised TikHub's millisecond durations still hold raw values, and no
 * TikTok is longer than 10 minutes, so anything above 1000 is milliseconds.
 */
const toSeconds = (value: number | null | undefined): number | null => {
  if (typeof value !== 'number' || value <= 0) return null;
  return Math.round(value > 1000 ? value / 1000 : value);
};

/** "1:05" or "0:28". Returns null when duration is missing. */
const formatDuration = (seconds: number | null | undefined): string | null => {
  if (seconds == null || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/** "Mar 4, 2026". Empty when the date is missing or unreadable. */
const formatPostedAt = (iso: string | null | undefined): string => {
  const time = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(time)) return '';
  return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

type ResearchCardProps = {
  video: ResearchVideo;
  selected: boolean;
  onSelect: () => void;
  renderAction?: React.ReactNode;
  /** Niche the user searched. When set, the suggested slides are rewritten for it. */
  niche?: string;
};

export function ResearchCard({ video, selected, onSelect, renderAction, niche }: ResearchCardProps) {
  const [scriptOpen, setScriptOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const postedAt = formatPostedAt(video.posted_at);

  const { resolve, loading: templatesLoading } = useContentTemplates();
  const template = resolve(video.template_id, video.hook);
  const durationSeconds = toSeconds(video.duration);
  const durationLabel = formatDuration(durationSeconds);
  const durationTooLong = durationSeconds !== null && durationSeconds > 30;

  return (
    <article
      className={`flex flex-col rounded-xl border bg-white transition-shadow ${selected ? 'border-ink ring-1 ring-ink' : 'border-line'}`}
    >
      {/* ── Main card row ──────────────────────────────────────────────── */}
      <div className="flex gap-3 p-3">
        <button type="button" onClick={onSelect} className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-alt" aria-label={`Use the hook from @${video.author}`}>
          {video.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element -- TikTok cover URL
            <img src={video.thumbnail} alt="" className="h-full w-full object-cover" />
          )}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {/* Wraps on narrow screens so the handle is never truncated to fit the stats. */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
            <span className="truncate text-[12px] text-muted">@{video.author}</span>
            <div className="flex shrink-0 items-center gap-2">
              {durationLabel && (
                durationTooLong ? (
                  <span className="flex items-center gap-0.5 text-[11px] font-bold text-red-600" title="Over 30 s — too long for a slideshow hook">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {durationLabel}
                  </span>
                ) : (
                  <span className="text-[11px] tabular-nums text-muted">{durationLabel}</span>
                )
              )}
              <span className="text-[11px] text-muted tabular-nums">{formatCount(video.views)} views · {formatCount(video.likes)} likes</span>
            </div>
          </div>
          {postedAt && <span className="text-[11px] text-muted">Posted {postedAt}</span>}
          <button type="button" onClick={onSelect} className="text-left text-[13px] leading-snug text-ink line-clamp-3">
            {video.hook || <span className="italic text-subtle">No hook found</span>}
          </button>
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            <button type="button" onClick={() => setScriptOpen(true)} className="min-h-8 text-ink underline">
              See script
            </button>
            {video.video_url && (
              <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="min-h-8 leading-8 text-ink underline">
                Open on TikTok
              </a>
            )}
            <button
              type="button"
              onClick={() => setTemplateOpen((o) => !o)}
              className="ml-auto flex items-center gap-1 min-h-8 text-orange-600 font-medium underline-offset-2 hover:underline"
            >
              See Template
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${templateOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {renderAction && <div className="mt-1">{renderAction}</div>}
        </div>
      </div>

      {/* ── Template expansion ─────────────────────────────────────────── */}
      {templateOpen && !template && (
        <div className="border-t border-orange-100 bg-orange-50/60 px-3 py-3 text-[12px] text-muted">
          {templatesLoading ? 'Loading the template library…' : 'Template library unavailable.'}
        </div>
      )}
      {templateOpen && template && (
        <div className="border-t border-orange-100 bg-orange-50/60 px-3 pb-3 pt-2.5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-[13px] font-semibold text-ink">
                {template.legacyId ? `T${String(template.legacyId).padStart(2, '0')} — ` : ''}{template.name}
              </p>
              <span className="mt-0.5 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-800">
                {template.pillarName}
              </span>
            </div>
          </div>

          {/* What this template needs before it can be made at all. */}
          <TemplateRequirements assetRequirements={template.assetRequirements} className="mb-2" />

          {/* Hook pattern */}
          <div className="mb-2 rounded-lg border border-orange-200 bg-white px-3 py-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Hook pattern</p>
            <p className="text-[12px] italic text-ink">&ldquo;{template.hookPattern}&rdquo;</p>
          </div>

          {/* Structure */}
          <div className="mb-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Structure</p>
            <ol className="flex flex-col gap-0.5">
              {template.beats.map((beat, i) => (
                <li key={`${beat.label}-${i}`} className="flex gap-1.5 text-[11px] text-ink">
                  <span className="shrink-0 text-muted">{i + 1}.</span>
                  <span>
                    <span className="font-medium">{beat.label}</span>
                    {beat.guidance ? `: ${beat.guidance}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Key variables */}
          <div className="mb-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Variables</p>
            <div className="flex flex-wrap gap-1">
              {template.variables.map((v) => (
                <span
                  key={v.key}
                  title={[v.hint, v.required ? 'required' : 'optional', `from ${v.source}`].filter(Boolean).join(' · ')}
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${v.required ? 'bg-orange-100 text-orange-800' : 'border border-dashed border-orange-200 text-orange-700'}`}
                >
                  {v.key}
                </span>
              ))}
            </div>
          </div>

          {/* Suggested slides — niche-specific when a niche is given */}
          <SuggestedSlides
            fallbackSlides={template.suggestedSlides}
            templateId={template.legacyId ?? 0}
            niche={niche}
            videoId={video.id || video.video_url}
            hook={video.hook}
            transcript={video.raw_transcript}
          />
        </div>
      )}

      {scriptOpen && (
        <ScriptSheet
          author={video.author}
          hook={video.hook}
          script={video.raw_transcript}
          onUseHook={() => { onSelect(); setScriptOpen(false); }}
          onClose={() => setScriptOpen(false)}
        />
      )}
    </article>
  );
}
