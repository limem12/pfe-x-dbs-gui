BEGIN;

ALTER TABLE public.step
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(50),
  ADD COLUMN IF NOT EXISTS modified_by VARCHAR(50),
  ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP DEFAULT NOW();

UPDATE public.step
SET created_by = NULLIF(created_by, ''),
    modified_by = COALESCE(NULLIF(modified_by, ''), NULLIF(created_by, '')),
    modified_at = COALESCE(modified_at, created_at, NOW())
WHERE created_by IS NULL
   OR created_by = ''
   OR modified_by IS NULL
   OR modified_by = ''
   OR modified_at IS NULL;

DO $$
BEGIN
  IF to_regclass('public."user"') IS NOT NULL THEN
    UPDATE public.step s
    SET created_by = NULL
    WHERE s.created_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public."user" u
        WHERE u.username = s.created_by
      );

    UPDATE public.step s
    SET modified_by = NULL
    WHERE s.modified_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public."user" u
        WHERE u.username = s.modified_by
      );

    ALTER TABLE public.step DROP CONSTRAINT IF EXISTS step_created_by_fkey;
    ALTER TABLE public.step
      ADD CONSTRAINT step_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public."user"(username)
      ON DELETE SET NULL;

    ALTER TABLE public.step DROP CONSTRAINT IF EXISTS step_modified_by_fkey;
    ALTER TABLE public.step
      ADD CONSTRAINT step_modified_by_fkey
      FOREIGN KEY (modified_by) REFERENCES public."user"(username)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_step_created_by
ON public.step (created_by);

CREATE INDEX IF NOT EXISTS idx_step_modified_by
ON public.step (modified_by);

CREATE INDEX IF NOT EXISTS idx_step_modified_at
ON public.step (modified_at);

COMMIT;
