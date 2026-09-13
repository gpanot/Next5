// server-only — never import from a 'use client' file.

/** Callback URL for business tasks, or null when WaveSpeed can't reach us (local) or calls can't be verified. */
export const generationWebhookUrl = (): string | null => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  if (!appUrl.startsWith('https://') || !process.env.WAVESPEED_WEBHOOK_SECRET) return null;
  return `${appUrl.replace(/\/$/, '')}/api/webhooks/wavespeed`;
};
