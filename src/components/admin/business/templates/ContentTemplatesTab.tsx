'use client';

/**
 * Templates — the internal editor for the Phase 0B content library.
 *
 * Not customer-facing. Self-serve template editing for business users is a later extension; the
 * only thing stopping it today is that these routes sit behind the admin token, which is where
 * that check belongs.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TemplateDto } from '../../../../lib/contentTemplates';
import {
  createTemplate, listAllTemplates, listPillars, listWorkspaces,
  type AdminWorkspace, type PillarDto,
} from './api';
import { TemplateDetail } from './TemplateDetail';
import { TemplateList } from './TemplateList';

type Filter = 'all' | 'active' | 'draft' | 'archived' | 'override';

const FILTERS: Filter[] = ['all', 'active', 'draft', 'archived', 'override'];

const matchesFilter = (t: TemplateDto, filter: Filter): boolean =>
  filter === 'all' || (filter === 'override' ? t.workspaceId !== null : t.status === filter);

const newTemplateBody = (pillarSlug: string) => {
  const stamp = Date.now().toString(36);
  return {
    slug: `new-template-${stamp}`,
    name: 'New template',
    pillarSlug,
    formatSlug: 'untitled',
    audience: 'both',
    platforms: ['tiktok', 'instagram'],
    purposes: ['awareness'],
    primaryPurpose: 'awareness',
    status: 'draft',
    version: {
      hookPattern: '',
      beats: [{ label: 'Hook', guidance: '' }],
      suggestedSlides: [],
      keywords: [],
      variables: [],
      assetRequirements: [],
    },
  };
};

export function ContentTemplatesTab({ token }: { token: string }) {
  const [templates, setTemplates] = useState<TemplateDto[] | null>(null);
  const [pillars, setPillars] = useState<PillarDto[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(
    () =>
      listAllTemplates(token)
        .then(setTemplates)
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Could not load the library.');
          setTemplates([]);
        }),
    [token],
  );

  useEffect(() => {
    listAllTemplates(token)
      .then(setTemplates)
      .catch(() => setTemplates([]));
    listPillars(token).then(setPillars).catch(() => setPillars([]));
    listWorkspaces(token).then(setWorkspaces).catch(() => setWorkspaces([]));
  }, [token]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (templates ?? []).filter(
      (t) => matchesFilter(t, filter) && (!term || t.name.toLowerCase().includes(term) || t.slug.includes(term)),
    );
  }, [templates, filter, search]);

  const selected = (templates ?? []).find((t) => t.id === selectedId) ?? null;

  const onSaved = (saved: TemplateDto) => {
    setTemplates((prev) => {
      const list = prev ?? [];
      return list.some((t) => t.id === saved.id)
        ? list.map((t) => (t.id === saved.id ? saved : t))
        : [...list, saved];
    });
    setSelectedId(saved.id);
    // A clone or an override is a new row the list has to learn about in its proper order.
    void reload();
  };

  const create = async () => {
    const pillar = pillars[0];
    if (!pillar) return;
    setCreating(true);
    try {
      onSaved(await createTemplate(token, newTemplateBody(pillar.slug)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the template.');
    } finally {
      setCreating(false);
    }
  };

  if (templates === null) return <p className="text-[13px] text-muted">Loading the library…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Templates</h1>
          <p className="text-[12px] text-muted">
            {templates.filter((t) => t.status === 'active').length} active of {templates.length} · what the campaign matcher proposes from
          </p>
        </div>
        <button
          type="button"
          onClick={create}
          disabled={creating || pillars.length === 0}
          className="rounded-full bg-ink px-4 py-1.5 text-[12px] font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {creating ? 'Creating…' : 'New template'}
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[19rem_1fr]">
        <aside className="flex flex-col gap-3 rounded-xl border border-line bg-surface-alt p-3">
          <input
            className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12px] text-ink"
            placeholder="Search templates"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-2.5 py-1 text-[11px] ${filter === f ? 'bg-ink text-white' : 'border border-line text-muted'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            <TemplateList templates={visible} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </aside>

        <section>
          {selected ? (
            <TemplateDetail
              key={selected.id}
              token={token}
              template={selected}
              pillars={pillars}
              workspaces={workspaces}
              onSaved={onSaved}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-[13px] text-muted">
              Pick a template to edit it.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
