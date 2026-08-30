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
    // In production this means the email was NEVER actually sent — the
    // caller still sees a success response, so this needs to be loud.
    const level = process.env.VERCEL_ENV === 'production' ? console.error : console.log;
    level(
      `[maileroo] SENDING_KEY not set — no email sent to ${to} (subject: "${subject}"). ` +
        `${process.env.VERCEL_ENV === 'production' ? 'THIS IS A PRODUCTION MISCONFIGURATION.' : 'Expected in local dev.'}`,
    );
    return 'dev-no-key';
  }

  let res: Response;
  try {
    res = await fetch(MAILEROO_API, {
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
  } catch (err) {
    console.error(`[maileroo] Network error sending to ${to}:`, err);
    throw err;
  }

  const rawBody = await res.text();
  let json: { success: boolean; message?: string; data?: { reference_id: string } | null };
  try {
    json = JSON.parse(rawBody);
  } catch {
    console.error(`[maileroo] Non-JSON response (status ${res.status}) sending to ${to}: ${rawBody.slice(0, 500)}`);
    throw new Error(`Maileroo returned a non-JSON response (status ${res.status})`);
  }

  if (!res.ok || !json.success) {
    console.error(
      `[maileroo] Send failed (status ${res.status}) to ${to}: ${json.message ?? 'no message'} — ${rawBody.slice(0, 500)}`,
    );
    throw new Error(json.message ?? `Maileroo send failed (status ${res.status})`);
  }

  const referenceId = json.data?.reference_id ?? 'queued';
  console.log(`[maileroo] Sent to ${to} — reference_id: ${referenceId}`);
  return referenceId;
}
