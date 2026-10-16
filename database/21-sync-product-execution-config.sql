-- ============================================================
-- 21-sync-product-execution-config.sql
-- Backfill des configurations d'execution produit.
--
-- Objectif:
--   - synchroniser les steps/sequences legacy vers les tables normalisees;
--   - creer les lignes product_execution_config manquantes pour tous les modes;
--   - inclure les sequences affectees au produit, les steps PREUUT/POSTUUT,
--     et les steps contenus dans les sequences affectees.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.steps') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.step (id, name, description, created_at)
      SELECT
        source_steps.step_id,
        CASE
          WHEN source_steps.duplicate_name_count > 1
            OR EXISTS (
              SELECT 1
              FROM public.step st
              WHERE st.name = source_steps.name
                AND st.id <> source_steps.step_id
            )
            THEN CONCAT(source_steps.name, ' #', source_steps.step_id::text)
          ELSE source_steps.name
        END,
        source_steps.description,
        COALESCE(source_steps.created_at, NOW())
      FROM (
        SELECT
          s.step_id,
          s.name,
          s.description,
          s.created_at,
          COUNT(*) OVER (PARTITION BY s.name) AS duplicate_name_count
        FROM public.steps s
      ) source_steps
      ON CONFLICT (id) DO UPDATE
      SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        created_at = COALESCE(public.step.created_at, EXCLUDED.created_at)
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
        CASE
          WHEN source_sequences.duplicate_name_count > 1
            OR EXISTS (
              SELECT 1
              FROM public."sequence" seq
              WHERE seq.name = source_sequences.name
                AND seq.id <> source_sequences.sequence_id
            )
            THEN CONCAT(source_sequences.name, ' #', source_sequences.sequence_id::text)
          ELSE source_sequences.name
        END,
        source_sequences.description,
        COALESCE(source_sequences.created_at, NOW())
      FROM (
        SELECT
          s.sequence_id,
          s.name,
          s.description,
          s.created_at,
          COUNT(*) OVER (PARTITION BY s.name) AS duplicate_name_count
        FROM public.sequences s
      ) source_sequences
      ON CONFLICT (id) DO UPDATE
      SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        created_at = COALESCE(public."sequence".created_at, EXCLUDED.created_at)
    $sql$;
  END IF;
END $$;

SELECT setval(
  pg_get_serial_sequence('public.step', 'id'),
  COALESCE((SELECT MAX(id) FROM public.step), 1),
  (SELECT COUNT(*) > 0 FROM public.step)
);

SELECT setval(
  pg_get_serial_sequence('public."sequence"', 'id'),
  COALESCE((SELECT MAX(id) FROM public."sequence"), 1),
  (SELECT COUNT(*) > 0 FROM public."sequence")
);

WITH valid_sequence_targets AS (
  SELECT DISTINCT pp.product_id, pp.sequence_id
  FROM public.product_pipeline pp
  WHERE pp.zone = 'SEQUENCE'
    AND pp.sequence_id IS NOT NULL
),
valid_step_targets AS (
  SELECT DISTINCT pp.product_id, pp.step_id
  FROM public.product_pipeline pp
  WHERE pp.zone IN ('PREUUT', 'POSTUUT')
    AND pp.step_id IS NOT NULL

  UNION

  SELECT DISTINCT pp.product_id, ss.step_id
  FROM public.product_pipeline pp
  JOIN public.sequence_step ss
    ON ss.sequence_id = pp.sequence_id
  WHERE pp.zone = 'SEQUENCE'
    AND pp.sequence_id IS NOT NULL
    AND ss.step_id IS NOT NULL
)
DELETE FROM public.product_execution_config pec
WHERE NOT EXISTS (
    SELECT 1
    FROM valid_sequence_targets vst
    WHERE pec.sequence_id IS NOT NULL
      AND pec.product_id = vst.product_id
      AND pec.sequence_id = vst.sequence_id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM valid_step_targets vst
    WHERE pec.step_id IS NOT NULL
      AND pec.product_id = vst.product_id
      AND pec.step_id = vst.step_id
  );

INSERT INTO public.product_execution_config (
  product_id,
  execution_mode_id,
  sequence_id,
  step_id,
  is_active,
  ignore_fail,
  retry_on_fail,
  repeat_count,
  retry_delay_ms,
  created_at
)
SELECT
  targets.product_id,
  em.id,
  targets.sequence_id,
  NULL,
  TRUE,
  FALSE,
  0,
  1,
  0,
  NOW()
FROM (
  SELECT DISTINCT pp.product_id, pp.sequence_id
  FROM public.product_pipeline pp
  WHERE pp.zone = 'SEQUENCE'
    AND pp.sequence_id IS NOT NULL
) targets
CROSS JOIN public.execution_mode em
WHERE EXISTS (SELECT 1 FROM public.product p WHERE p.product_id = targets.product_id)
  AND EXISTS (SELECT 1 FROM public."sequence" seq WHERE seq.id = targets.sequence_id)
ON CONFLICT DO NOTHING;

INSERT INTO public.product_execution_config (
  product_id,
  execution_mode_id,
  sequence_id,
  step_id,
  is_active,
  ignore_fail,
  retry_on_fail,
  repeat_count,
  retry_delay_ms,
  created_at
)
SELECT
  targets.product_id,
  em.id,
  NULL,
  targets.step_id,
  TRUE,
  FALSE,
  0,
  1,
  0,
  NOW()
FROM (
  SELECT DISTINCT pp.product_id, pp.step_id
  FROM public.product_pipeline pp
  WHERE pp.zone IN ('PREUUT', 'POSTUUT')
    AND pp.step_id IS NOT NULL

  UNION

  SELECT DISTINCT pp.product_id, ss.step_id
  FROM public.product_pipeline pp
  JOIN public.sequence_step ss
    ON ss.sequence_id = pp.sequence_id
  WHERE pp.zone = 'SEQUENCE'
    AND pp.sequence_id IS NOT NULL
    AND ss.step_id IS NOT NULL
) targets
CROSS JOIN public.execution_mode em
WHERE EXISTS (SELECT 1 FROM public.product p WHERE p.product_id = targets.product_id)
  AND EXISTS (SELECT 1 FROM public.step st WHERE st.id = targets.step_id)
ON CONFLICT DO NOTHING;

COMMIT;
