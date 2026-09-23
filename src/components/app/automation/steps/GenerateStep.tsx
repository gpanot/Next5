'use client';

/**
 * Step 6 — preparing the campaign.
 *
 * This is where render progress will live once generation exists (Phase 1B). Until then it
 * reports what is genuinely true: each post's template, version and shot list are confirmed, and
 * whether the footage for it has to come from her. It does not animate a fake timer over work
 * that is not happening.
 */
import { useEffect, useState } from 'react';
import { Check, Clapperboard, Camera } from 'lucide-react';
import type { CampaignPostDto } from '../../../../types/business/campaigns';

const weekday = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

type Props = {
  posts: CampaignPostDto[];
  onDone: () => void;
};

export function GenerateStep({ posts, onDone }: Props) {
  const live = posts.filter((p) => !p.skipped);
  const [ready, setReady] = useState(0);

  // Reveal in order so the list reads as it fills rather than appearing at once. Purely
  // presentational: every post below is already prepared by the time this screen mounts.
  useEffect(() => {
    if (ready >= live.length) return;
    const timer = setTimeout(() => setReady((n) => n + 1), 90);
    return () => clearTimeout(timer);
  }, [ready, live.length]);

  const done = ready >= live.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div
          aria-hidden
          className={[
            'flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-300',
            done ? 'bg-emerald-100 text-emerald-700' : 'bg-app-sunken text-app-muted',
          ].join(' ')}
        >
          {done ? <Check className="h-6 w-6" /> : <Clapperboard className="h-6 w-6" />}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[18px] font-semibold text-app-ink">
            {done ? 'Your campaign is ready to review' : 'Preparing your campaign…'}
          </p>
          <p className="text-[13px] text-app-muted">
            {Math.min(ready, live.length)} of {live.length} posts prepared
          </p>
        </div>
        <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-app-sunken">
          <div
            className="h-full rounded-full bg-app-cta transition-[width] duration-300"
            style={{ width: `${live.length === 0 ? 0 : (Math.min(ready, live.length) / live.length) * 100}%` }}
          />
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {live.map((post, i) => {
          const shown = i < ready;
          return (
            <li
              key={post.id}
              className={[
                'flex items-center gap-3 rounded-xl border p-3.5 transition-opacity duration-300',
                shown ? 'border-app-line bg-app-surface opacity-100' : 'border-app-line/60 opacity-40',
              ].join(' ')}
            >
              {shown ? (
                <Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Camera aria-hidden className="h-4 w-4 shrink-0 text-app-muted" />
              )}
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[13px] font-medium text-app-ink">
                  {weekday(post.date)} · {post.templateName}
                </span>
                <span className="text-[12px] text-app-muted">
                  {post.requiredUploads.length > 0
                    ? `Needs your footage: ${post.requiredUploads.map((a) => a.label).join(', ')}`
                    : 'Nothing needed from you'}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {done && (
        <button
          type="button"
          onClick={onDone}
          className="self-center text-[13px] font-medium text-app-ink underline underline-offset-4"
        >
          Review your campaign
        </button>
      )}
    </div>
  );
}
