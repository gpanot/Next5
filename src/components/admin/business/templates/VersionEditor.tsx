'use client';

/**
 * Edits the *content* of a template: hook, beats, slides, keywords, variables, assets.
 *
 * Saving here never edits the current version — it writes a new one. That is the whole point of
 * the versioning rule, so the button says so rather than saying "Save".
 */
import { useState } from 'react';
import type { TemplateDto } from '../../../../lib/contentTemplates';
import { ASSET_KINDS, FULFILMENTS, VARIABLE_SOURCES, VARIABLE_TYPES } from './api';

type Beat = { label: string; guidance: string };
type Slide = { text: string; bgPrompt: string };
type Variable = TemplateDto['variables'][number];
type AssetReq = TemplateDto['assetRequirements'][number];

export type VersionDraft = {
  hookPattern: string;
  beats: Beat[];
  suggestedSlides: Slide[];
  keywords: string[];
  variables: (Variable & { position: number })[];
  assetRequirements: AssetReq[];
};

export const draftFrom = (template: TemplateDto): VersionDraft => ({
  hookPattern: template.hookPattern,
  beats: template.beats.map((b) => ({ label: b.label, guidance: b.guidance })),
  suggestedSlides: template.suggestedSlides.map((s) => ({ text: s.text, bgPrompt: s.bgPrompt })),
  keywords: [...template.keywords],
  variables: template.variables.map((v, position) => ({ ...v, position })),
  assetRequirements: template.assetRequirements.map((a) => ({ ...a })),
});

const input = 'w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12px] text-ink';
const label = 'mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted';

const RowActions = ({ onRemove }: { onRemove: () => void }) => (
  <button type="button" onClick={onRemove} className="shrink-0 px-2 text-[16px] leading-none text-muted hover:text-red-600" aria-label="Remove">
    ×
  </button>
);

const AddButton = ({ onClick, children }: { onClick: () => void; children: string }) => (
  <button type="button" onClick={onClick} className="self-start rounded-lg border border-dashed border-line px-2.5 py-1 text-[11px] text-muted hover:border-ink hover:text-ink">
    {children}
  </button>
);

