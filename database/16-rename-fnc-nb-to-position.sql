BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sequence_steps'
      AND column_name = 'fnc_nb'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sequence_steps'
      AND column_name = 'position'
  ) THEN
    ALTER TABLE public.sequence_steps
      RENAME COLUMN fnc_nb TO "position";

    RAISE NOTICE 'Colonne fnc_nb renommee en position';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sequence_steps'
      AND column_name = 'position'
  ) THEN
    RAISE NOTICE 'La colonne position existe deja dans sequence_steps';
  ELSE
    RAISE NOTICE 'Aucune colonne fnc_nb ou position trouvee dans sequence_steps';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sequence_steps_sequence_id_fnc_nb_key'
      AND conrelid = to_regclass('public.sequence_steps')
  ) THEN
    ALTER TABLE public.sequence_steps
      DROP CONSTRAINT sequence_steps_sequence_id_fnc_nb_key;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sequence_steps'
      AND column_name = 'position'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sequence_steps_sequence_id_position_key'
      AND conrelid = to_regclass('public.sequence_steps')
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.sequence_steps
      GROUP BY sequence_id, "position"
      HAVING COUNT(*) > 1
    ) THEN
      RAISE NOTICE 'Contrainte unique sequence_steps(sequence_id, position) non ajoutee: doublons existants';
    ELSE
      ALTER TABLE public.sequence_steps
        ADD CONSTRAINT sequence_steps_sequence_id_position_key
        UNIQUE (sequence_id, "position");

      RAISE NOTICE 'Contrainte unique sequence_steps(sequence_id, position) ajoutee';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sequence_steps'
      AND column_name = 'position'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sequence_steps_position ON public.sequence_steps ("position")';
  END IF;
END $$;

SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sequence_steps'
ORDER BY ordinal_position;

COMMIT;
