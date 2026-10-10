'use client';

import { useEffect, useState } from 'react';
import type { ShortDetailDto } from '../../../types/admin/shorts';
import { VISUAL_BIBLE_FIELDS, type VisualBible, type VisualBibleKey } from '../../../types/admin/visualBible';
import { Disclosure, Section } from './Section';
import { rebuildVisualBible, saveVisualBible, useVisualBible } from './useShorts';

type Draft = Partial<Record<VisualBibleKey, string>>;

const changedFields = (bible: VisualBible, draft: Draft): Draft =>
  Object.fromEntries(Object.entries(draft).filter(([k, v]) => v !== bible[k as VisualBibleKey]));

function BibleSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-app-sunken" />)}
    </div>
  );
}

/** The anchor photo every shot was made from, and the prompt that made it. */
function Anchor({ short }: { short: ShortDetailDto }) {
  if (!short.anchorUrl) return null;
  return (
    <div className="flex gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={short.anchorUrl} alt="Anchor photo: main character and hero product" className="aspect-[9/16] w-24 shrink-0 rounded-lg bg-app-sunken object-cover" />
      <div className="min-w-0 space-y-1.5">
        <p className="text-xs font-bold text-app-ink">Anchor (reference for every shot)</p>
        <p className="text-xs text-app-muted">Same person and product in all shots. A wrong anchor? Fix “Hero product” or “People look” below, then run again from step 3.</p>
        {short.inputs?.anchorPrompt && <Disclosure label="Anchor prompt" text={short.inputs.anchorPrompt} />}
      </div>
    </div>
  );
}

function BibleFields({ bible, draft, onChange }: { bible: VisualBible; draft: Draft; onChange: (key: VisualBibleKey, value: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {VISUAL_BIBLE_FIELDS.map((f) => (
        <label key={f.key} className="space-y-1">
          <span className="block text-xs font-bold text-app-ink">{f.label}</span>
          <textarea
            value={draft[f.key] ?? bible[f.key]}
            onChange={(e) => onChange(f.key, e.target.value)}
            rows={f.key === 'design_story' || f.key === 'environments' ? 3 : 2}
            className="w-full rounded-lg border border-app-line bg-app-panel px-3 py-2 text-sm text-app-ink transition focus:border-app-ink focus:outline-none"
          />
          <span className="block text-[11px] text-app-muted">{f.hint}</span>
        </label>
      ))}
    </div>
  );
}

/**
 * The workspace's Visual Bible: the photo rules every short of this brand follows (persona, places, style, hero product).
 * Edits apply to the next photo run (“Run again” from step 3); the short on screen keeps the bible it was made with.
 */
export function VisualBiblePanel({ short, token }: { short: ShortDetailDto; token: string }) {
  const { data, error, refresh } = useVisualBible(token, short.workspaceId);
  const [draft, setDraft] = useState<Draft>({});
  const [busy, setBusy] = useState<'save' | 'rebuild' | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const bible = data?.bible ?? null;
  // Step 1 builds the bible on a brand's first short: read it again each time the short moves to another step.
  useEffect(() => refresh(), [short.status, refresh]);
  const edits = bible ? changedFields(bible, draft) : {};
  const used = short.inputs?.visualBible;
  const run = async (kind: 'save' | 'rebuild') => {
    if (kind === 'rebuild' && bible?.source === 'edited' && !window.confirm('Rebuild from the site? Your edits to this bible will be replaced.')) return;
    setBusy(kind);
    setMessage(null);
    try {
      if (kind === 'save') await saveVisualBible(token, short.workspaceId, edits);
      else await rebuildVisualBible(token, short.workspaceId);
      setDraft({});
      refresh();
      setMessage({ ok: true, text: kind === 'save' ? 'Saved. Run again from step 3 to use it.' : 'Read again from the site.' });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setBusy(null);
    }
  };
  const aside = used ? `this short used the ${used.source} bible of ${new Date(used.updatedAt).toLocaleDateString()}` : 'classic prompts (no bible)';
  return (
    <Section title="Visual Bible" aside={aside}>
      <Anchor short={short} />
      {error && !data && <p className="rounded-lg bg-app-accent-soft p-3 text-sm text-app-danger">{error}</p>}
      {!data && !error && <BibleSkeleton />}
      {data && !bible && (
        <p className="text-sm text-app-muted">
          {short.status === 'STEP_1_RUNNING' ? 'Reading the site’s photos for this brand’s Visual Bible (with the script)…' : 'No Visual Bible yet. It is built with the script of this brand’s next short, or now:'}
        </p>
      )}
      {bible && <BibleFields bible={bible} draft={draft} onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} />}
      {data && (
        <div className="flex flex-wrap items-center gap-2 border-t border-app-line pt-3">
          {bible && (
            <button
              type="button"
              onClick={() => run('save')}
              disabled={busy !== null || Object.keys(edits).length === 0}
              className="min-h-11 rounded-lg bg-app-ink px-4 text-sm font-bold text-app-panel transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            >
              {busy === 'save' ? 'Saving…' : 'Save changes'}
            </button>
          )}
          <button
            type="button"
            onClick={() => run('rebuild')}
            disabled={busy !== null}
            className="min-h-11 rounded-lg border border-app-line px-4 text-sm font-bold text-app-ink transition hover:bg-app-sunken active:scale-[0.98] disabled:opacity-40"
          >
            {busy === 'rebuild' ? 'Reading the site…' : bible ? 'Rebuild from site' : 'Build now'}
          </button>
          {bible && <span className="text-xs text-app-muted">{bible.source === 'edited' ? 'Edited by an admin' : 'Read from the site'} · {bible.images.length} site photos</span>}
          {message && <p className={`w-full text-xs ${message.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-app-danger'}`}>{message.text}</p>}
        </div>
      )}
    </Section>
  );
}
