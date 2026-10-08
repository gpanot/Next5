'use client';

import { Fragment, useEffect, useState } from 'react';
import { fmtDate, PAYMENT_BADGE } from '../../lib/admin-format';
import type { UserWorkspaceDto } from '../../types/admin/workspaceDetail';

type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  booking_count: number;
  photo_count: number;
  last_booking: { route_title: string; payment_status: string; created_at: string } | null;
  workspaces: UserWorkspaceDto[];
};

/** The user's workspaces; each opens the admin workspace page in a new tab. */
function WorkspaceLinks({ workspaces }: { workspaces: UserWorkspaceDto[] }) {
  if (workspaces.length === 0) return <p className="text-[12px] text-muted">No workspace yet.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {workspaces.map((w) => (
        <li key={w.id}>
          <a
            href={`/admin/workspaces/${w.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[12px] shadow-sm transition hover:border-ink/30 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="font-semibold text-ink dark:text-zinc-100">{w.name}</span>
            <span className="capitalize text-muted">{w.product}</span>
            {w.websiteUrl && <span className="hidden max-w-48 truncate text-muted sm:inline">{w.websiteUrl.replace(/^https?:\/\//, '')}</span>}
            {w.deleted && <span className="text-red-600">deleted</span>}
            <span aria-hidden className="text-muted">↗</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ value, map }: { value: string; map: Record<string, { label: string; color: string }> }) {
  const cfg = map[value] ?? { label: value, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>;
}

function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 ${className}`}>{children}</td>;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-ink" />
    </div>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return <p className="py-10 text-center text-[13px] text-red-600">{msg}</p>;
}

type UsersTabProps = { token: string };

export const UsersTab = ({ token }: UsersTabProps) => {
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [openId, setOpenId]   = useState<string | null>(null);

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
      <div className="mb-4 flex items-baseline gap-2">
        <h2 className="font-display text-[22px] tracking-[0.04em] text-ink uppercase">Users</h2>
        <span className="text-[13px] text-muted">{users.length}</span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface text-left text-[10px] uppercase tracking-[0.12em] text-muted">
              <Th>Email</Th>
              <Th>Workspaces</Th>
              <Th>Bookings</Th>
              <Th>Photos</Th>
              <Th>Last Shoot</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <Fragment key={u.id}>
                <tr
                  onClick={() => setOpenId(openId === u.id ? null : u.id)}
                  aria-expanded={openId === u.id}
                  className={`cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${i % 2 === 1 ? 'bg-surface' : ''}`}
                >
                  <Td className="font-medium text-ink">
                    <span className="mr-2 inline-block w-3 text-muted">{openId === u.id ? '▾' : '▸'}</span>
                    {u.email}
                  </Td>
                  <Td>{u.workspaces.length}</Td>
                  <Td>{u.booking_count}</Td>
                  <Td>{u.photo_count}</Td>
                  <Td>{u.last_booking?.route_title ?? '—'}</Td>
                  <Td>
                    {u.last_booking ? (
                      <StatusBadge value={u.last_booking.payment_status} map={PAYMENT_BADGE} />
                    ) : '—'}
                  </Td>
                  <Td className="text-muted">{fmtDate(u.created_at)}</Td>
                </tr>
                {openId === u.id && (
                  <tr className="border-b border-line bg-zinc-50 dark:bg-zinc-950">
                    <td colSpan={7} className="px-4 py-3">
                      <WorkspaceLinks workspaces={u.workspaces} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        </div>
        {users.length === 0 && (
          <p className="px-5 py-10 text-center text-[13px] text-muted">No users yet.</p>
        )}
      </div>
    </div>
  );
};
