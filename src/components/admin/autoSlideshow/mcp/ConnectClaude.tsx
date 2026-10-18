'use client';

import { CalendarCheck, Lightbulb, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppButton } from '../../../ui/AppButton';
import { BusinessLogo } from '../../../marketing/shared/MarketingHeader';
import { SkeletonText } from '../../../ui/Skeleton';
import { SLIDESHOW_HOME } from '../workspace/WorkspaceContext';

type Workspace = { id: string; name: string; websiteUrl: string | null };
type Info = { clientName: string; email: string; redirectHost: string; workspaces: Workspace[] };
type Load = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; info: Info };

/** The query Claude opened /oauth/authorize with (the sign-in link's own `token` is not part of it). */
const oauthQuery = (): URLSearchParams => {
  const q = new URLSearchParams(window.location.search);
  q.delete('token');
  return q;
};

const errorOf = async (res: Response | null): Promise<string> => {
  const body = res ? ((await res.json().catch(() => null)) as { message?: string } | null) : null;
  return body?.message ?? 'Could not reach Next5. Check your connection and try again.';
};

const CAN = [
  { icon: Lightbulb, text: 'See and write post ideas for your calendar' },
  { icon: CalendarCheck, text: 'Put the ideas you pick on your calendar (1 credit each, as in the app)' },
  { icon: ShieldCheck, text: 'Never publish: every post still waits for your approval in Next5' },
];

/** Claude's consent screen: which workspace it plans for, what it can do, Allow or Cancel. */
export function ConnectClaude({ token }: { token: string }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [sending, setSending] = useState<'allow' | 'deny' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/oauth/authorize?${oauthQuery().toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .catch(() => null)
      .then(async (res) => {
        if (cancelled) return;
        if (!res?.ok) return setLoad({ state: 'error', message: await errorOf(res) });
        const info = (await res.json()) as Info;
        setLoad({ state: 'ready', info });
        setWorkspaceId(info.workspaces[0]?.id ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const answer = async (approve: boolean) => {
    setSending(approve ? 'allow' : 'deny');
    setError(null);
    const body = { ...Object.fromEntries(oauthQuery()), workspaceId, approve };
    const res = await fetch('/api/oauth/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) {
      setSending(null);
      return setError(await errorOf(res));
    }
    const { redirectTo } = (await res.json()) as { redirectTo: string };
    window.location.assign(redirectTo);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12">
      <BusinessLogo href={SLIDESHOW_HOME} />
      <div className="w-full max-w-sm rounded-2xl border border-app-line bg-app-panel p-6 shadow-sm sm:p-8">
        {load.state === 'loading' && <SkeletonText lines={5} />}
        {load.state === 'error' && (
          <div role="alert" className="flex flex-col gap-2">
            <h1 className="text-[20px] font-semibold text-app-ink">Can’t connect Claude</h1>
            <p className="text-[14px] text-app-muted">{load.message}</p>
          </div>
        )}
        {load.state === 'ready' && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-[22px] font-semibold text-app-ink">Connect {load.info.clientName} to Next5</h1>
              <p className="mt-1 text-[14px] text-app-muted">Signed in as <span className="font-medium text-app-ink">{load.info.email}</span>. You’ll go back to {load.info.redirectHost}.</p>
            </div>
            {load.info.workspaces.length === 0 ? (
              <p className="text-[14px] text-app-muted">Add your website in Next5 first, then connect Claude.</p>
            ) : (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-[13px] font-medium text-app-ink">Plan posts for</legend>
                {load.info.workspaces.map((w) => (
                  <label key={w.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-app-line px-3 py-2 has-[:checked]:border-app-cta">
                    <input type="radio" name="workspace" value={w.id} checked={workspaceId === w.id} onChange={() => setWorkspaceId(w.id)} />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-app-ink">{w.name}</span>
                      {w.websiteUrl && <span className="block truncate text-[12px] text-app-muted">{w.websiteUrl.replace(/^https?:\/\//, '')}</span>}
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            <ul className="flex flex-col gap-2.5">
              {CAN.map(({ icon: Icon, text }) => (
                <li key={text} className="flex gap-2.5 text-[13px] text-app-ink">
                  <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
                  {text}
                </li>
              ))}
            </ul>
            {error && <p role="alert" className="text-[13px] text-app-danger">{error}</p>}
            <div className="flex flex-col gap-2">
              <AppButton size="lg" fullWidth disabled={!workspaceId || sending !== null} loading={sending === 'allow'} onClick={() => void answer(true)}>Allow</AppButton>
              <AppButton size="lg" variant="ghost" fullWidth disabled={sending !== null} loading={sending === 'deny'} onClick={() => void answer(false)}>Cancel</AppButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
