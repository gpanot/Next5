'use client';

/**
 * One template: its metadata, its current version's content, and the actions.
 *
 * Metadata saves in place — none of it changes what an already-generated plan renders. Content
 * saves as a new version. The two are separated on screen for that reason.
 */
import { useEffect, useState } from 'react';
import { requirementsSummary, type TemplateDto } from '../../../../lib/contentTemplates';
import {
  AUDIENCES, PLATFORMS, PURPOSES, STATUSES,
  archive, clone, listVersions, patchTemplate,
  type AdminWorkspace, type PillarDto, type VersionSummary,
} from './api';
import { useVersionDraft, VersionEditor } from './VersionEditor';

const input = 'w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12px] text-ink';
const label = 'mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted';
const button = 'rounded-full px-4 py-1.5 text-[12px] font-semibold transition-opacity disabled:opacity-40';

type Props = {
  token: string;
  template: TemplateDto;
  pillars: PillarDto[];
  workspaces: AdminWorkspace[];
  onSaved: (template: TemplateDto) => void;
};

export function TemplateDetail({ token, template, pillars, workspaces, onSaved }: Props) {
  const { draft, setDraft, dirty, reset } = useVersionDraft(template);
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overrideFor, setOverrideFor] = useState('');

  useEffect(() => {
    let cancelled = false;
    listVersions(token, template.id)
      .then((v) => !cancelled && setVersions(v))
      .catch(() => !cancelled && setVersions([]));
    return () => {
      cancelled = true;
    };
  }, [token, template.id]);

  const run = async (name: string, fn: () => Promise<TemplateDto>) => {
    setBusy(name);
    setError(null);
    try {
      onSaved(await fn());
      if (name === 'version') setVersions(await listVersions(token, template.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setBusy(null);
    }
  };

  const meta = (body: Record<string, unknown>) => run('meta', () => patchTemplate(token, template.id, body));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <input
            className="border-0 bg-transparent p-0 text-[18px] font-semibold text-ink focus:outline-none"
            defaultValue={template.name}
            onBlur={(e) => e.target.value !== template.name && meta({ name: e.target.value })}
          />
          <p className="font-mono text-[11px] text-muted">
            {template.slug} · v{template.version}
            {template.workspaceId ? ' · workspace override' : ' · global'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className={`${input} w-32`}
            value={template.status}
            onChange={(e) => meta({ status: e.target.value })}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            type="button"
            disabled={busy !== null || template.status === 'archived'}
            onClick={() => run('archive', () => archive(token, template.id))}
            className={`${button} border border-line text-muted hover:text-red-600`}
          >
            Archive
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run('duplicate', () => clone(token, template.id, { slug: `${template.slug}-copy-${Date.now().toString(36)}` }))}
            className={`${button} border border-line text-ink`}
          >
            Duplicate
          </button>
        </div>
      </header>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}

      {/* ── Metadata — saves in place ─────────────────────────────────── */}
      <section className="grid gap-3 rounded-xl border border-line bg-surface-alt p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className={label}>Pillar</p>
          <select className={input} value={template.pillarSlug} onChange={(e) => meta({ pillarSlug: e.target.value })}>
            {pillars.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <p className={label}>Format slug</p>
          <input className={input} defaultValue={template.formatSlug} onBlur={(e) => e.target.value !== template.formatSlug && meta({ formatSlug: e.target.value })} />
        </div>
        <div>
          <p className={label}>Audience</p>
          <select className={input} value={template.audience} onChange={(e) => meta({ audience: e.target.value })}>
            {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <p className={label}>Primary purpose</p>
          <select className={input} value={template.primaryPurpose} onChange={(e) => meta({ primaryPurpose: e.target.value })}>
            {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <p className={label}>Also serves</p>
          <div className="flex flex-wrap gap-1.5">
            {PURPOSES.map((p) => {
              const on = template.purposes.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => meta({ purposes: on ? template.purposes.filter((x) => x !== p) : [...template.purposes, p] })}
                  className={`rounded-full px-2.5 py-1 text-[11px] ${on ? 'bg-ink text-white' : 'border border-line text-muted'}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className={label}>Channels</p>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => {
              const on = template.platforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => meta({ platforms: on ? template.platforms.filter((x) => x !== p) : [...template.platforms, p] })}
                  className={`rounded-full px-2.5 py-1 text-[11px] ${on ? 'bg-ink text-white' : 'border border-line text-muted'}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <p className="text-[12px] text-muted">{requirementsSummary(template.assetRequirements)}</p>

      {/* ── Content — saves as a new version ──────────────────────────── */}
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-ink">Content · version {template.version}</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={!dirty} onClick={reset} className={`${button} border border-line text-muted`}>
              Discard
            </button>
            <button
              type="button"
              disabled={!dirty || busy !== null}
              onClick={() => run('version', () => patchTemplate(token, template.id, { version: { ...draft, hookPattern: draft.hookPattern || ' ' }, primaryPurpose: template.primaryPurpose, purposes: template.purposes }))}
              className={`${button} bg-ink text-white`}
            >
              {busy === 'version' ? 'Saving…' : `Save as version ${template.version + 1}`}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-muted">
          Editing content never changes version {template.version}. Campaigns already generated against it keep rendering it.
        </p>
        <VersionEditor draft={draft} onChange={setDraft} />
      </section>

      {/* ── Override + history ────────────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        {!template.workspaceId && (
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-alt p-4">
            <p className="text-[13px] font-semibold text-ink">Workspace override</p>
            <p className="text-[11px] text-muted">A copy for one business. It replaces this template for them — the matcher never proposes both.</p>
            <div className="flex gap-2">
              <select className={input} value={overrideFor} onChange={(e) => setOverrideFor(e.target.value)}>
                <option value="">Choose a workspace…</option>
                {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name} · {w.email}</option>)}
              </select>
              <button
                type="button"
                disabled={!overrideFor || busy !== null}
                onClick={() => run('override', () => clone(token, template.id, { workspaceId: overrideFor }))}
                className={`${button} shrink-0 bg-ink text-white`}
              >
                Clone
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-alt p-4">
          <p className="text-[13px] font-semibold text-ink">Version history</p>
          {versions.length === 0 && <p className="text-[11px] text-muted">Loading…</p>}
          {versions.map((v) => (
            <div key={v.id} className="flex items-baseline gap-2 text-[11px]">
              <span className={`font-mono ${v.active ? 'font-semibold text-ink' : 'text-muted'}`}>v{v.version}</span>
              {v.active && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-800">active</span>}
              <span className="truncate text-muted">{v.hookPattern}</span>
              <span className="ml-auto shrink-0 text-muted">{v.createdAt.slice(0, 10)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
