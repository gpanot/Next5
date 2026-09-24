/** Shared formatting helpers for Campaign Studio telemetry displays. */

export function msToSec(ms: number | null | undefined): string {
  if (ms == null) return '—';
  return `${(ms / 1000).toFixed(1)}s`;
}

export function microsToUsd(micros: string | number | null | undefined): string {
  if (micros == null) return '—';
  const dollars = Number(micros) / 1_000_000;
  return `$${dollars.toFixed(4)}`;
}
