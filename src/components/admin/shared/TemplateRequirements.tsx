'use client';

/**
 * What a template needs, shown wherever a template is recommended.
 *
 * A bare template name hides the work: "Warehouse tour" is a different proposition for a
 * supplier with a warehouse than for a realtor. Each requirement also says how it gets
 * satisfied, so an upload the business must find is never confused with a clip we generate.
 */
import type { AssetRequirementDto } from '../../../lib/contentTemplates';
import { FULFILMENT_LABELS } from '../../../lib/contentTemplates';

const TONE: Record<string, string> = {
  upload: 'bg-amber-100 text-amber-800',
  library: 'bg-slate-100 text-slate-700',
  generate: 'bg-emerald-100 text-emerald-800',
};

export function TemplateRequirements({
  assetRequirements,
  className = '',
}: {
  assetRequirements: readonly AssetRequirementDto[];
  className?: string;
}) {
  if (assetRequirements.length === 0) return null;
  const required = assetRequirements.filter((a) => a.required);
  const optional = assetRequirements.filter((a) => !a.required);

  return (
    <div className={className}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Needs</p>
      <div className="flex flex-wrap gap-1">
        {required.map((a) => (
          <span key={a.kind} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TONE[a.fulfilment]}`} title={a.notes ?? undefined}>
            {a.label} · {FULFILMENT_LABELS[a.fulfilment]}
          </span>
        ))}
        {optional.map((a) => (
          <span key={a.kind} className="rounded border border-dashed border-line px-1.5 py-0.5 text-[10px] text-muted" title={a.notes ?? undefined}>
            {a.label} (optional)
          </span>
        ))}
      </div>
    </div>
  );
}
