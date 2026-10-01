/**
 * POST /api/webhooks/stripe — Stripe events for Auto Slideshow credits. Signed with STRIPE_WEBHOOK_SECRET.
 * checkout.session.completed → top up credited or card saved; payment_intent.succeeded → auto top up credited.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { fulfillAutoRecharge, fulfillCheckoutSession } from '../../../../src/server/slideshowCredits/fulfill';
import { stripe } from '../../../../src/server/slideshowCredits/stripe';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get('stripe-signature');
  if (!secret || !signature) return NextResponse.json({ error: 'not_configured' }, { status: 400 });
  let event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: 'bad_signature' }, { status: 400 });
  }
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') await fulfillCheckoutSession(event.data.object);
    if (event.type === 'payment_intent.succeeded') await fulfillAutoRecharge(event.data.object);
  } catch (err) {
    // 500 makes Stripe retry; crediting is idempotent.
    console.error(`[stripe-webhook] ${event.type} ${event.id} failed:`, err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
