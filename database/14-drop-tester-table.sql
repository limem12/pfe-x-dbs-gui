BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tester'
  ) THEN
    ALTER TABLE IF EXISTS public.product_status
      DROP CONSTRAINT IF EXISTS product_status_tester_id_fkey;
    ALTER TABLE IF EXISTS public.status
      DROP CONSTRAINT IF EXISTS status_tester_id_fkey;
    ALTER TABLE IF EXISTS public.step_status
      DROP CONSTRAINT IF EXISTS step_status_tester_id_fkey;
    ALTER TABLE IF EXISTS public.tester
      DROP CONSTRAINT IF EXISTS tester_product_id_fkey;

    DROP TABLE public.tester;
    DROP SEQUENCE IF EXISTS public.tester_tester_id_seq;

    RAISE NOTICE 'Table tester supprimee';
  ELSE
    RAISE NOTICE 'Table tester deja absente';
  END IF;
END $$;

COMMIT;
