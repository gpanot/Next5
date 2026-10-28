'use client';

import { useState } from 'react';
import type { ScriptDraft } from '../../../types/admin/scriptDrafts';
import { DEFAULT_SCRIPT_MODEL, type ScriptModel } from '../../../types/admin/scriptGenerator';
import { adminFetch } from '../business/useAdminApi';
import { CarouselFlow } from './carousel/CarouselFlow';
import { useCarouselBuilder } from './carousel/useCarouselBuilder';
import { HookStep } from './HookStep';
import { SavedScripts } from './SavedScripts';
import { ScriptResult } from './ScriptResult';
import { backBtn, ModelPicker, ToolPill } from './ui';
import { useScriptGenerator } from './useScriptGenerator';
import { Wizard } from './Wizard';

/** Opens a saved script or carousel on the right path. */
function useOpenDraft(token: string, onVideo: (d: Extract<ScriptDraft, { kind: 'video' }>) => void, onCarousel: (d: Extract<ScriptDraft, { kind: 'carousel' }>) => void) {
  const [openError, setOpenError] = useState('');
  const open = async (id: string) => {
    setOpenError('');
    try {
      const { draft } = await adminFetch<{ draft: ScriptDraft }>(token, `/api/admin/script-generator/drafts/${id}`);
      if (draft.kind === 'carousel') onCarousel(draft);
      else onVideo(draft);
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Could not open this script');
    }
  };
  return { open, openError };
}

/** Admin › Script Generator: a video script (wizard, hook, script) or a carousel (template, questions, slide 1, slides). */
export function ScriptGeneratorTab({ token }: { token: string }) {
  /** Which text model writes everything. Sent with every call, so it can change between steps. */
  const [model, setModel] = useState<ScriptModel>(DEFAULT_SCRIPT_MODEL);
  const [mode, setMode] = useState<'video' | 'carousel'>('video');
  const g = useScriptGenerator(token, model);
  const c = useCarouselBuilder(token, model);
  const { open, openError } = useOpenDraft(
    token,
    (d) => { c.reset(); setMode('video'); setModel(d.model); g.load(d); },
    (d) => { g.reset(); setMode('carousel'); setModel(d.model); c.load(d); },
  );
  const startOver = () => { g.reset(); c.reset(); setMode('video'); };
  const saveKey = `${g.session}-${g.saveState}-${c.session}-${c.saveState}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6 rounded-2xl bg-app-sunken p-5 pb-10 md:p-8">
      <div className="flex items-start justify-between gap-3">
        <ToolPill />
        <button type="button" onClick={startOver} className={backBtn}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>
          Start over
        </button>
      </div>
      <div className="space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight text-app-ink md:text-5xl">AI Script Generator</h1>
        <p className="max-w-2xl text-base text-app-muted md:text-lg">Pick a video or a carousel. Answer a few questions. Pick a hook. Get the full script or slides, then refine them as much as you want. Everything is saved.</p>
      </div>
      <ModelPicker value={model} onChange={setModel} />
      {mode === 'carousel' ? (
        <CarouselFlow token={token} c={c} onExit={startOver} />
      ) : g.script ? (
        <ScriptResult key={g.session} token={token} script={g.script} chat={g.chat} busy={g.busy} error={g.error} onRefine={g.refine} saveState={g.saveState} onRetrySave={g.retrySave} />
      ) : g.pending ? (
        <HookStep hooks={g.hooks} busy={g.busy} error={g.error} onPick={g.pickHook} onBack={g.backToWizard} onRegenerate={() => void g.requestHooks(g.pending!)} />
      ) : (
        <>
          <Wizard error={g.error} initial={g.draft} onSubmit={(input) => void g.requestHooks(input)} onCarousel={() => setMode('carousel')} />
          {openError && <p role="alert" className="text-sm text-app-danger">{openError}</p>}
          <SavedScripts token={token} refreshKey={saveKey} onOpen={(id) => void open(id)} />
        </>
      )}
    </div>
  );
}
