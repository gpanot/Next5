'use client';

/**
 * Step 5 — what each day needs.
 *
 * The checklist is per template, not generic: "Thursday needs 1 customer photo" is something she
 * can act on, "what do you have?" is not. Only `upload` requirements can block scheduling —
 * anything we generate is our problem, not hers.
 */
import { AlertTriangle, Check } from 'lucide-react';
import type { CampaignPostDto } from '../../../../types/business/campaigns';

const METHODS = [
  { value: 'library', label: 'Use what I already uploaded', sub: 'Photos and clips in your library' },
  { value: 'upload-video', label: 'I will upload clips', sub: 'Film the shots listed below' },
  { value: 'upload-product', label: 'I will upload product photos', sub: 'Stills we can build posts from' },
  { value: 'generate', label: "I don't have assets", sub: 'We work with what the templates can generate' },
];

const weekday = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

type Props = {
  posts: CampaignPostDto[];
  assetMethod: string | null;
  onChange: (patch: { assetMethod?: string }) => void;
};

export function AssetsStep({ posts, assetMethod, onChange }: Props) {
  const live = posts.filter((p) => !p.skipped);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-[15px] font-medium text-app-ink">Where does the footage come from?</p>
        <div className="grid gap-2">
          {METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange({ assetMethod: m.value })}
              className={[
                'flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition-colors duration-200',
                assetMethod === m.value ? 'border-app-ink bg-app-surface' : 'border-app-line hover:border-app-ink/40',
              ].join(' ')}
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-[14px] font-medium text-app-ink">{m.label}</span>
                <span className="text-[12px] text-app-muted">{m.sub}</span>
              </span>
              {assetMethod === m.value && <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-app-ink" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[15px] font-medium text-app-ink">Your shot list</p>
        <p className="text-[12px] text-app-muted">What each day needs from you. Everything else we make.</p>
        <ul className="flex flex-col gap-2">
          {live.map((post) => {
            const needsHer = post.requiredUploads.length > 0;
            return (
              <li key={post.id} className="flex items-start gap-3 rounded-xl border border-app-line bg-app-surface p-3.5">
                {needsHer && !assetMethod ? (
                  <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                ) : (
                  <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                )}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[13px] font-medium text-app-ink">
                    {weekday(post.date)} · {post.templateName}
                  </span>
                  <span className="text-[12px] text-app-muted">
                    {needsHer
                      ? `You supply: ${post.requiredUploads.map((a) => a.label).join(' · ')}`
                      : 'Nothing needed from you'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
