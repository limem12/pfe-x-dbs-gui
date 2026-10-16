DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user'
      AND column_name = 'rights'
  ) THEN
    ALTER TABLE public."user" DROP COLUMN rights;
    RAISE NOTICE 'Colonne rights supprimee de la table user';
  ELSE
    RAISE NOTICE 'La colonne rights n''existe pas dans la table user';
  END IF;
END $$;
