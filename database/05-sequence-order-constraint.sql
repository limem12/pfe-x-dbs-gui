DO $$
BEGIN
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
      AND conrelid = 'public.sequence_steps'::regclass
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
    END IF;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sequence_steps'
      AND column_name = 'fnc_nb'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sequence_steps_sequence_id_fnc_nb_key'
      AND conrelid = 'public.sequence_steps'::regclass
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.sequence_steps
      GROUP BY sequence_id, fnc_nb
      HAVING COUNT(*) > 1
    ) THEN
      RAISE NOTICE 'Contrainte unique sequence_steps(sequence_id, fnc_nb) non ajoutee: doublons existants';
    ELSE
      ALTER TABLE public.sequence_steps
      ADD CONSTRAINT sequence_steps_sequence_id_fnc_nb_key
      UNIQUE (sequence_id, fnc_nb);
    END IF;
  END IF;
END $$;
