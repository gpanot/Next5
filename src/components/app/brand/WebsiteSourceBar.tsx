'use client';

import { Globe, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import type { ProductLineDto } from '../../../types/business/me';
import { AppButton } from '../../ui/AppButton';
import { TextInput } from '../../ui/TextInput';

type Props = {
  url: string | null;
  product: ProductLineDto | null;
  genState: string;
  onRefresh: () => void;
};

export const WebsiteSourceBar = ({ url, product, genState, onRefresh }: Props) => {
  const [editing, setEditing] = useState(!url);
  const [draft, setDraft] = useState(url ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const generating = genState === 'pending';

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) { setEditing(false); return; }
    // Basic URL validation
    try { new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`); } catch {
      setError('Enter a valid URL, e.g. https://yourbusiness.com'); return;
    }
    setSaving(true);
    setError('');
    try {
      await apiFetch('/api/app/workspace/voice', {
        method: 'PATCH',
        json: { product, websiteUrl: trimmed.startsWith('http') ? trimmed : `https://${trimmed}` },
      });
      setEditing(false);
      onRefresh(); // Trigger angle re-extraction
    } catch {
      setError('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const displayHost = (() => {
    try { return new URL(url?.startsWith('http') ? url : `https://${url}`).hostname; } catch { return url ?? ''; }
  })();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-app-line bg-app-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Globe aria-hidden className="h-4 w-4 shrink-0 text-app-muted" />
        <div className="flex flex-col gap-0.5">
          <p className="text-[12px] font-medium uppercase tracking-wide text-app-muted">Website brand source</p>
          {editing ? (
            <div className="flex items-center gap-2">
              <TextInput
                id="brand-url"
                type="url"
                autoComplete="url"
                placeholder="https://yourbusiness.com"
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') void save(); }}
                className="text-[13px]"
              />
              <AppButton size="sm" loading={saving} onClick={() => void save()}>Save</AppButton>
              {url && <AppButton size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(url); }}>Cancel</AppButton>}
            </div>
          ) : (
            <p className="text-[13px] text-app-ink">
              {url ? (
                <>
                  <span className="font-medium">{displayHost}</span>
                  {' '}
                  <button type="button" className="text-app-accent underline" onClick={() => setEditing(true)}>Change</button>
                </>
              ) : (
                <button type="button" className="text-app-accent underline" onClick={() => setEditing(true)}>Add your website</button>
              )}
            </p>
          )}
          {error && <p className="text-[12px] text-app-danger">{error}</p>}
        </div>
      </div>

      {url && !editing && (
        <AppButton
          size="sm"
          variant="ghost"
          loading={generating}
          onClick={onRefresh}
          className="shrink-0"
        >
          <RefreshCw aria-hidden className="h-3.5 w-3.5" />
          {generating ? 'Refreshing…' : 'Refresh from website'}
        </AppButton>
      )}
    </div>
  );
};
