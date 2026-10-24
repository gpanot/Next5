'use client';

import { useState } from 'react';
import { SCRIPT_FORMATS, type GeneratedScript } from '../../../types/admin/scriptGenerator';
import { beatPosition, scriptToBrief, structureLabel } from './brief';
import { CarouselPreview } from './CarouselPreview';
import { useSlidePhotos } from './useSlidePhotos';
import { ReadAloudPanel, spokenText } from './ReadAloudPanel';
import { useReadAloud } from './useReadAloud';
import { amberTag, eyebrowClass, primaryBtn, secondaryBtn, softCard } from './ui';
import { SaveBadge } from './SavedScripts';
import type { ChatEntry, SaveState } from './useScriptGenerator';

type Props = {
  token: string;
  script: GeneratedScript;
  chat: ChatEntry[];
  busy: boolean;
  error: string;
  onRefine: (instruction: string) => void;
  /** The saved row (null until the first save lands), its save state, and its saved photos. */
  draftId: string | null;
  saveState: SaveState;
  onRetrySave: () => void;
  savedPhotos: Record<string, string>;
};

const card = softCard;
const label = eyebrowClass;

/** Copies the whole script as plain text, ready to paste into an LLM as a brief. */
function CopyBrief({ script }: { script: GeneratedScript }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(scriptToBrief(script));
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 2000);
  };
  return (
    <button type="button" onClick={() => void copy()} className={`${secondaryBtn} inline-flex items-center gap-2`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy script as brief'}
    </button>
  );
}

function BeatBody({ script, b, i }: { script: GeneratedScript; b: GeneratedScript['beats'][number]; i: number }) {
  const carousel = script.format === 'carousel';
  const split = !!(b.bottomOnScreen || b.bottomBroll);
  const visualLabel = carousel ? (split ? 'Top photo' : 'Photo') : i === 0 ? 'Visual (first frame)' : 'B-roll';
  return (
    <div className="space-y-1.5 text-sm text-app-ink">
      {b.onScreen && <p className="border-b border-app-line pb-1.5 font-semibold"><span className={`${label} mr-2`}>{split ? 'Top' : 'On screen'}</span>“{b.onScreen}”</p>}
      {b.spoken && <p>{b.spoken}</p>}
      {b.broll && <p className="text-xs text-app-muted">{visualLabel}: {b.broll}</p>}
      {b.bottomOnScreen && <p className="border-b border-app-line pt-1 pb-1.5 font-semibold"><span className={`${label} mr-2`}>Bottom</span>“{b.bottomOnScreen}”</p>}
      {b.bottomBroll && <p className="text-xs text-app-muted">Bottom photo: {b.bottomBroll}</p>}
      {b.rehook && <p className="text-xs font-semibold text-app-accent">Re-hook{b.rehookAt !== undefined ? ` at ${Math.round(b.rehookAt)}s` : ''}: {b.rehook}</p>}
    </div>
  );
}

function Beats({ script }: { script: GeneratedScript }) {
  return (
    <div className={`${card} divide-y divide-app-line`}>
      {script.beats.map((b, i) => (
        <div key={i} className="grid gap-2 py-3 first:pt-0 sm:grid-cols-[110px_1fr] sm:gap-4">
          <div>
            <span className={amberTag}>{beatPosition(script, b, i)}</span>
            <p className={`${label} mt-1.5`}>{b.label}</p>
          </div>
          <BeatBody script={script} b={b} i={i} />
        </div>
      ))}
      {script.music && <p className="pt-3 text-xs text-app-muted">Music: {script.music}</p>}
      <div className="pt-3">
        <p className={`${label} text-app-accent`}>{script.format === 'carousel' ? 'Call to action (caption)' : 'Call to action'}</p>
        <p className="mt-1 text-sm text-app-ink">“{script.cta}”</p>
      </div>
    </div>
  );
}