export function VersionEditor({
  draft,
  onChange,
}: {
  draft: VersionDraft;
  onChange: (next: VersionDraft) => void;
}) {
  const set = <K extends keyof VersionDraft>(key: K, value: VersionDraft[K]) => onChange({ ...draft, [key]: value });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className={label}>Hook pattern</p>
        <input className={input} value={draft.hookPattern} onChange={(e) => set('hookPattern', e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={label}>Structure beats</p>
        {draft.beats.map((beat, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              className={`${input} w-40 shrink-0`}
              value={beat.label}
              placeholder="Hook"
              onChange={(e) => set('beats', draft.beats.map((b, j) => (i === j ? { ...b, label: e.target.value } : b)))}
            />
            <input
              className={input}
              value={beat.guidance}
              placeholder="What happens in this beat"
              onChange={(e) => set('beats', draft.beats.map((b, j) => (i === j ? { ...b, guidance: e.target.value } : b)))}
            />
            <RowActions onRemove={() => set('beats', draft.beats.filter((_, j) => j !== i))} />
          </div>
        ))}
        <AddButton onClick={() => set('beats', [...draft.beats, { label: '', guidance: '' }])}>+ Beat</AddButton>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={label}>Suggested slides</p>
        {draft.suggestedSlides.map((slide, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <div className="flex flex-1 flex-col gap-1">
              <input
                className={input}
                value={slide.text}
                placeholder="Slide text"
                onChange={(e) => set('suggestedSlides', draft.suggestedSlides.map((s, j) => (i === j ? { ...s, text: e.target.value } : s)))}
              />
              <input
                className={input}
                value={slide.bgPrompt}
                placeholder="Background prompt — end with 9:16 vertical, no text"
                onChange={(e) => set('suggestedSlides', draft.suggestedSlides.map((s, j) => (i === j ? { ...s, bgPrompt: e.target.value } : s)))}
              />
            </div>
            <RowActions onRemove={() => set('suggestedSlides', draft.suggestedSlides.filter((_, j) => j !== i))} />
          </div>
        ))}
        <AddButton onClick={() => set('suggestedSlides', [...draft.suggestedSlides, { text: '', bgPrompt: '' }])}>+ Slide</AddButton>
      </div>

      <div>
        <p className={label}>Hook keywords — how a researched TikTok matches this template</p>
        <input
          className={input}
          value={draft.keywords.join(', ')}
          onChange={(e) => set('keywords', e.target.value.split(',').map((k) => k.trim()).filter(Boolean))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={label}>Variables</p>
        {draft.variables.map((v, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              className={`${input} w-44 shrink-0 font-mono`}
              value={v.key}
              placeholder="SERVICE_PROVIDER"
              onChange={(e) => set('variables', draft.variables.map((x, j) => (i === j ? { ...x, key: e.target.value, label: e.target.value } : x)))}
            />
            <select className={`${input} w-24 shrink-0`} value={v.type} onChange={(e) => set('variables', draft.variables.map((x, j) => (i === j ? { ...x, type: e.target.value as Variable['type'] } : x)))}>
              {VARIABLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className={`${input} w-28 shrink-0`} value={v.source} onChange={(e) => set('variables', draft.variables.map((x, j) => (i === j ? { ...x, source: e.target.value as Variable['source'] } : x)))}>
              {VARIABLE_SOURCES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="flex shrink-0 items-center gap-1 text-[11px] text-muted">
              <input type="checkbox" checked={v.required} onChange={(e) => set('variables', draft.variables.map((x, j) => (i === j ? { ...x, required: e.target.checked } : x)))} />
              required
            </label>
            <input
              className={input}
              value={v.hint ?? ''}
              placeholder="Example, e.g. mechanic, electrician"
              onChange={(e) => set('variables', draft.variables.map((x, j) => (i === j ? { ...x, hint: e.target.value || null } : x)))}
            />
            <RowActions onRemove={() => set('variables', draft.variables.filter((_, j) => j !== i))} />
          </div>
        ))}
        <AddButton onClick={() => set('variables', [...draft.variables, { key: '', label: '', type: 'text', source: 'campaign', required: true, defaultValue: null, hint: null, position: draft.variables.length }])}>
          + Variable
        </AddButton>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={label}>Asset requirements — what a recommendation of this template will show</p>
        {draft.assetRequirements.map((a, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <select className={`${input} w-48 shrink-0`} value={a.kind} onChange={(e) => set('assetRequirements', draft.assetRequirements.map((x, j) => (i === j ? { ...x, kind: e.target.value as AssetReq['kind'] } : x)))}>
              {ASSET_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <input
              type="number"
              min={1}
              className={`${input} w-16 shrink-0`}
              value={a.minCount}
              onChange={(e) => set('assetRequirements', draft.assetRequirements.map((x, j) => (i === j ? { ...x, minCount: Math.max(1, Number(e.target.value)) } : x)))}
            />
            <select className={`${input} w-28 shrink-0`} value={a.fulfilment} onChange={(e) => set('assetRequirements', draft.assetRequirements.map((x, j) => (i === j ? { ...x, fulfilment: e.target.value as AssetReq['fulfilment'] } : x)))}>
              {FULFILMENTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <label className="flex shrink-0 items-center gap-1 text-[11px] text-muted">
              <input type="checkbox" checked={a.required} onChange={(e) => set('assetRequirements', draft.assetRequirements.map((x, j) => (i === j ? { ...x, required: e.target.checked } : x)))} />
              required
            </label>
            <input
              className={input}
              value={a.notes ?? ''}
              placeholder="What the shot has to show"
              onChange={(e) => set('assetRequirements', draft.assetRequirements.map((x, j) => (i === j ? { ...x, notes: e.target.value || null } : x)))}
            />
            <RowActions onRemove={() => set('assetRequirements', draft.assetRequirements.filter((_, j) => j !== i))} />
          </div>
        ))}
        <AddButton onClick={() => set('assetRequirements', [...draft.assetRequirements, { kind: 'product_footage', required: true, minCount: 1, fulfilment: 'upload', notes: null, label: '' }])}>
          + Asset requirement
        </AddButton>
      </div>
    </div>
  );
}

/** Local draft state plus a dirty flag, so "Save as new version" can stay disabled until it matters. */
export const useVersionDraft = (template: TemplateDto) => {
  const [draft, setDraft] = useState<VersionDraft>(() => draftFrom(template));
  const [baseId, setBaseId] = useState(template.versionId);

  if (baseId !== template.versionId) {
    setBaseId(template.versionId);
    setDraft(draftFrom(template));
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFrom(template));
  return { draft, setDraft, dirty, reset: () => setDraft(draftFrom(template)) };
};
