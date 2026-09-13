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
    <div className="flex min-h-screen items-center justify-center bg-[#f8f7f5]">
      <div className="w-full max-w-sm rounded-2xl border border-[#e9e1d6] bg-white p-8 shadow-sm">
        <p className="text-[9.5px] font-medium uppercase tracking-[0.18em] text-[#c37d55]">Next5</p>
        <h1 className="mt-2 font-serif text-[28px] tracking-[0.06em] text-[#221f1c] uppercase">Admin</h1>
        <p className="mt-1 text-[13px] text-[#6e655c]">Enter your admin password to continue.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            type="password"
            placeholder="Admin password"
            value={secret}
            onChange={(e) => { setError(''); setSecret(e.target.value); }}
            className="w-full rounded-xl border border-[#e9e1d6] bg-[#fdfbf8] px-4 py-3 text-[14px] text-[#221f1c] outline-none placeholder:text-[#6e655c] focus:border-[#221f1c]"
          />
          {error && <p className="text-[12px] text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !secret}
            className="w-full rounded-xl bg-[#221f1c] py-3 font-serif text-[14px] tracking-[0.06em] text-white uppercase transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {loading ? 'Verifying…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
};
