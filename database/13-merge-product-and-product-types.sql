BEGIN;

ALTER TABLE public.product
  ADD COLUMN IF NOT EXISTS name VARCHAR(45),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(50),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'product_types'
  ) THEN
    UPDATE public.product p
    SET
      name = COALESCE(NULLIF(p.name, ''), latest_product_type.name),
      description = COALESCE(p.description, latest_product_type.description),
      created_by = COALESCE(NULLIF(p.created_by, ''), latest_product_type.created_by),
      created_at = COALESCE(p.created_at, latest_product_type.created_at),
      updated_at = COALESCE(p.updated_at, latest_product_type.updated_at)
    FROM (
      SELECT DISTINCT ON (pt.product_id)
        pt.product_id,
        pt.name,
        COALESCE(pt.description, '') AS description,
        COALESCE(NULLIF(pt.created_by, ''), 'System') AS created_by,
        COALESCE(pt.created_at, NOW()) AS created_at,
        COALESCE(pt.updated_at, pt.created_at, NOW()) AS updated_at
      FROM public.product_types pt
      ORDER BY
        pt.product_id,
        COALESCE(pt.updated_at, pt.created_at, NOW()) DESC,
        pt.type_id DESC
    ) AS latest_product_type
    WHERE latest_product_type.product_id = p.product_id;
  END IF;
END $$;

UPDATE public.product
SET
  name = COALESCE(NULLIF(name, ''), CONCAT('Produit ', product_id::text)),
  description = COALESCE(description, ''),
  created_by = COALESCE(NULLIF(created_by, ''), 'System'),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, created_at, NOW());

ALTER TABLE public.product
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN created_by SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'product_types'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'product_types_backup'
  ) THEN
    CREATE TABLE public.product_types_backup AS
    SELECT *
    FROM public.product_types;

    RAISE NOTICE 'Table product_types sauvegardee dans product_types_backup';
  END IF;
END $$;

DROP TABLE IF EXISTS public.product_types CASCADE;

CREATE INDEX IF NOT EXISTS idx_product_name ON public.product (name);
CREATE INDEX IF NOT EXISTS idx_product_created_by ON public.product (created_by);
CREATE INDEX IF NOT EXISTS idx_product_created_at ON public.product (created_at);

DO $$
BEGIN
  RAISE NOTICE 'Fusion product/product_types terminee';
  RAISE NOTICE 'Produits disponibles: %', (SELECT COUNT(*) FROM public.product);
END $$;

COMMIT;
