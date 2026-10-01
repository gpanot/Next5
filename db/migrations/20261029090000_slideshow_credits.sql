-- migrate:up

-- Auto Slideshow credits: one USD wallet per user, shared by all their slideshow workspaces. Each slideshow costs 99¢.
-- Money is in cents. Cards live in Stripe; we keep only the customer id and the card picked for auto recharge.
CREATE TABLE public.slideshow_wallets (
  user_id                        TEXT PRIMARY KEY REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  balance_cents                  INTEGER     NOT NULL DEFAULT 0,
  stripe_customer_id             TEXT UNIQUE,
  auto_recharge_enabled          BOOLEAN     NOT NULL DEFAULT FALSE,
  auto_recharge_threshold_cents  INTEGER     NOT NULL DEFAULT 500,
  auto_recharge_amount_cents     INTEGER     NOT NULL DEFAULT 2000,
  auto_recharge_payment_method   TEXT,
  -- Last off-session charge we started: blocks a second one while the first is in flight
  auto_recharge_last_at          TIMESTAMPTZ,
  -- Why the last auto recharge failed (card declined…); cleared when it succeeds or settings are saved
  auto_recharge_error            TEXT,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Every change to a balance. The sum of a user's rows is their balance.
CREATE TABLE public.slideshow_credit_ledger (
  id           TEXT PRIMARY KEY,
  user_id      TEXT        NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  delta_cents  INTEGER     NOT NULL,
  reason       TEXT        NOT NULL CHECK (reason IN ('free_grant', 'topup', 'auto_recharge', 'slideshow_charge', 'slideshow_refund', 'admin_adjust')),
  -- Stripe Checkout session / PaymentIntent id for payments, slideshow id for slideshow charges
  ref          TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX slideshow_credit_ledger_user_idx ON public.slideshow_credit_ledger (user_id, created_at DESC);
CREATE INDEX slideshow_credit_ledger_ref_idx ON public.slideshow_credit_ledger (ref);
-- Applied once: a payment (webhook and return page can both report it), the free grant, and the charge for one
-- slideshow (a slideshow is charged when it is first ready; re-renders and edits are free).
CREATE UNIQUE INDEX slideshow_credit_ledger_once_key ON public.slideshow_credit_ledger (reason, ref) WHERE reason IN ('free_grant', 'topup', 'auto_recharge', 'slideshow_charge');

-- migrate:down

DROP TABLE IF EXISTS public.slideshow_credit_ledger;
DROP TABLE IF EXISTS public.slideshow_wallets;
