BEGIN;

DROP INDEX IF EXISTS public.idx_sequence_steps_status;

ALTER TABLE IF EXISTS public.sequence_steps
  DROP CONSTRAINT IF EXISTS chk_sequence_steps_status,
  DROP COLUMN IF EXISTS status;

COMMIT;
