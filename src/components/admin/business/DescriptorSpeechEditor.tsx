'use client';

/**
 * Inline editor for the speech fields of an AssetDescriptor.
 * Lets an admin fix memes whose speech was not extracted (hasSpeech=false,
 * empty transcript) by flipping the toggle and typing the transcript.
 */

import { useState } from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { patchDescriptorSpeech, type DescriptorRow } from './assetDescriptorTypes';

type Props = {
  token: string;
  row: DescriptorRow;
  onSaved: (row: DescriptorRow) => void;
};

function Label({ children }: { children: string }) {
  return (
    <span className="w-24 shrink-0 text-[9px] font-semibold uppercase tracking-wide text-subtle">{children}</span>
  );
}

function SpeechToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-line text-[10.5px]">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={[
            'min-h-[32px] px-3 transition-colors',
            value === v ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-muted hover:bg-surface-alt',
          ].join(' ')}
        >
          {String(v)}
        </button>
      ))}
    </div>
  );
}

export function DescriptorSpeechEditor({ token, row, onSaved }: Props) {
  const hasSpeech = row.descriptor?.hasSpeech ?? false;
  const transcript = row.descriptor?.transcript ?? '';
  const [editing, setEditing] = useState(false);
  const [draftSpeech, setDraftSpeech] = useState(hasSpeech);
  const [draftTranscript, setDraftTranscript] = useState(transcript);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setDraftSpeech(hasSpeech);
    setDraftTranscript(transcript);
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await patchDescriptorSpeech(token, row.id, {
        hasSpeech: draftSpeech,
        transcript: draftTranscript.trim() || null,
      });
      onSaved(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="group space-y-1.5">
        <div className="flex items-start gap-1.5">
          <Label>Has speech</Label>
          <span className="flex-1 text-[10.5px] text-ink">{String(hasSpeech)}</span>
          <button
            type="button"
            onClick={startEdit}
            aria-label="Edit speech"
            className="flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] text-muted transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>
        {transcript && (
          <div className="flex gap-1.5">
            <Label>Transcript</Label>
            <span className="flex-1 text-[10.5px] text-ink">&ldquo;{transcript}&rdquo;</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-line bg-surface p-2 shadow-sm">
      <div className="flex items-center gap-1.5">
        <Label>Has speech</Label>
        <SpeechToggle value={draftSpeech} onChange={setDraftSpeech} />
      </div>
      <div className="space-y-1">
        <Label>Transcript</Label>
        <textarea
          value={draftTranscript}
          onChange={(e) => setDraftTranscript(e.target.value)}
          rows={4}
          placeholder="What is said in the clip…"
          className="w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-[16px] text-ink outline-none transition-colors focus:border-ink sm:text-[11px]"
        />
      </div>
      {error && <p className="text-[10px] text-red-600">{error}</p>}
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="flex min-h-[32px] items-center gap-1 rounded-lg px-2.5 text-[11px] text-muted transition-colors hover:bg-surface-alt"
        >
          <X className="h-3 w-3" /> Cancel
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="flex min-h-[32px] items-center gap-1 rounded-lg bg-ink px-2.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-ink"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
        </button>
      </div>
    </div>
  );
}
