'use client';

/**
 * Step 3 — the week the Template Engine proposed.
 *
 * A list of day cards, not a table: at 390px a table either scrolls sideways or loses columns.
 * Swapping a day offers only templates valid for that slot, because only real templates exist —
 * there is no pillar × format grid to cross.
 */
import { useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import type { TemplateDto } from '../../../../lib/contentTemplates';
import type { CampaignPostDto, ContentSourceDto } from '../../../../types/business/campaigns';
import { SegmentedControl } from '../../../ui/SegmentedControl';

const SOURCES: { value: ContentSourceDto; label: string }[] = [
  { value: 'real', label: 'Yours' },
  { value: 'mix', label: 'Mix' },
  { value: 'generated', label: 'Generated' },
];

const weekday = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

type Props = {
  posts: CampaignPostDto[];
  busyPostId: string | null;
  onSwap: (postId: string, templateId: string) => void;
  onLoadOptions: (postId: string) => Promise<TemplateDto[]>;
  onToggleSkip: (postId: string, skipped: boolean) => void;
  onSource: (postId: string, source: ContentSourceDto) => void;
  onRegenerate: () => void;
};

export function PlanStep({ posts, busyPostId, onSwap, onLoadOptions, onToggleSkip, onSource, onRegenerate }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [options, setOptions] = useState<Record<string, TemplateDto[] | 'loading'>>({});

  const openSwap = async (postId: string) => {
    if (openId === postId) {
      setOpenId(null);
      return;
    }
    setOpenId(postId);
    if (options[postId]) return;
    setOptions((prev) => ({ ...prev, [postId]: 'loading' }));
    const list = await onLoadOptions(postId).catch(() => []);
    setOptions((prev) => ({ ...prev, [postId]: list }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-app-muted">
          {posts.filter((p) => !p.skipped).length} posts · one idea a day, none repeated
        </p>
        <button
          type="button"
          onClick={onRegenerate}
          className="inline-flex items-center gap-1.5 rounded-xl border border-app-line px-3 py-1.5 text-[12px] text-app-muted transition-colors duration-200 hover:text-app-ink"
        >
          <RefreshCw aria-hidden className="h-3.5 w-3.5" /> Regenerate plan
        </button>
      </div>

      <ol className="flex flex-col gap-2.5">
        {posts.map((post) => {
          const open = openId === post.id;
          const list = options[post.id];
          return (
            <li
              key={post.id}
              className={[
                'rounded-2xl border transition-colors duration-200',
                post.skipped ? 'border-app-line bg-app-sunken opacity-60' : 'border-app-line bg-app-surface',
              ].join(' ')}
            >
              <div className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-app-muted">
                      {weekday(post.date)} · {post.date.slice(5)} · {post.purpose}
                    </span>
                    <span className="text-[15px] font-medium text-app-ink">{post.templateName}</span>
                    <span className="text-[12px] text-app-muted">{post.hookPattern}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleSkip(post.id, !post.skipped)}
                    className="shrink-0 text-[12px] text-app-muted underline underline-offset-2 hover:text-app-ink"
                  >
                    {post.skipped ? 'Add back' : 'Skip'}
                  </button>
                </div>

                {post.widened && (
                  <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                    No {post.purpose} idea left this week — using a {post.pillarName} one instead.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <SegmentedControl
                    options={SOURCES}
                    value={post.source}
                    onChange={(v) => onSource(post.id, v)}
                  />
                  <button
                    type="button"
                    disabled={post.skipped || busyPostId === post.id}
                    onClick={() => void openSwap(post.id)}
                    className="inline-flex items-center gap-1 rounded-xl border border-app-line px-3 py-1.5 text-[12px] text-app-muted transition-colors duration-200 hover:text-app-ink disabled:opacity-40"
                  >
                    Swap idea
                    <ChevronDown aria-hidden className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {post.requiredUploads.length > 0 && (
                  <p className="text-[12px] text-app-muted">
                    You supply: {post.requiredUploads.map((a) => a.label).join(' · ')}
                  </p>
                )}
              </div>

              {open && (
                <div className="flex flex-col gap-1.5 border-t border-app-line px-4 py-3">
                  {list === 'loading' && <p className="text-[12px] text-app-muted">Looking for other ideas…</p>}
                  {Array.isArray(list) && list.length === 0 && (
                    <p className="text-[12px] text-app-muted">No other idea fits this day.</p>
                  )}
                  {Array.isArray(list) &&
                    list.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onSwap(post.id, t.id);
                          setOpenId(null);
                        }}
                        className="flex flex-col gap-0.5 rounded-xl border border-app-line px-3 py-2 text-left transition-colors duration-200 hover:border-app-ink"
                      >
                        <span className="text-[13px] font-medium text-app-ink">{t.name}</span>
                        <span className="text-[11px] text-app-muted">
                          {t.pillarName}
                          {t.requiredUploads.length > 0 && ` · you supply ${t.requiredUploads.map((a) => a.label).join(', ')}`}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
