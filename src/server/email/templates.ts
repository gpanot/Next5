// server-only — never import from a 'use client' file.

import { formatShortDate } from '../../lib/dates';
import { formatUsd, formatVnd } from '../../lib/money';
import { appUrl, type EmailContent } from './layout';

export const welcomeEmail = (firstName: string | null, product: 'brand' | 'shop'): EmailContent => ({
  subject: 'Welcome to Next5',
  heading: `Welcome${firstName ? `, ${firstName}` : ''}`,
  body: [product === 'brand' ? 'Your Brand Studio is ready. Add your selfies and pick a set to get 3 free photos of you.' : 'Your Shop Studio is ready. Add a product and pick a look to get 3 free on-model photos.'],
  cta: { label: 'Continue setup', url: appUrl(`/start/${product}`) },
});

export const trialNudgeEmail = (product: 'brand' | 'shop'): EmailContent => ({
  subject: 'Liked your free photos?',
  heading: 'Keep creating every month',
  body: [product === 'brand' ? 'Your free photos are waiting. Plans start at $19 a month — a fresh drop of on-brand photos, no photoshoot.' : 'Your free product photos are waiting. Plans start at $15 a month — photograph every new drop the day it arrives.', 'Prepaid by bank transfer. Nothing renews automatically.'],
  cta: { label: 'Pick a plan', url: appUrl('/app/billing') },
});

export const paymentReceiptEmail = (item: string, usdCents: number | null, vnd: number, reference: string): EmailContent => ({
  subject: `Receipt: ${item}`,
  heading: 'Payment received — thank you',
  body: [`${item}`, `${usdCents !== null ? `${formatUsd(usdCents, { showCents: true })} · ` : ''}${formatVnd(vnd)} · reference ${reference}`],
  cta: { label: 'Go to my workspace', url: appUrl('/app') },
});

export const requestReceivedEmail = (item: string): EmailContent => ({
  subject: `Request received: ${item}`,
  heading: 'You’re on the list',
  body: [`Thanks for choosing ${item}. Paid plans are opening to a small group first — we’ll email you within 24 hours to activate it.`, 'Nothing to pay today. Your free photos stay in your workspace.'],
  cta: { label: 'Go to my workspace', url: appUrl('/app') },
});

export const planActivatedEmail = (item: string): EmailContent => ({
  subject: `Activated: ${item}`,
  heading: 'Your plan is active',
  body: [`${item} is now active in your workspace. Your photos are ready to use.`],
  cta: { label: 'Create photos', url: appUrl('/app/create') },
});

export const batchReadyEmail = (batchName: string, ready: number, batchId: string): EmailContent => ({
  subject: `Your photos are ready: ${batchName}`,
  heading: `${ready} new photo${ready === 1 ? '' : 's'} ready`,
  body: [`“${batchName}” has finished. Review, redo anything that isn’t right (free, twice per photo) and download.`],
  cta: { label: 'View photos', url: appUrl(`/app/batches/${batchId}`) },
});

export const creditsGrantedEmail = (credits: number, nextDate: Date | null): EmailContent => ({
  subject: `${credits} new photos this month`,
  heading: 'Your monthly photos are here',
  body: [`${credits} photos were added to your workspace.${nextDate ? ` They’re available until ${formatShortDate(nextDate)}.` : ''}`],
  cta: { label: 'Create this month’s photos', url: appUrl('/app/create') },
});

export const renewalEmail = (planName: string, endsAt: Date, daysLeft: number): EmailContent => ({
  subject: daysLeft <= 1 ? 'Your Next5 plan ends tomorrow' : `Your Next5 plan ends on ${formatShortDate(endsAt)}`,
  heading: daysLeft <= 1 ? 'Your plan ends tomorrow' : `${daysLeft} days left on your plan`,
  body: [`${planName} ends on ${formatShortDate(endsAt)}. Renew now to keep your monthly photos — your renewal starts when the current plan ends.`],
  cta: { label: 'Renew my plan', url: appUrl('/app/billing') },
});

export const planEndedEmail = (planName: string): EmailContent => ({
  subject: 'Your Next5 plan has ended',
  heading: 'Your plan has ended',
  body: [`${planName} ended today. Your library stays available to download for 90 days.`],
  cta: { label: 'Renew', url: appUrl('/app/billing') },
});

export const newThemeEmail = (themeTitle: string, themeId: string): EmailContent => ({
  subject: `This month’s theme: ${themeTitle}`,
  heading: `New this month: ${themeTitle}`,
  body: ['A fresh theme for your posts is ready in your Brand Studio.'],
  cta: { label: `Create with ${themeTitle}`, url: appUrl(`/app/create?theme=${themeId}`) },
});

export const restockNudgeEmail = (newProducts: number): EmailContent => ({
  subject: `${newProducts} new product${newProducts === 1 ? '' : 's'} waiting for photos`,
  heading: 'New stock, no photos yet',
  body: [`You added ${newProducts} product${newProducts === 1 ? '' : 's'} this week. Create on-model photos for them in one batch.`],
  cta: { label: 'Create photos', url: appUrl('/app/create') },
});
