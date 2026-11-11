-- migrate:up

-- How long a Prospect Pack takes to make, without the admin's face check: created → faces (site read, Brand Cast faces)
-- plus approved → ready (the posts). Shown on the admin Prospects row.
ALTER TABLE public.prospect_packs
  ADD COLUMN faces_at timestamp with time zone,
  ADD COLUMN approved_at timestamp with time zone,
  ADD COLUMN ready_at timestamp with time zone;

-- Older packs: approval from the audit log; faces and ready from the owner's last paid call before approval and overall
-- (before a claim, whose later work is not the pack's making).
UPDATE public.prospect_packs p
SET approved_at = (SELECT min(a.created_at) FROM public.admin_audit_logs a WHERE a.action = 'prospect_approve_faces' AND a.target_id = p.id);

UPDATE public.prospect_packs p
SET faces_at = (SELECT max(e.created_at) FROM public.api_cost_events e WHERE e.user_id = p.owner_user_id AND e.created_at < p.approved_at)
WHERE p.approved_at IS NOT NULL;

UPDATE public.prospect_packs p
SET ready_at = (SELECT max(e.created_at) FROM public.api_cost_events e WHERE e.user_id = p.owner_user_id AND e.created_at > p.approved_at AND (p.claimed_at IS NULL OR e.created_at < p.claimed_at))
WHERE p.approved_at IS NOT NULL AND p.status IN ('ready', 'claimed');

-- migrate:down

ALTER TABLE public.prospect_packs
  DROP COLUMN IF EXISTS faces_at,
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS ready_at;
