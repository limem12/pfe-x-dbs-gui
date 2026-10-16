BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'history'
  ) THEN
    ALTER TABLE public.history DROP CONSTRAINT IF EXISTS history_entity_check;
    ALTER TABLE public.history
      ADD CONSTRAINT history_entity_check
      CHECK (
        (entity)::text = ANY (
          ARRAY[
            ('Step'::character varying)::text,
            ('StepParam'::character varying)::text,
            ('StepLimit'::character varying)::text,
            ('Sequence'::character varying)::text,
            ('SequenceStep'::character varying)::text,
            ('Produit'::character varying)::text,
            ('ProductSequence'::character varying)::text,
            ('ProductStepParam'::character varying)::text,
            ('ComponentInstance'::character varying)::text,
            ('ProductStepLimit'::character varying)::text,
            ('ExecutionConfig'::character varying)::text,
            ('ModeExecution'::character varying)::text,
            ('ProductCounter'::character varying)::text,
            ('ProductStatus'::character varying)::text,
            ('Status'::character varying)::text,
            ('StepStatus'::character varying)::text,
            ('User'::character varying)::text,
            ('Role'::character varying)::text,
            ('Right'::character varying)::text,
            ('Avatar'::character varying)::text
          ]
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sequence_steps'
      AND column_name = 'modified_by'
  ) THEN
    UPDATE public.sequence_steps
    SET
      created_by = COALESCE(NULLIF(created_by, ''), NULLIF(modified_by, '')),
      updated_by = COALESCE(NULLIF(updated_by, ''), NULLIF(modified_by, ''))
    WHERE
      (created_by IS NULL OR created_by = '')
      OR (updated_by IS NULL OR updated_by = '');

    ALTER TABLE public.sequence_steps
      DROP CONSTRAINT IF EXISTS sequence_steps_modified_by_fkey;
    ALTER TABLE public.sequence_steps
      DROP COLUMN IF EXISTS modified_by;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.sequence_steps
  DROP CONSTRAINT IF EXISTS fk_sequence_steps_step;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'step_parameters'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'steps'
  ) THEN
    DELETE FROM public.step_parameters sp
    WHERE sp.step_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.steps s
        WHERE s.step_id = sp.step_id
      );

    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_step_parameters_step_id
      ON public.step_parameters (step_id)
    ';

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'step_parameters_step_id_fkey'
        AND conrelid = 'public.step_parameters'::regclass
    ) THEN
      ALTER TABLE public.step_parameters
        ADD CONSTRAINT step_parameters_step_id_fkey
        FOREIGN KEY (step_id) REFERENCES public.steps(step_id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.product_status
  DROP COLUMN IF EXISTS tester_id;

ALTER TABLE IF EXISTS public.status
  DROP COLUMN IF EXISTS tester_id;

ALTER TABLE IF EXISTS public.step_status
  DROP COLUMN IF EXISTS tester_id;

DROP TABLE IF EXISTS public.product_types_backup CASCADE;
DROP TABLE IF EXISTS public.sequence_parameters CASCADE;
DROP TABLE IF EXISTS public.line_parameters CASCADE;
DROP TABLE IF EXISTS public.line_process CASCADE;
DROP TABLE IF EXISTS public.line_steps CASCADE;
DROP TABLE IF EXISTS public.test_parameters CASCADE;
DROP TABLE IF EXISTS public.test_steps CASCADE;
DROP TABLE IF EXISTS public.user_parameters CASCADE;
DROP TABLE IF EXISTS public.user_rights CASCADE;
DROP TABLE IF EXISTS public.user_rights_labels CASCADE;
DROP TABLE IF EXISTS public.tester CASCADE;

DROP SEQUENCE IF EXISTS public.sequence_parameters_parameter_id_seq;
DROP SEQUENCE IF EXISTS public.tester_tester_id_seq;

COMMIT;
