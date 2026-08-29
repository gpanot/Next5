/**
 * Maileroo email helper.
 *
 * Uses the Maileroo REST API (v2) to send transactional emails.
 * Requires SENDING_KEY in the environment (application-level sending key).
 *
 * From address: noreply@mail.next5.giinger.com (verified domain)
 */

const MAILEROO_API = 'https://smtp.maileroo.com/api/v2/emails';
const FROM_ADDRESS = 'noreply@mail.next5.giinger.com';
const FROM_NAME = 'Next5 Studio';

export interface MailerooEmail {
  to: string;
  subject: string;
  html: string;
  plain?: string;
}

/**
 * Sends a transactional email via Maileroo.
 * Returns the reference_id on success, throws on failure.
 *
 * Falls back to a console.log in dev when SENDING_KEY is not set,
 * so local development works without credentials.
 */
export async function sendEmail({ to, subject, html, plain }: MailerooEmail): Promise<string> {
  const apiKey = process.env.SENDING_KEY;

  if (!apiKey) {
    console.log(`[maileroo] SENDING_KEY not set — skipping send to ${to}`);
    console.log(`[maileroo] Subject: ${subject}`);
    return 'dev-no-key';
  }

  const res = await fetch(MAILEROO_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      from: { address: FROM_ADDRESS, display_name: FROM_NAME },
      to: [{ address: to }],
      subject,
      html,
      plain: plain ?? '',
    }),
  });

  const json = (await res.json()) as { success: boolean; message?: string; data?: { reference_id: string } | null };

  if (!json.success) {
    throw new Error(json.message ?? 'Maileroo send failed');
  }

  return json.data?.reference_id ?? 'queued';
}
