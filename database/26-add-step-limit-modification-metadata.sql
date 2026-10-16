BEGIN;

ALTER TABLE public.step_limit
  ADD COLUMN IF NOT EXISTS modified_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP;

UPDATE public.step_limit
SET modified_at = COALESCE(modified_at, created_at)
WHERE modified_at IS NULL;

COMMIT;
