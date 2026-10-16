// Personal (free webmail) email providers. Next5 sells to businesses: a new sign-up from one of these is refused, and
// older accounts on one are flagged in Admin → Users. Shared by the server and the admin page.

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.ca', 'ymail.com', 'rocketmail.com',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'outlook.com', 'live.com', 'msn.com', 'passport.com',
  'aol.com', 'aim.com',
  'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'pm.me',
  'gmx.com', 'gmx.net', 'mail.com', 'zoho.com', 'yandex.com', 'yandex.ru',
  'comcast.net', 'att.net', 'sbcglobal.net', 'verizon.net', 'cox.net', 'charter.net', 'bellsouth.net', 'earthlink.net',
  'tutanota.com', 'fastmail.com', 'hey.com', 'inbox.com', 'qq.com', '163.com',
]);

/** Throwaway inboxes: always suspicious. */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'temp-mail.org', 'tempmail.com', 'yopmail.com',
  'trashmail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com',
]);

export const BUSINESS_EMAIL_ONLY = 'Only business emails are allowed.';

export type EmailKind = 'business' | 'personal' | 'disposable';

/** "ann@Gmail.com" → 'personal'; "ann@acme.com" → 'business'. */
export const emailKind = (email: string): EmailKind => {
  const domain = email.trim().toLowerCase().split('@')[1] ?? '';
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return 'disposable';
  return FREE_EMAIL_DOMAINS.has(domain) ? 'personal' : 'business';
};
