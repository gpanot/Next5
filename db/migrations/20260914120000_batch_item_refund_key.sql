-- migrate:up

-- The refund key of the current generation run: set when the run was paid (original
-- reservation or a paid redo), null for free redos. A failed run refunds only when set.
ALTER TABLE "batch_items" ADD COLUMN IF NOT EXISTS "pending_refund_key" TEXT;

-- migrate:down

ALTER TABLE "batch_items" DROP COLUMN IF EXISTS "pending_refund_key";