function DirectorNote({ script }: { script: GeneratedScript }) {
  return (
    <div className="space-y-2">
      <p className={label}>Director’s note</p>
      <div className={`${card} space-y-3`}>
        <p className="text-sm font-medium text-app-ink">{script.directorNote.summary}</p>
        {script.directorNote.decisions.map((d, i) => (
          <div key={i} className="grid grid-cols-[28px_1fr] gap-2">
            <span className="h-fit rounded-md bg-amber-100 py-0.5 text-center text-[11px] font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">0{i + 1}</span>
            <div>
              <p className="text-sm font-bold text-app-ink">{d.choice}</p>
              <p className="text-xs text-app-muted">{d.rule}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RefineBox({ chat, busy, error, onRefine }: Pick<Props, 'chat' | 'busy' | 'error' | 'onRefine'>) {
  const [text, setText] = useState('');
  const send = () => {
    const v = text.trim();
    if (!v || busy) return;
    onRefine(v);
    setText('');
  };
  return (
    <div className="space-y-3">
      <p className={label}>Refine the script</p>
      <p className="text-xs text-app-muted">“Make the hook stronger.” “Cut 10 seconds.” “Less corporate.” Only edits to this script are accepted.</p>
      {chat.map((m, i) => (
        <div key={i} className="space-y-1 text-sm">
          <p className="text-app-ink"><span className={`${label} mr-2`}>You</span>{m.you}</p>
          <p className="text-app-ink"><span className={`${label} mr-2 ${m.refused ? 'text-app-warning' : 'text-app-success'}`}>{m.refused ? 'Declined' : 'Updated'}</span>{m.reply}</p>
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-app-danger">{error}</p>}
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} disabled={busy} placeholder="e.g. make the hook punchier" className="min-h-12 flex-1 rounded-xl bg-app-panel px-4 text-base text-app-ink shadow-sm outline-none ring-1 ring-transparent focus:ring-amber-400" />
        <button type="button" onClick={send} disabled={busy || !text.trim()} className={primaryBtn}>{busy ? '…' : 'Send'}</button>
      </div>
    </div>
  );
}

type View = 'beats' | 'read' | 'preview';
const VIEW_LABEL: Record<View, string> = { beats: 'Beat by beat', read: 'Read-aloud', preview: 'Preview' };

/** The generated script (beats, read-aloud, or a carousel preview), the director's note, and the refine chat. */
export function ScriptResult({ token, script, chat, busy, error, onRefine, draftId, saveState, onRetrySave, savedPhotos }: Props) {
  const carousel = script.format === 'carousel';
  const views: View[] = carousel ? ['preview', 'beats'] : ['beats', 'read'];
  const [picked, setView] = useState<View>(views[0]);
  const view = views.includes(picked) ? picked : views[0];
  const voice = useReadAloud(token, spokenText(script));
  /** Photos stay on their slides through edits and view changes. */
  const photos = useSlidePhotos(token, draftId, savedPhotos);
  return (
    <div className={`space-y-5 ${busy ? 'opacity-70' : ''}`}>
      <div>
        <div className="flex items-center gap-3">
          <p className={label}>Your script</p>
          <SaveBadge state={saveState} onRetry={onRetrySave} />
        </div>
        <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-app-ink">{script.title}</h2>
        <p className="text-sm text-app-muted">
          {script.format === 'carousel'
            ? `${script.beats.length} slides · Carousel · ${structureLabel(script.structure)}`
            : `~${Math.round(script.durationSeconds)} seconds · ${SCRIPT_FORMATS[script.format]?.label ?? script.format}`}
        </p>
      </div>
      <div className="inline-flex gap-1 rounded-xl bg-app-panel p-1 shadow-sm">
        {views.map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} className={`min-h-9 rounded-lg px-3 text-sm font-semibold transition ${view === v ? 'bg-app-cta text-app-cta-ink' : 'text-app-muted hover:text-app-ink'}`}>{VIEW_LABEL[v]}</button>
        ))}
      </div>
      {view === 'beats' && <CopyBrief script={script} />}
      {view === 'beats' && <Beats script={script} />}
      {view === 'read' && <ReadAloudPanel script={script} voice={voice} />}
      {view === 'preview' && <CarouselPreview script={script} photos={photos} />}
      <DirectorNote script={script} />
      <RefineBox chat={chat} busy={busy} error={error} onRefine={onRefine} />
    </div>
  );
}
