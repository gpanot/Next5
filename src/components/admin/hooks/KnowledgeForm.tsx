'use client';

import { useRef, useState, type FormEvent } from 'react';
import { KNOWLEDGE_FILE_TYPES, MAX_KNOWLEDGE_BODY_CHARS, MAX_KNOWLEDGE_TITLE_CHARS, type HookKnowledgeDto, type HookKnowledgeInput } from '../../../types/admin/hookKnowledge';

type Props = {
  /** The entry being edited; none for a new one. */
  entry?: HookKnowledgeDto;
  busy: boolean;
  onSave: (input: HookKnowledgeInput) => Promise<boolean>;
  onCancel?: () => void;
};

const field = 'w-full rounded-xl border border-line bg-white px-3 text-base text-ink placeholder:text-muted focus:border-ink/40 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100';

/** A note typed in, or a .md/.txt file read as text (its name becomes the title when there is none). */
export function KnowledgeForm({ entry, busy, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(entry?.title ?? '');
  const [body, setBody] = useState(entry?.body ?? '');
  const [fileName, setFileName] = useState<string | null>(entry?.fileName ?? null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    const text = await file.text();
    if (text.length > MAX_KNOWLEDGE_BODY_CHARS) setFileError(`Only the first ${MAX_KNOWLEDGE_BODY_CHARS.toLocaleString()} characters are kept.`);
    setBody(text.slice(0, MAX_KNOWLEDGE_BODY_CHARS));
    setFileName(file.name);
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, '').slice(0, MAX_KNOWLEDGE_TITLE_CHARS));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const saved = await onSave({ title: title.trim(), body: body.trim(), fileName });
    if (saved && !entry) {
      setTitle('');
      setBody('');
      setFileName(null);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={MAX_KNOWLEDGE_TITLE_CHARS} placeholder="Title, like “Hook formulas that work in October”" aria-label="Title" className={`${field} min-h-11`} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={MAX_KNOWLEDGE_BODY_CHARS} rows={8} placeholder="Paste hook formulas, examples, view counts, what changed this month…" aria-label="Text" className={`${field} resize-y py-2.5 font-mono text-sm`} />
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileInput} type="file" accept={KNOWLEDGE_FILE_TYPES} className="hidden" onChange={(e) => { void readFile(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" onClick={() => fileInput.current?.click()} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold text-ink transition hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900">
          {fileName ? `File: ${fileName}` : 'Upload .md or .txt'}
        </button>
        <span className="text-xs text-muted">{body.length.toLocaleString()} characters</span>
        <div className="ml-auto flex gap-2">
          {onCancel && <button type="button" onClick={onCancel} className="min-h-11 rounded-full px-4 text-sm font-semibold text-muted transition hover:text-ink dark:hover:text-zinc-100">Cancel</button>}
          <button type="submit" disabled={busy || !title.trim() || !body.trim()} className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900">
            {busy ? 'Saving…' : entry ? 'Save' : 'Add to knowledge'}
          </button>
        </div>
      </div>
      {fileError && <p className="text-xs text-amber-700 dark:text-amber-400">{fileError}</p>}
    </form>
  );
}
