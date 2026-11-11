'use client';

import { useCallback, useState } from 'react';
import type { KallawayHooksResult } from '../../../lib/kallaway/types';
import { adminFetch } from '../business/useAdminApi';
import { eyebrowClass, primaryBtn, ToolPill } from '../scriptGenerator/ui';
import { FormulaCard } from './FormulaCard';
import { HookResults, HookResultsSkeleton } from './HookResults';

/** Admin › Kallaway › Hooks: paste a video plan, get its hook broken down + 3 variants built with the 6 power words. */
export function KallawayHooksTab({ token }: { token: string }) {
  const [plan, setPlan] = useState('');
  const [result, setResult] = useState<KallawayHooksResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const generate = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      setResult(await adminFetch<KallawayHooksResult>(token, '/api/admin/kallaway/hooks', { method: 'POST', body: JSON.stringify({ plan }) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }, [token, plan]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 rounded-2xl bg-app-sunken p-5 pb-10 md:p-8">
      <ToolPill />
      <div className="space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight text-app-ink md:text-5xl">Kallaway Hooks</h1>
        <p className="max-w-2xl text-base text-app-muted md:text-lg">Paste a video plan. See which power words your hook has, then get 3 variants to A/B test.</p>
      </div>
      <FormulaCard />
      <section className="space-y-3">
        <label htmlFor="kallaway-plan" className={eyebrowClass}>Video plan</label>
        <textarea
          id="kallaway-plan"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          rows={10}
          placeholder={'Hook (0-3s)\nMost creators lose people on slide one...\n\nProblem (3-12s)\n...\n\nPayoff (35-45s)\n...'}
          className="w-full rounded-2xl bg-app-panel p-4 text-sm text-app-ink shadow-sm ring-1 ring-transparent transition outline-none focus:ring-amber-400"
        />
        <div className="flex justify-end">
          <button type="button" onClick={() => void generate()} disabled={busy || plan.trim().length < 40} className={primaryBtn}>
            {busy ? 'Writing…' : result ? 'Regenerate hooks' : 'Get 3 hooks'}
          </button>
        </div>
      </section>
      {error && <p role="alert" className="text-sm text-app-danger">{error}</p>}
      {busy ? <HookResultsSkeleton /> : result ? <HookResults result={result} /> : (
        <p className="rounded-2xl border border-dashed border-app-line p-6 text-center text-sm text-app-muted">No hooks yet. Paste a plan and tap Get 3 hooks.</p>
      )}
    </div>
  );
}
