'use client';

import { ImagePlus, PencilLine, RefreshCw, Sparkles, type LucideIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { FACE_SECONDS } from '../../../../types/admin/brandCast';
import { Dialog } from '../../../ui/Dialog';
import { PhotoPick, type NewFaceRequest } from './NewFaceDialog';

const MAX_PROMPT = 600;

type Mode = 'surprise' | 'photo' | 'prompt';

const MODES: { id: Mode; icon: LucideIcon; label: string; hint: string }[] = [
  { id: 'surprise', icon: Sparkles, label: 'Surprise me', hint: 'We pick someone who fits your brand' },
  { id: 'photo', icon: ImagePlus, label: 'Upload a photo', hint: 'We make a person from it' },
  { id: 'prompt', icon: PencilLine, label: 'Use your own prompt', hint: 'Describe who you want' },
];

type Props = {
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (request: NewFaceRequest) => void;
  /** The person "Surprise me" would make, as text; null when it failed (the error comes through `error`). */
  onDraft: () => Promise<string | null>;
};

function ModeCard({ icon: Icon, label, hint, selected, onPick }: { icon: LucideIcon; label: string; hint: string; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onPick}
      className={`flex min-h-14 w-full items-center gap-3 rounded-xl border p-3 text-left transition active:scale-[0.98] sm:flex-col sm:items-start sm:gap-2 ${selected ? 'border-app-ink bg-app-sunken' : 'border-app-line hover:bg-app-sunken'}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-app-ink text-app-panel' : 'bg-app-sunken text-app-ink'}`}>
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-app-ink">{label}</span>
        <span className="block text-xs text-app-muted">{hint}</span>
      </span>
    </button>
  );
}

/** "Use your own prompt": the Surprise-me person written out, loaded once, for the owner to edit. */
function PromptField({ value, loading, failed, onChange, onRetry }: { value: string; loading: boolean; failed: boolean; onChange: (v: string) => void; onRetry: () => void }) {
  if (loading) {
    return (
      <div aria-busy="true" aria-label="Writing a person for you" className="space-y-2 rounded-xl border border-app-line p-3">
        <div className="h-3 w-full animate-pulse rounded bg-app-sunken" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-app-sunken" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-app-sunken" />
      </div>
    );
  }
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-semibold text-app-ink">Who should it be? Edit anything: face, hair, age, outfit.</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_PROMPT))}
        rows={6}
        placeholder="e.g. Maya, 28. Warm brown skin, long curly dark hair, fit and sporty. Wears our black leggings and a white tank top."
        className="w-full rounded-xl border border-app-line bg-app-panel px-3 py-2 text-base text-app-ink transition focus:border-app-ink focus:outline-none sm:text-sm"
      />
      {failed && (
        <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-app-line px-4 text-sm font-semibold text-app-ink transition hover:bg-app-sunken active:scale-95">
          <RefreshCw aria-hidden className="h-3.5 w-3.5" /> Write one for me
        </button>
      )}
    </label>
  );
}

/** The prompt mode's text, started from the Surprise-me draft: `start` loads it the first time the mode is picked. */
function useDraftPrompt(onDraft: () => Promise<string | null>) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  const load = useCallback(async () => {
    setLoading(true);
    const text = await onDraft();
    setLoading(false);
    setState(text === null ? 'failed' : 'done');
    if (text !== null) setPrompt(text.slice(0, MAX_PROMPT));
  }, [onDraft]);
  const start = () => {
    if (state === 'idle' && !loading) void load();
  };
  return { prompt, setPrompt, loading, failed: state === 'failed', retry: load, start };
}

/** "+ Create Avatar": one new face, from "Surprise me", an uploaded photo, or the owner's own prompt (started from the
 *  Surprise-me person). Mount it with a fresh `key` per opening so each one starts on "Surprise me". */
export function CreateAvatarDialog({ open, busy, error, onClose, onSubmit, onDraft }: Props) {
  const [mode, setMode] = useState<Mode>('surprise');
  const [file, setFile] = useState<File | null>(null);
  const draft = useDraftPrompt(onDraft);
  const pick = (next: Mode) => {
    setMode(next);
    if (next === 'prompt') draft.start();
  };
  const ready = mode === 'surprise' || (mode === 'photo' && file !== null) || (mode === 'prompt' && !draft.loading && draft.prompt.trim().length > 0);
  const submit = () => onSubmit({ note: mode === 'prompt' ? draft.prompt : '', file: mode === 'photo' ? file : null });
  return (
    <Dialog open={open} onClose={() => !busy && onClose()} title="Create an avatar" description="A face that comes back in your posts. Pick how to make it.">
      <div className="space-y-5">
        <div role="radiogroup" aria-label="How to make the avatar" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {MODES.map((m) => <ModeCard key={m.id} icon={m.icon} label={m.label} hint={m.hint} selected={mode === m.id} onPick={() => pick(m.id)} />)}
        </div>
        {mode === 'surprise' && <p className="rounded-xl bg-app-sunken px-3 py-2 text-sm text-app-muted">We write a new person for your brand, different from your other faces.</p>}
        {mode === 'photo' && <PhotoPick file={file} onPick={setFile} onClear={() => setFile(null)} />}
        {mode === 'prompt' && <PromptField value={draft.prompt} loading={draft.loading} failed={draft.failed} onChange={draft.setPrompt} onRetry={() => void draft.retry()} />}
        <p className="text-xs text-app-muted">The photo takes about {FACE_SECONDS} seconds.</p>
        {error && <p role="alert" className="text-sm text-app-danger">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-full px-4 text-sm font-semibold text-app-muted transition hover:bg-app-sunken hover:text-app-ink active:scale-95 disabled:opacity-40">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy || !ready} className="inline-flex min-h-11 items-center justify-center rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95 disabled:opacity-40">
            {busy ? 'Starting…' : 'Create avatar'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
