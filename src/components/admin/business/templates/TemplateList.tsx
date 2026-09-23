'use client';

/** The library, left column. Grouped by pillar so related templates read together. */
import type { TemplateDto } from '../../../../lib/contentTemplates';

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  draft: 'bg-amber-100 text-amber-800',
  archived: 'bg-slate-200 text-slate-600',
};

const groupByPillar = (templates: readonly TemplateDto[]): [string, TemplateDto[]][] => {
  const groups = new Map<string, TemplateDto[]>();
  for (const t of templates) {
    const list = groups.get(t.pillarName) ?? [];
    list.push(t);
    groups.set(t.pillarName, list);
  }
  return [...groups.entries()];
};

export function TemplateList({
  templates,
  selectedId,
  onSelect,
}: {
  templates: readonly TemplateDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (templates.length === 0) {
    return <p className="px-3 py-6 text-[13px] text-muted">No templates yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {groupByPillar(templates).map(([pillar, rows]) => (
        <div key={pillar} className="flex flex-col gap-1">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-muted">{pillar}</p>
          {rows.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={[
                'flex flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors',
                selectedId === t.id ? 'border-ink bg-white' : 'border-transparent hover:bg-white',
              ].join(' ')}
            >
              <span className="flex items-center gap-2">
                <span className="truncate text-[13px] font-medium text-ink">
                  {t.legacyId ? `T${String(t.legacyId).padStart(2, '0')} · ` : ''}{t.name}
                </span>
                {t.workspaceId && (
                  <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-medium text-violet-800">override</span>
                )}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted">
                <span className={`rounded px-1.5 py-0.5 font-medium ${STATUS_TONE[t.status]}`}>{t.status}</span>
                <span>v{t.version}</span>
                <span>· {t.primaryPurpose}</span>
                <span>· {t.audience}</span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
