'use client';

/**
 * "B2B No Website" profile form: the company profile typed by hand (instead of a crawl) plus
 * product photos. Every field the engine sends to the LLM is required; save is blocked until
 * they are filled. Saving reads the new photos with a vision model, then builds the deck.
 */

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { MANUAL_SECTIONS, MANUAL_TONES, type ManualField } from '../../../../lib/manualProfile';
import type { BlitzAssetDto } from '../api';
import { ProductPhotosField } from './ProductPhotosField';
import { useManualBusiness, type ManualFormValues } from './useManualBusiness';

type Props = {
  runId: string | null;
  onSaved: (runId: string) => void;
  onUploaded: (asset: BlitzAssetDto) => void;
};

const inputClass =
  'w-full rounded-xl border bg-white px-3 py-2.5 text-[14px] text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-ink/20 dark:bg-white/5 dark:text-white sm:text-[13px]';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-5">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

function FieldInput({ field, value, invalid, onChange }: {
  field: ManualField; value: string; invalid: boolean; onChange: (v: string) => void;
}) {
  const border = invalid ? 'border-red-400 dark:border-red-500' : 'border-line dark:border-white/15';
  const id = `manual-${field.key}`;
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-ink dark:text-white">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </span>
      {field.multiline || field.list ? (
        <textarea id={id} rows={field.list ? 3 : 2} value={value} placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)} className={`${inputClass} ${border} resize-y`} />
      ) : (
        <input id={id} type="text" value={value} placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)} className={`${inputClass} ${border}`} />
      )}
      {invalid ? (
        <span className="text-[11px] text-red-600 dark:text-red-400">Required</span>
      ) : field.help ? (
        <span className="text-[11px] text-muted">{field.help}</span>
      ) : null}
    </label>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      {[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-surface-alt dark:bg-white/5" />)}
    </div>
  );
}

export function ManualProfileForm({ runId, onSaved, onUploaded }: Props) {
  const form = useManualBusiness(runId, onUploaded);
  const { values, setField, missing, showMissing, photos } = form;

  if (form.loading) return <FormSkeleton />;
  if (form.loadError) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {form.loadError}
      </div>
    );
  }

  const isMissing = (f: ManualField) => showMissing && f.required && missing.includes(f.label);
  const handleSave = async () => {
    const id = await form.save();
    if (id) onSaved(id);
  };

  return (
    <div className="flex flex-col gap-4">
      {MANUAL_SECTIONS.map((section) => (
        <Card key={section.title} title={section.title}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {section.fields.map((f) => (
              <div key={f.key} className={f.multiline || f.list ? 'md:col-span-2' : undefined}>
                <FieldInput field={f} value={values[f.key]} invalid={isMissing(f)}
                  onChange={(v) => setField(f.key as keyof ManualFormValues, v)} />
              </div>
            ))}
            {section.title === 'Customers' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-ink dark:text-white">Tone <span className="text-red-500">*</span></span>
                <select value={values.tone} onChange={(e) => setField('tone', e.target.value)}
                  className={`${inputClass} border-line capitalize dark:border-white/15`}>
                  {MANUAL_TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
            )}
          </div>
        </Card>
      ))}

      <Card title="Product photos">
        <ProductPhotosField photos={photos.photos} onAddFiles={photos.addFiles} onRemove={photos.remove} />
      </Card>

      {form.saveError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {form.saveError}
        </div>
      )}
      {showMissing && missing.length > 0 && (
        <p className="text-[12px] text-red-600 dark:text-red-400">Fill in: {missing.join(', ')}.</p>
      )}

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-line bg-white/90 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-black/60 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={form.saving || photos.uploading}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-[14px] font-medium text-white transition-all hover:bg-ink/90 active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:text-[13px]"
        >
          {form.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {form.saving ? (photos.photos.some((p) => !p.description) ? 'Reading photos…' : 'Saving…')
            : photos.uploading ? 'Uploading photos…' : 'Save & build videos'}
        </button>
      </div>
    </div>
  );
}
