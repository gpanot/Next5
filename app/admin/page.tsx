'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  booking_count: number;
  photo_count: number;
  last_booking: { route_title: string; payment_status: string; created_at: string } | null;
};

type AdminBooking = {
  id: string;
  route_id: string;
  route_title: string;
  director_name: string;
  feelings: string[];
  goals: string[];
  amount_vnd: number | null;
  discount_percent: number | null;
  payment_status: string;
  shoot_status: string;
  photo_count: number;
  created_at: string;
  user_email: string | null;
  photos: { id: string; type: string; scene_index: number | null; url: string | null }[];
};

type AdminPrompt = {
  id: string;
  route_id: string;
  scene_index: number;
  prompt: string;
  is_active: boolean;
  updated_at: string;
};

type Tab = 'users' | 'bookings' | 'prompts';

const ADMIN_TOKEN_KEY = 'admin_token';

const ROUTE_LABELS: Record<string, string> = {
  'golden-saigon': 'Golden Saigon',
  'soft-girl-saigon': 'Soft Girl Saigon',
  'night-out': 'Night Out',
  'luxury-saigon': 'Luxury Saigon',
  'outfit-shoot': 'Outfit Shoot',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtVnd(v: number | null) {
  if (v == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ value, map }: { value: string; map: Record<string, { label: string; color: string }> }) {
  const cfg = map[value] ?? { label: value, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

const PAYMENT_BADGE: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'bg-amber-50  text-amber-700'  },
  paid:      { label: 'Paid',      color: 'bg-blue-50   text-blue-700'   },
  confirmed: { label: 'Confirmed', color: 'bg-green-50  text-green-700'  },
};

const SHOOT_BADGE: Record<string, { label: string; color: string }> = {
  preview_generating: { label: 'Preview…',  color: 'bg-yellow-50 text-yellow-700' },
  preview_ready:      { label: 'Preview ✓', color: 'bg-blue-50   text-blue-700'   },
  creating:           { label: 'Creating…', color: 'bg-purple-50 text-purple-700' },
  delivered:          { label: 'Delivered', color: 'bg-green-50  text-green-700'  },
  error:              { label: 'Error',     color: 'bg-red-50    text-red-700'    },
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('bookings');

  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (stored) {
      try {
        const payload = JSON.parse(atob(stored.split('.')[1]));
        if (payload.type === 'admin') setToken(stored);
        else localStorage.removeItem(ADMIN_TOKEN_KEY);
      } catch {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
      }
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
  }, []);

  if (!token) {
    return <LoginScreen onToken={(t) => { localStorage.setItem(ADMIN_TOKEN_KEY, t); setToken(t); }} />;
  }

  return (
    <div className="min-h-screen bg-[#f8f7f5]">
      {/* Header */}
      <header className="border-b border-[#e9e1d6] bg-white px-6 py-3.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-[20px] tracking-[0.12em] text-[#221f1c] uppercase">Next5</span>
            <span className="rounded-full bg-[#221f1c] px-2 py-0.5 text-[9px] font-medium tracking-widest text-white uppercase">Admin</span>
          </div>
          <button onClick={logout} className="text-[12px] text-[#6e655c] hover:text-[#221f1c]">Sign out</button>
        </div>
      </header>

      {/* Tab nav */}
      <div className="border-b border-[#e9e1d6] bg-white px-6">
        <div className="mx-auto flex max-w-7xl gap-1">
          {(['bookings', 'users', 'prompts'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-[13px] font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-[#221f1c] text-[#221f1c]'
                  : 'border-transparent text-[#6e655c] hover:text-[#221f1c]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {tab === 'users'    && <UsersTab    token={token} />}
        {tab === 'bookings' && <BookingsTab token={token} />}
        {tab === 'prompts'  && <PromptsTab  token={token} />}
      </main>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────

function LoginScreen({ onToken }: { onToken: (t: string) => void }) {
  const [secret, setSecret] = useState('');
  const [error, setError]   = useState('');
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
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab({ token }: { token: string }) {
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;
  if (error)   return <ErrMsg msg={error} />;

  return (
    <div>
      <SectionHeader title="Users" count={users.length} />
      <div className="rounded-2xl border border-[#e9e1d6] bg-white overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#e9e1d6] bg-[#fdfbf8] text-left text-[10px] uppercase tracking-[0.12em] text-[#6e655c]">
              <Th>Email</Th>
              <Th>Bookings</Th>
              <Th>Photos</Th>
              <Th>Last Shoot</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className={`border-b border-[#e9e1d6] last:border-0 ${i % 2 === 1 ? 'bg-[#fdfbf8]' : ''}`}>
                <Td className="font-medium text-[#221f1c]">{u.email}</Td>
                <Td>{u.booking_count}</Td>
                <Td>{u.photo_count}</Td>
                <Td>{u.last_booking?.route_title ?? '—'}</Td>
                <Td>
                  {u.last_booking ? (
                    <StatusBadge value={u.last_booking.payment_status} map={PAYMENT_BADGE} />
                  ) : '—'}
                </Td>
                <Td className="text-[#6e655c]">{fmtDate(u.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <EmptyRow msg="No users yet." />}
      </div>
    </div>
  );
}

// ── Bookings tab ──────────────────────────────────────────────────────────────

function BookingsTab({ token }: { token: string }) {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/bookings', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings ?? []))
      .catch(() => setError('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;
  if (error)   return <ErrMsg msg={error} />;

  const totalRevenue = bookings
    .filter((b) => b.payment_status === 'confirmed')
    .reduce((s, b) => s + (b.amount_vnd ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total bookings"  value={String(bookings.length)} />
        <KpiCard label="Confirmed"       value={String(bookings.filter((b) => b.payment_status === 'confirmed').length)} />
        <KpiCard label="Delivered"       value={String(bookings.filter((b) => b.shoot_status === 'delivered').length)} />
        <KpiCard label="Revenue (VND)"   value={fmtVnd(totalRevenue)} />
      </div>

      <SectionHeader title="Bookings" count={bookings.length} />

      <div className="rounded-2xl border border-[#e9e1d6] bg-white overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#e9e1d6] bg-[#fdfbf8] text-left text-[10px] uppercase tracking-[0.12em] text-[#6e655c]">
              <Th>ID</Th>
              <Th>Studio</Th>
              <Th>Customer</Th>
              <Th>Payment</Th>
              <Th>Shoot</Th>
              <Th>Amount</Th>
              <Th>Photos</Th>
              <Th>Date</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b, i) => (
              <>
                <tr
                  key={b.id}
                  className={`border-b border-[#e9e1d6] cursor-pointer hover:bg-[#fdfbf8] ${i % 2 === 1 ? 'bg-[#fdfbf8]' : ''} ${expanded === b.id ? 'bg-[#fdf9f5]' : ''}`}
                  onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                >
                  <Td className="font-mono text-[11px] text-[#6e655c]">{b.id}</Td>
                  <Td className="font-medium text-[#221f1c]">{b.route_title}</Td>
                  <Td className="text-[#6e655c]">{b.user_email ?? '—'}</Td>
                  <Td><StatusBadge value={b.payment_status} map={PAYMENT_BADGE} /></Td>
                  <Td><StatusBadge value={b.shoot_status}   map={SHOOT_BADGE}   /></Td>
                  <Td>{fmtVnd(b.amount_vnd)}{b.discount_percent ? ` (-${b.discount_percent}%)` : ''}</Td>
                  <Td>{b.photo_count}</Td>
                  <Td className="text-[#6e655c]">{fmtDate(b.created_at)}</Td>
                  <Td>
                    <ChevronIcon open={expanded === b.id} />
                  </Td>
                </tr>
                {expanded === b.id && (
                  <tr key={`${b.id}-detail`} className="bg-[#fdf9f5] border-b border-[#e9e1d6]">
                    <td colSpan={9} className="px-5 py-4">
                      <BookingDetail booking={b} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && <EmptyRow msg="No bookings yet." />}
      </div>
    </div>
  );
}

function BookingDetail({ booking }: { booking: AdminBooking }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-[12px]">
        <DetailField label="Director"   value={booking.director_name || '—'} />
        <DetailField label="Feelings"   value={booking.feelings.join(', ') || '—'} />
        <DetailField label="Goals"      value={booking.goals.join(', ') || '—'} />
        <DetailField label="Discount"   value={booking.discount_percent ? `${booking.discount_percent}%` : '—'} />
      </div>

      {booking.photos.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-[#6e655c]">Photos ({booking.photos.length})</p>
          <div className="flex flex-wrap gap-2">
            {booking.photos.map((photo) => (
              <div key={photo.id} className="relative">
                {photo.url ? (
                  <a href={photo.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={`${photo.type} ${photo.scene_index ?? ''}`}
                      className="h-24 w-18 rounded-lg object-cover border border-[#e9e1d6] hover:opacity-80 transition-opacity"
                      style={{ width: 72 }}
                    />
                  </a>
                ) : (
                  <div className="flex h-24 w-[72px] items-center justify-center rounded-lg border border-[#e9e1d6] bg-[#f5f1ea] text-[10px] text-[#6e655c]">
                    No URL
                  </div>
                )}
                <span className="mt-0.5 block text-center text-[9px] text-[#6e655c] capitalize">
                  {photo.type}{photo.scene_index != null ? ` ${photo.scene_index}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Prompts tab ───────────────────────────────────────────────────────────────

const ROUTE_ORDER = ['golden-saigon', 'soft-girl-saigon', 'night-out', 'luxury-saigon', 'outfit-shoot'];

function PromptsTab({ token }: { token: string }) {
  const [prompts, setPrompts]   = useState<AdminPrompt[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string>(ROUTE_ORDER[0]);

  useEffect(() => {
    fetch('/api/admin/prompts', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setPrompts(d.prompts ?? []))
      .catch(() => setError('Failed to load prompts'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = useCallback(async (id: string, newPrompt: string) => {
    const res = await fetch(`/api/admin/prompts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prompt: newPrompt }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
    const updated = await res.json();
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, prompt: updated.prompt, updated_at: updated.updated_at } : p)));
  }, [token]);

  if (loading) return <Spinner />;
  if (error)   return <ErrMsg msg={error} />;

  const routePrompts = prompts.filter((p) => p.route_id === selectedRoute);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Prompts" count={prompts.length} />
        <p className="text-[12px] text-[#6e655c]">5 studios · 5 scenes each · {prompts.length} total</p>
      </div>

      {/* Route tabs */}
      <div className="flex flex-wrap gap-2">
        {ROUTE_ORDER.map((routeId) => (
          <button
            key={routeId}
            onClick={() => setSelectedRoute(routeId)}
            className={`rounded-full border px-4 py-1.5 text-[12px] font-medium transition-colors ${
              selectedRoute === routeId
                ? 'border-[#221f1c] bg-[#221f1c] text-white'
                : 'border-[#e9e1d6] bg-white text-[#6e655c] hover:border-[#221f1c] hover:text-[#221f1c]'
            }`}
          >
            {ROUTE_LABELS[routeId] ?? routeId}
          </button>
        ))}
      </div>

      {/* Scene prompt cards */}
      <div className="space-y-4">
        {routePrompts
          .sort((a, b) => a.scene_index - b.scene_index)
          .map((p) => (
            <PromptCard key={p.id} prompt={p} onSave={handleSave} />
          ))}
      </div>
    </div>
  );
}

function PromptCard({ prompt, onSave }: { prompt: AdminPrompt; onSave: (id: string, text: string) => Promise<void> }) {
  const [text, setText]       = useState(prompt.prompt);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [err, setErr]         = useState('');
  const original              = useRef(prompt.prompt);
  const isDirty               = text !== original.current;

  const handleSave = async () => {
    setSaving(true);
    setErr('');
    try {
      await onSave(prompt.id, text);
      original.current = text;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const sceneLabel = ['Preview (Shot 1)', 'Shot 2', 'Shot 3', 'Shot 4', 'Shot 5'][prompt.scene_index] ?? `Scene ${prompt.scene_index}`;

  return (
    <div className={`rounded-2xl border bg-white p-5 transition-shadow ${isDirty ? 'border-[#d89873] shadow-sm' : 'border-[#e9e1d6]'}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#c37d55]">
            Scene {prompt.scene_index + 1}
          </p>
          <p className="text-[13px] font-medium text-[#221f1c]">{sceneLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#6e655c]">{text.length} chars</span>
          {isDirty && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700 font-medium">Unsaved</span>
          )}
          {saved && (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] text-green-700 font-medium">Saved ✓</span>
          )}
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        className="w-full resize-y rounded-xl border border-[#e9e1d6] bg-[#fdfbf8] px-4 py-3 text-[13px] text-[#221f1c] leading-relaxed outline-none focus:border-[#221f1c] focus:ring-1 focus:ring-[#221f1c]/10"
        spellCheck={false}
      />

      {err && <p className="mt-1 text-[12px] text-red-600">{err}</p>}

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] text-[#6e655c]">
          Last updated {fmtDate(prompt.updated_at)}
        </p>
        <div className="flex gap-2">
          {isDirty && (
            <button
              onClick={() => { setText(original.current); setErr(''); }}
              className="rounded-lg border border-[#e9e1d6] px-3 py-1.5 text-[12px] text-[#6e655c] hover:text-[#221f1c]"
            >
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="rounded-lg bg-[#221f1c] px-4 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Utility components ────────────────────────────────────────────────────────

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>;
}

function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 ${className}`}>{children}</td>;
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e9e1d6] bg-white p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#6e655c]">{label}</p>
      <p className="mt-1.5 font-serif text-[22px] tracking-tight text-[#221f1c]">{value}</p>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="font-serif text-[22px] tracking-[0.04em] text-[#221f1c] uppercase">{title}</h2>
      <span className="text-[13px] text-[#6e655c]">{count}</span>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#6e655c]">{label}</p>
      <p className="mt-0.5 text-[13px] text-[#221f1c]">{value}</p>
    </div>
  );
}

function EmptyRow({ msg }: { msg: string }) {
  return <p className="px-5 py-10 text-center text-[13px] text-[#6e655c]">{msg}</p>;
}

function ErrMsg({ msg }: { msg: string }) {
  return <p className="py-10 text-center text-[13px] text-red-600">{msg}</p>;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#e9e1d6] border-t-[#221f1c]" />
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={`text-[#6e655c] transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
