'use client';

import { useEffect, useState } from 'react';
import { fmtDate, PAYMENT_BADGE } from '../../lib/admin-format';

type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  booking_count: number;
  photo_count: number;
  last_booking: { route_title: string; payment_status: string; created_at: string } | null;
};

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
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface text-left text-[10px] uppercase tracking-[0.12em] text-muted">
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
              <tr key={u.id} className={`border-b border-line last:border-0 ${i % 2 === 1 ? 'bg-surface' : ''}`}>
                <Td className="font-medium text-ink">{u.email}</Td>
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
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="px-5 py-10 text-center text-[13px] text-muted">No users yet.</p>
        )}
      </div>
    </div>
  );
};
