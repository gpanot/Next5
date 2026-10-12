'use client';

import { useState, type FormEvent } from 'react';
import { MAX_AGE, MAX_NAME, MIN_AGE, type BrandCastMemberDto } from '../../../../types/admin/brandCast';
import { Dialog } from '../../../ui/Dialog';

export type MemberEdit = { name: string; age: number };

type Props = {
  member: BrandCastMemberDto | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (edit: MemberEdit) => void;
};

const field = 'w-full rounded-xl border border-app-line bg-app-panel px-3 py-2.5 text-base text-app-ink transition focus:border-app-ink focus:outline-none sm:text-sm';

/** "Maya, 28" → name and age. */
const split = (full: string) => {
  const [name = '', age = ''] = full.split(',').map((p) => p.trim());
  return { name, age };
};

/** "Edit name and age" from the ⋮ menu. The photo stays the same. Mount it with `key={member.id}`. */
export function EditMemberDialog({ member, busy, error, onClose, onSubmit }: Props) {
  const start = split(member?.name ?? '');
  const [name, setName] = useState(start.name);
  const [age, setAge] = useState(start.age);
  const ageNumber = Number(age);
  const valid = name.trim().length > 0 && Number.isInteger(ageNumber) && ageNumber >= MIN_AGE && ageNumber <= MAX_AGE;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid && !busy) onSubmit({ name: name.trim(), age: ageNumber });
  };
  return (
    <Dialog open={member !== null} onClose={() => !busy && onClose()} title="Edit name and age" description="The photo stays the same.">
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="block text-sm font-semibold text-app-ink">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value.replace(/,/g, '').slice(0, MAX_NAME))} autoComplete="off" className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className="block text-sm font-semibold text-app-ink">Age</span>
          <input
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 2))}
            inputMode="numeric"
            pattern="[0-9]*"
            className={field}
          />
          <span className="block text-xs text-app-muted">From {MIN_AGE} to {MAX_AGE}.</span>
        </label>
        {error && <p role="alert" className="text-sm text-app-danger">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-full px-4 text-sm font-semibold text-app-muted transition hover:bg-app-sunken hover:text-app-ink active:scale-95 disabled:opacity-40">
            Cancel
          </button>
          <button type="submit" disabled={busy || !valid} className="min-h-11 rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95 disabled:opacity-40">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
