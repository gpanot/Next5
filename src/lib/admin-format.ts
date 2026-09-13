// ── Admin formatting helpers ─────────────────────────────────────────────────

export const ROUTE_LABELS: Record<string, string> = {
  'golden-saigon': 'Golden Saigon',
  'soft-girl-saigon': 'Soft Girl Saigon',
  'night-out': 'Night Out',
  'luxury-saigon': 'Luxury Saigon',
  'outfit-shoot': 'Outfit Shoot',
};

export const ROUTE_ORDER = [
  'golden-saigon',
  'soft-girl-saigon',
  'night-out',
  'luxury-saigon',
  'outfit-shoot',
];

export const PAYMENT_BADGE: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'bg-amber-50  text-amber-700'  },
  paid:      { label: 'Paid',      color: 'bg-blue-50   text-blue-700'   },
  confirmed: { label: 'Confirmed', color: 'bg-green-50  text-green-700'  },
};

export const SHOOT_BADGE: Record<string, { label: string; color: string }> = {
  preview_generating: { label: 'Preview…',  color: 'bg-yellow-50 text-yellow-700' },
  preview_ready:      { label: 'Preview ✓', color: 'bg-blue-50   text-blue-700'   },
  creating:           { label: 'Creating…', color: 'bg-purple-50 text-purple-700' },
  delivered:          { label: 'Delivered', color: 'bg-green-50  text-green-700'  },
  error:              { label: 'Error',     color: 'bg-red-50    text-red-700'    },
};

export function fmtVnd(v: number | null): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(v);
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
