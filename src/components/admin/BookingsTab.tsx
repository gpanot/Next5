'use client';

import { useEffect, useState } from 'react';
import { fmtDate, fmtVnd, PAYMENT_BADGE, SHOOT_BADGE } from '../../lib/admin-format';

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

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#e9e1d6] border-t-[#221f1c]" />
    </div>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return <p className="py-10 text-center text-[13px] text-red-600">{msg}</p>;
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e9e1d6] bg-white p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#6e655c]">{label}</p>
      <p className="mt-1.5 font-serif text-[22px] tracking-tight text-[#221f1c]">{value}</p>
    </div>
  );
}

function BookingDetail({ booking }: { booking: AdminBooking }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-[12px] sm:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#6e655c]">Director</p>
          <p className="mt-0.5 text-[13px] text-[#221f1c]">{booking.director_name || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#6e655c]">Feelings</p>
          <p className="mt-0.5 text-[13px] text-[#221f1c]">{booking.feelings.join(', ') || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#6e655c]">Goals</p>
          <p className="mt-0.5 text-[13px] text-[#221f1c]">{booking.goals.join(', ') || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#6e655c]">Discount</p>
          <p className="mt-0.5 text-[13px] text-[#221f1c]">{booking.discount_percent ? `${booking.discount_percent}%` : '—'}</p>
        </div>
      </div>

      {booking.photos.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-[#6e655c]">
            Photos ({booking.photos.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {booking.photos.map((photo) => (
              <div key={photo.id} className="relative">
                {photo.url ? (
                  <a href={photo.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={`${photo.type} ${photo.scene_index ?? ''}`}
                      style={{ width: 72 }}
                      className="h-24 w-18 rounded-lg border border-[#e9e1d6] object-cover transition-opacity hover:opacity-80"
                    />
                  </a>
                ) : (
                  <div className="flex h-24 w-[72px] items-center justify-center rounded-lg border border-[#e9e1d6] bg-[#f5f1ea] text-[10px] text-[#6e655c]">
                    No URL
                  </div>
                )}
                <span className="mt-0.5 block text-center text-[9px] capitalize text-[#6e655c]">
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

type BookingsTabProps = { token: string };

export const BookingsTab = ({ token }: BookingsTabProps) => {
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total bookings"  value={String(bookings.length)} />
        <KpiCard label="Confirmed"       value={String(bookings.filter((b) => b.payment_status === 'confirmed').length)} />
        <KpiCard label="Delivered"       value={String(bookings.filter((b) => b.shoot_status === 'delivered').length)} />
        <KpiCard label="Revenue (VND)"   value={fmtVnd(totalRevenue)} />
      </div>

      <div className="flex items-baseline gap-2">
        <h2 className="font-serif text-[22px] tracking-[0.04em] text-[#221f1c] uppercase">Bookings</h2>
        <span className="text-[13px] text-[#6e655c]">{bookings.length}</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e9e1d6] bg-white">
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
                  className={`cursor-pointer border-b border-[#e9e1d6] hover:bg-[#fdfbf8] ${i % 2 === 1 ? 'bg-[#fdfbf8]' : ''} ${expanded === b.id ? 'bg-[#fdf9f5]' : ''}`}
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
                  <Td><ChevronIcon open={expanded === b.id} /></Td>
                </tr>
                {expanded === b.id && (
                  <tr key={`${b.id}-detail`} className="border-b border-[#e9e1d6] bg-[#fdf9f5]">
                    <td colSpan={9} className="px-5 py-4">
                      <BookingDetail booking={b} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && (
          <p className="px-5 py-10 text-center text-[13px] text-[#6e655c]">No bookings yet.</p>
        )}
      </div>
    </div>
  );
};
