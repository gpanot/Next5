'use client';

import { useState } from 'react';

type AdminLoginProps = { onToken: (t: string) => void };

export const AdminLogin = ({ onToken }: AdminLoginProps) => {
  const [secret, setSecret]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Authentication failed');
      onToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
        <p className="text-[9.5px] font-medium uppercase tracking-[0.18em] text-accent-strong">Next5</p>
        <h1 className="mt-2 font-display text-[28px] tracking-[0.06em] text-ink uppercase">Admin</h1>
        <p className="mt-1 text-[13px] text-muted">Enter your admin password to continue.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            type="password"
            placeholder="Admin password"
            value={secret}
            onChange={(e) => { setError(''); setSecret(e.target.value); }}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-[14px] text-ink outline-none placeholder:text-muted focus:border-ink"
          />
          {error && <p className="text-[12px] text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !secret}
            className="w-full rounded-xl bg-ink py-3 font-display text-[14px] tracking-[0.06em] text-white uppercase transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {loading ? 'Verifying…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
};
