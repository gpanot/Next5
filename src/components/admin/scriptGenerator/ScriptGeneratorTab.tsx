'use client';

import { HookStep } from './HookStep';
import { SavedScripts } from './SavedScripts';
import { ScriptResult } from './ScriptResult';
import { backBtn, ModelPicker, ToolPill } from './ui';
import { useScriptGenerator } from './useScriptGenerator';
import { Wizard } from './Wizard';

/** Admin › Script Generator: wizard, then "Pick your hook", then the script with a refine chat (Claude). */
export function ScriptGeneratorTab({ token }: { token: string }) {
  const g = useScriptGenerator(token);
  return (
    <div className="mx-auto max-w-4xl space-y-6 rounded-2xl bg-app-sunken p-5 pb-10 md:p-8">
      <div className="flex items-start justify-between gap-3">
        <ToolPill />
        <button type="button" onClick={g.reset} className={backBtn}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>
          Start over
        </button>
      </div>
      <div className="space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight text-app-ink md:text-5xl">AI Script Generator</h1>
        <p className="max-w-2xl text-base text-app-muted md:text-lg">Pick a format (video or carousel). Answer a few questions. Pick a hook. Get a full script with the reasoning behind every beat, then refine it as much as you want.</p>
      </div>
      <ModelPicker value={g.model} onChange={g.setModel} />
      {g.script ? (
        <ScriptResult
          key={g.session}
          token={token}
          script={g.script}
          chat={g.chat}
          busy={g.busy}
          error={g.error}
          onRefine={g.refine}
          draftId={g.draftId}
          saveState={g.saveState}
          onRetrySave={g.retrySave}
          savedPhotos={g.savedPhotos}
        />
      ) : g.pending ? (
        <HookStep carousel={g.pending.format === 'carousel'} hooks={g.hooks} busy={g.busy} error={g.error} onPick={g.pickHook} onBack={g.backToWizard} onRegenerate={() => void g.requestHooks(g.pending!)} />
      ) : (
        <>
          <Wizard error={g.error} initial={g.draft} onSubmit={(input) => void g.requestHooks(input)} />
          <SavedScripts token={token} refreshKey={`${g.session}-${g.saveState}`} onOpen={(id) => void g.open(id)} />
        </>
      )}
    </div>
  );
}
