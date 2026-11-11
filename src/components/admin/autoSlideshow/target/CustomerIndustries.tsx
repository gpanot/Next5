'use client';

import { useState } from 'react';
import { MAX_CUSTOMER_INDUSTRIES, type CustomerIndustriesDto } from '../../../../lib/customerIndustries';
import { ClientTypesField } from './ClientTypesField';
import { useClientTypesDraft } from './useClientTypesDraft';
import { useCustomerIndustries } from './useCustomerIndustries';

const errorClass = 'rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300';

type FormProps = { saved: CustomerIndustriesDto; saving: boolean; saveError: string | null; save: (industries: string[]) => Promise<boolean>; onSaved?: () => void };

/** The field; Save shows only after a change. */
function IndustriesForm({ saved, saving, saveError, save, onSaved }: FormProps) {
  const draft = useClientTypesDraft(saved.industries);
  const [done, setDone] = useState(false);
  const onSave = async () => {
    if (draft.tooMany) return;
    const ok = await save(draft.final());
    setDone(ok);
    if (ok) {
      draft.reset();
      onSaved?.();
    }
  };
  return (
    <div className="space-y-2">
      <ClientTypesField draft={draft} suggestions={saved.suggestions} />
      {saveError && <p role="alert" className={errorClass}>{saveError}</p>}
      {draft.changed && (
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving || draft.tooMany}
          className="min-h-11 rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      )}
      {done && !draft.changed && <p className="text-xs text-app-muted">Saved. Your next videos and slideshows speak to these clients.</p>}
    </div>
  );
}

/** "Client types" under "Your main client": who posts speak to, read from the website and editable. */
export function CustomerIndustries({ token, workspaceId, onSaved }: { token: string; workspaceId: string; onSaved?: () => void }) {
  const { data, loading, loadError, saving, saveError, save } = useCustomerIndustries(token, workspaceId);
  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <h3 className="text-xs font-semibold text-ink dark:text-zinc-100">Client types</h3>
        <p className="text-sm text-app-muted">Your posts speak to them. Up to {MAX_CUSTOMER_INDUSTRIES}.</p>
      </div>
      {loading && <div aria-busy="true" aria-label="Loading your client types" className="h-11 animate-pulse rounded-xl bg-app-sunken" />}
      {!loading && loadError && <p role="alert" className={errorClass}>{loadError}</p>}
      {data && !data.ready && <p className="rounded-xl border border-dashed border-app-line p-3 text-sm text-app-muted">We fill this in after we read your website.</p>}
      {data?.ready && <IndustriesForm saved={data} saving={saving} saveError={saveError} save={save} onSaved={onSaved} />}
    </div>
  );
}
