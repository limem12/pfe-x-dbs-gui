BEGIN;

DO $$
BEGIN
  IF to_regclass('public.steps') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.step (id, name, description, created_at)
      SELECT
        missing.step_id,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM public.step existing
            WHERE existing.name = missing.name
              AND existing.id <> missing.step_id
          )
            OR missing.duplicate_count > 1
            THEN CONCAT(missing.name, ' #', missing.step_id::text)
          ELSE missing.name
        END,
        missing.description,
        COALESCE(missing.created_at, NOW())
      FROM (
        SELECT
          legacy.step_id,
          legacy.name,
          legacy.description,
          legacy.created_at,
          COUNT(*) OVER (PARTITION BY legacy.name) AS duplicate_count
        FROM public.steps legacy
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.step normalized
          WHERE normalized.id = legacy.step_id
        )
      ) missing
      ON CONFLICT (id) DO NOTHING
    $sql$;
  END IF;
END $$;

SELECT setval(
  pg_get_serial_sequence('public.step', 'id'),
  COALESCE((SELECT MAX(id) FROM public.step), 1),
  (SELECT COUNT(*) > 0 FROM public.step)
);

COMMIT;
