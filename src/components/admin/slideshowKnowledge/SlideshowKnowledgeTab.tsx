'use client';

/** Slideshow Knowledge Center: proven TikTok slideshows in, reusable hook + meat + CTA models out. */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ImportList } from './ImportList';
import { ImportPanel } from './ImportPanel';
import { ModelDrawer } from './ModelDrawer';
import { ModelGrid } from './ModelGrid';
import { useModels, useReferences } from './useKnowledge';

type View = 'models' | 'imports';

export function SlideshowKnowledgeTab({ token, header }: { token: string; header?: ReactNode }) {
  const [view, setView] = useState<View>('models');
  const [openModel, setOpenModel] = useState<string | null>(null);
  const refs = useReferences(token);
  const models = useModels(token);
  const { refresh: refreshModels } = models;

  // An import that finishes can create or feed a model: reload the models when the queue empties.
  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !refs.busy) refreshModels();
    wasBusy.current = refs.busy;
  }, [refs.busy, refreshModels]);

  const onImported = useCallback(() => {
    refs.refresh();
    setView('imports');
  }, [refs]);

  const running = refs.references?.filter((r) => r.status === 'pending' || r.status === 'reading').length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {header}
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl dark:text-zinc-100">Slideshow Knowledge</h2>
        <p className="text-sm text-muted dark:text-zinc-400">Import TikTok slideshows that already win. Each one becomes a model: hook, meat and CTA you can reuse.</p>
      </div>

      <ImportPanel token={token} onImported={onImported} />

      <div className="flex gap-6 border-b border-line dark:border-zinc-800" role="tablist">
        {(['models', 'imports'] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`-mb-px min-h-11 border-b-2 text-sm font-semibold transition ${view === v ? 'border-ink text-ink dark:border-zinc-100 dark:text-zinc-100' : 'border-transparent text-muted hover:text-ink dark:hover:text-zinc-100'}`}
          >
            {v === 'models' ? `Models${models.models ? ` · ${models.models.length}` : ''}` : `Imports${running ? ` · ${running} running` : ''}`}
          </button>
        ))}
      </div>

      {view === 'models' ? (
        <ModelGrid models={models.models} error={models.error} onOpen={setOpenModel} />
      ) : (
        <ImportList token={token} references={refs.references} error={refs.error} onChanged={refs.refresh} onOpenModel={setOpenModel} />
      )}

      {openModel && <ModelDrawer key={openModel} token={token} modelId={openModel} onClose={() => setOpenModel(null)} onChanged={refreshModels} />}
    </div>
  );
}
