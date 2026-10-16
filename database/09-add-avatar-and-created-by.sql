BEGIN;

ALTER TABLE public."user"
ADD COLUMN IF NOT EXISTS avatar TEXT;

ALTER TABLE public.steps
ADD COLUMN IF NOT EXISTS created_by VARCHAR(50),
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50);

ALTER TABLE public.sequences
ADD COLUMN IF NOT EXISTS created_by VARCHAR(50),
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50);

ALTER TABLE public.step_parameters
ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);

ALTER TABLE public.sequence_steps
ADD COLUMN IF NOT EXISTS created_by VARCHAR(50),
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'steps'
      AND column_name = 'user_id'
  ) THEN
    UPDATE public.steps s
    SET created_by = u.username
    FROM public."user" u
    WHERE s.user_id = u.user_id
      AND (s.created_by IS NULL OR s.created_by = '');
  END IF;

  UPDATE public.steps
  SET updated_by = COALESCE(NULLIF(updated_by, ''), NULLIF(created_by, ''))
  WHERE updated_by IS NULL OR updated_by = '';

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sequences'
      AND column_name = 'user_id'
  ) THEN
    UPDATE public.sequences s
    SET created_by = u.username
    FROM public."user" u
    WHERE s.user_id = u.user_id
      AND (s.created_by IS NULL OR s.created_by = '');
  END IF;

  UPDATE public.sequences
  SET updated_by = COALESCE(NULLIF(updated_by, ''), NULLIF(created_by, ''))
  WHERE updated_by IS NULL OR updated_by = '';

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'step_parameters'
      AND column_name = 'user_id'
  ) THEN
    UPDATE public.step_parameters sp
    SET created_by = u.username
    FROM public."user" u
    WHERE sp.user_id = u.user_id
      AND (sp.created_by IS NULL OR sp.created_by = '');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sequence_steps'
      AND column_name = 'modified_by'
  ) THEN
    UPDATE public.sequence_steps
    SET created_by = COALESCE(NULLIF(created_by, ''), NULLIF(modified_by, '')),
        updated_by = COALESCE(NULLIF(updated_by, ''), NULLIF(modified_by, ''))
    WHERE (created_by IS NULL OR created_by = '')
       OR (updated_by IS NULL OR updated_by = '');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sequence_steps'
      AND column_name = 'user_id'
  ) THEN
    UPDATE public.sequence_steps ss
    SET created_by = COALESCE(NULLIF(ss.created_by, ''), u.username),
        updated_by = COALESCE(NULLIF(ss.updated_by, ''), u.username)
    FROM public."user" u
    WHERE ss.user_id = u.user_id
      AND (
        ss.created_by IS NULL OR ss.created_by = '' OR
        ss.updated_by IS NULL OR ss.updated_by = ''
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'steps'
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.steps DROP CONSTRAINT IF EXISTS steps_created_by_fkey;
    ALTER TABLE public.steps
      ADD CONSTRAINT steps_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public."user"(username)
      ON UPDATE CASCADE
      ON DELETE SET NULL;

    ALTER TABLE public.steps DROP CONSTRAINT IF EXISTS steps_updated_by_fkey;
    ALTER TABLE public.steps
      ADD CONSTRAINT steps_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES public."user"(username)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sequences'
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.sequences DROP CONSTRAINT IF EXISTS sequences_created_by_fkey;
    ALTER TABLE public.sequences
      ADD CONSTRAINT sequences_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public."user"(username)
      ON UPDATE CASCADE
      ON DELETE SET NULL;

    ALTER TABLE public.sequences DROP CONSTRAINT IF EXISTS sequences_updated_by_fkey;
    ALTER TABLE public.sequences
      ADD CONSTRAINT sequences_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES public."user"(username)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'step_parameters'
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.step_parameters DROP CONSTRAINT IF EXISTS step_parameters_created_by_fkey;
    ALTER TABLE public.step_parameters
      ADD CONSTRAINT step_parameters_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public."user"(username)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sequence_steps'
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.sequence_steps DROP CONSTRAINT IF EXISTS sequence_steps_created_by_fkey;
    ALTER TABLE public.sequence_steps
      ADD CONSTRAINT sequence_steps_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public."user"(username)
      ON UPDATE CASCADE
      ON DELETE SET NULL;

    ALTER TABLE public.sequence_steps DROP CONSTRAINT IF EXISTS sequence_steps_updated_by_fkey;
    ALTER TABLE public.sequence_steps
      ADD CONSTRAINT sequence_steps_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES public."user"(username)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_steps_created_by ON public.steps (created_by);
CREATE INDEX IF NOT EXISTS idx_sequences_created_by ON public.sequences (created_by);
CREATE INDEX IF NOT EXISTS idx_step_parameters_created_by ON public.step_parameters (created_by);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_created_by ON public.sequence_steps (created_by);

COMMIT;
