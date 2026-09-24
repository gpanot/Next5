'use client';

import { BLITZ_BUSINESS_TEXT_MAX } from '../../../config/blitzLab';

type CopyPanelProps = {
  mentionBusiness: boolean;
  onMentionBusinessChange: (on: boolean) => void;
  businessText: string;
  onBusinessTextChange: (text: string) => void;
  captionText: string;
  onCaptionChange: (text: string) => void;
  regenPrompt: string;
  onRegenPromptChange: (text: string) => void;
  onRegenerateText: () => void;
  isRegenerating: boolean;
  regenError: string | null;
};

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-orange-400/30 dark:border-neutral-700 dark:bg-neutral-800';

/** Business line + caption + optional caption regeneration. */
export function CopyPanel({
  mentionBusiness, onMentionBusinessChange, businessText, onBusinessTextChange,
  captionText, onCaptionChange, regenPrompt, onRegenPromptChange, onRegenerateText, isRegenerating, regenError,
}: CopyPanelProps) {
  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-medium text-ink">Mention your business?</p>
          <div className="flex gap-2">
            {([true, false] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => onMentionBusinessChange(val)}
                className={[
                  'min-h-9 rounded-full px-4 text-[12px] transition-colors',
                  mentionBusiness === val ? 'bg-orange-500 text-white' : 'bg-white text-muted ring-1 ring-line hover:text-ink dark:bg-neutral-800',
                ].join(' ')}
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>
        {mentionBusiness && (
          <div className="flex flex-col gap-1">
            <label htmlFor="blitz-business" className="text-[12px] font-medium text-muted">Business line (shown on the video)</label>
            <input
              id="blitz-business"
              value={businessText}
              maxLength={BLITZ_BUSINESS_TEXT_MAX}
              onChange={(e) => onBusinessTextChange(e.target.value)}
              placeholder="Sarah Lee · Keller Williams · 555-0100"
              className={inputClass}
            />
            <p className="text-right text-[10px] tabular-nums text-muted">{businessText.length}/{BLITZ_BUSINESS_TEXT_MAX}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-1">
          <label htmlFor="blitz-caption" className="text-[12px] font-medium text-muted">Caption</label>
          <textarea id="blitz-caption" value={captionText} onChange={(e) => onCaptionChange(e.target.value)} rows={3} placeholder="Enter caption text…" className={`${inputClass} resize-none`} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="blitz-prompt" className="text-[12px] font-medium text-muted">Prompt (optional)</label>
          <textarea id="blitz-prompt" value={regenPrompt} onChange={(e) => onRegenPromptChange(e.target.value)} rows={2} placeholder="Freeform instructions for text regeneration…" className={`${inputClass} resize-none`} />
        </div>
        <button
          type="button"
          onClick={onRegenerateText}
          disabled={isRegenerating}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-[13px] font-medium text-ink transition-colors hover:bg-surface-alt disabled:opacity-40 dark:bg-neutral-800"
        >
          {isRegenerating && <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          {isRegenerating ? 'Regenerating…' : '↺ Regenerate Text'}
        </button>
        {regenError && <p className="text-[12px] text-red-700">{regenError}</p>}
      </div>
    </>
  );
}
