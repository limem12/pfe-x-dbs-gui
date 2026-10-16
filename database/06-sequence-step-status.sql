ALTER TABLE public.sequence_steps
ADD COLUMN IF NOT EXISTS status character varying(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_sequence_steps_status'
      AND conrelid = 'public.sequence_steps'::regclass
  ) THEN
    ALTER TABLE public.sequence_steps
      ADD CONSTRAINT chk_sequence_steps_status
      CHECK (status IS NULL OR status IN ('activated', 'skipped'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sequence_steps_status
ON public.sequence_steps (status);
