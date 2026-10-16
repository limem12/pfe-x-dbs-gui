-- ============================================================
-- 23-drop-legacy-step-sequence-tables.sql
-- Keep only the normalized step/sequence tables:
--   step, step_param, "sequence", sequence_step
-- and remove the former duplicated runtime tables:
--   steps, step_parameters, sequences, sequence_steps
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.steps') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.step (id, name, description, created_at)
      SELECT
        source_steps.step_id,
        source_steps.normalized_name,
        source_steps.description,
        COALESCE(source_steps.created_at, NOW())
      FROM (
        SELECT
          s.step_id,
          CASE
            WHEN COUNT(*) OVER (PARTITION BY s.name) > 1
              OR EXISTS (
                SELECT 1
                FROM public.step st
                WHERE st.name = s.name
                  AND st.id <> s.step_id
              )
            THEN CONCAT(s.name, ' #', s.step_id::text)
            ELSE s.name
          END AS normalized_name,
          s.description,
          s.created_at
        FROM public.steps s
      ) source_steps
      ON CONFLICT (id) DO NOTHING
    $sql$;

    EXECUTE $sql$
      SELECT setval(
        pg_get_serial_sequence('public.step', 'id'),
        COALESCE((SELECT MAX(id) FROM public.step), 1),
        (SELECT COUNT(*) > 0 FROM public.step)
      )
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.step_parameters') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.step_param (
        id,
        step_id,
        param_name,
        param_type,
        default_value,
        created_at
      )
      SELECT
        p.parameter_id,
        p.step_id,
        p.name,
        CASE p.vtype
          WHEN 2 THEN 'int'
          WHEN 3 THEN 'float'
          WHEN 4 THEN 'boolean'
          ELSE 'string'
        END,
        p.value,
        COALESCE(p.created_at, NOW())
      FROM public.step_parameters p
      WHERE EXISTS (
        SELECT 1
        FROM public.step s
        WHERE s.id = p.step_id
      )
        AND NOT EXISTS (
          SELECT 1
          FROM public.step_param sp
          WHERE sp.step_id = p.step_id
            AND sp.param_name = p.name
        )
      ON CONFLICT (id) DO NOTHING
    $sql$;

    EXECUTE $sql$
      SELECT setval(
        pg_get_serial_sequence('public.step_param', 'id'),
        COALESCE((SELECT MAX(id) FROM public.step_param), 1),
        (SELECT COUNT(*) > 0 FROM public.step_param)
      )
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.sequences') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public."sequence" (id, name, description, created_at)
      SELECT
        source_sequences.sequence_id,
        source_sequences.normalized_name,
        source_sequences.description,
        COALESCE(source_sequences.created_at, NOW())
      FROM (
        SELECT
          s.sequence_id,
          CASE
            WHEN COUNT(*) OVER (PARTITION BY s.name) > 1
              OR EXISTS (
                SELECT 1
                FROM public."sequence" seq
                WHERE seq.name = s.name
                  AND seq.id <> s.sequence_id
              )
            THEN CONCAT(s.name, ' #', s.sequence_id::text)
            ELSE s.name
          END AS normalized_name,
          s.description,
          s.created_at
        FROM public.sequences s
      ) source_sequences
      ON CONFLICT (id) DO NOTHING
    $sql$;

    EXECUTE $sql$
      SELECT setval(
        pg_get_serial_sequence('public."sequence"', 'id'),
        COALESCE((SELECT MAX(id) FROM public."sequence"), 1),
        (SELECT COUNT(*) > 0 FROM public."sequence")
      )
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.sequence_steps') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.sequence_step (
        sequence_id,
        step_id,
        order_index,
        created_at
      )
      SELECT
        ss.sequence_id,
        ss.step_id,
        ss."position",
        COALESCE(ss.created_at, NOW())
      FROM public.sequence_steps ss
      WHERE EXISTS (
        SELECT 1
        FROM public."sequence" seq
        WHERE seq.id = ss.sequence_id
      )
        AND EXISTS (
          SELECT 1
          FROM public.step st
          WHERE st.id = ss.step_id
        )
      ON CONFLICT (sequence_id, order_index) DO NOTHING
    $sql$;

    EXECUTE $sql$
      SELECT setval(
        pg_get_serial_sequence('public.sequence_step', 'id'),
        COALESCE((SELECT MAX(id) FROM public.sequence_step), 1),
        (SELECT COUNT(*) > 0 FROM public.sequence_step)
      )
    $sql$;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.product_pipeline
  DROP CONSTRAINT IF EXISTS product_pipeline_sequence_id_fkey,
  DROP CONSTRAINT IF EXISTS product_pipeline_step_id_fkey;

ALTER TABLE IF EXISTS public.step_status
  DROP CONSTRAINT IF EXISTS step_status_test_id_fkey,
  DROP CONSTRAINT IF EXISTS step_status_parameter_id_fkey;

DELETE FROM public.product_pipeline pp
WHERE pp.step_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.step s
    WHERE s.id = pp.step_id
  );

DELETE FROM public.product_pipeline pp
WHERE pp.sequence_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public."sequence" s
    WHERE s.id = pp.sequence_id
  );

UPDATE public.step_status ss
SET test_id = NULL
WHERE ss.test_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.step s
    WHERE s.id = ss.test_id
  );

UPDATE public.step_status ss
SET parameter_id = NULL
WHERE ss.parameter_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.step_param sp
    WHERE sp.id = ss.parameter_id
  );

ALTER TABLE IF EXISTS public.product_pipeline
  ADD CONSTRAINT product_pipeline_sequence_id_fkey
    FOREIGN KEY (sequence_id)
    REFERENCES public."sequence"(id)
    ON DELETE CASCADE,
  ADD CONSTRAINT product_pipeline_step_id_fkey
    FOREIGN KEY (step_id)
    REFERENCES public.step(id)
    ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.step_status
  ADD CONSTRAINT step_status_test_id_fkey
    FOREIGN KEY (test_id)
    REFERENCES public.step(id)
    ON DELETE SET NULL,
  ADD CONSTRAINT step_status_parameter_id_fkey
    FOREIGN KEY (parameter_id)
    REFERENCES public.step_param(id)
    ON DELETE SET NULL;

DROP TABLE IF EXISTS public.sequence_steps CASCADE;
DROP TABLE IF EXISTS public.sequences CASCADE;
DROP TABLE IF EXISTS public.step_parameters CASCADE;
DROP TABLE IF EXISTS public.steps CASCADE;

COMMIT;
