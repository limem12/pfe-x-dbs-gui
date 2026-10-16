BEGIN;

DROP TABLE IF EXISTS role_backup CASCADE;
DROP TABLE IF EXISTS user_backup CASCADE;

CREATE TABLE IF NOT EXISTS public.product_counter (
    product_id INTEGER PRIMARY KEY,
    count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_status (
    status_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES public.product(product_id) ON DELETE CASCADE,
    barcode VARCHAR(45),
    duration DOUBLE PRECISION,
    failed BOOLEAN DEFAULT FALSE,
    mode_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.status (
    id SERIAL PRIMARY KEY,
    item_id INTEGER,
    terminated BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.step_status (
    status_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES public.product(product_id) ON DELETE CASCADE,
    test_id INTEGER,
    parameter_id INTEGER,
    vtype INTEGER,
    dvalue DOUBLE PRECISION,
    ivalue INTEGER,
    svalue VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.product_status
  DROP COLUMN IF EXISTS tester_id;

ALTER TABLE IF EXISTS public.status
  DROP COLUMN IF EXISTS tester_id;

ALTER TABLE IF EXISTS public.step_status
  DROP COLUMN IF EXISTS tester_id;

ALTER TABLE IF EXISTS public.product_status
  ALTER COLUMN barcode TYPE VARCHAR(45);

ALTER TABLE IF EXISTS public.step_status
  ALTER COLUMN svalue TYPE VARCHAR(45);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_counter_product_id_fkey'
      AND conrelid = 'public.product_counter'::regclass
  ) THEN
    ALTER TABLE public.product_counter
      ADD CONSTRAINT product_counter_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES public.product(product_id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_status_product_id_fkey'
      AND conrelid = 'public.product_status'::regclass
  ) THEN
    ALTER TABLE public.product_status
      ADD CONSTRAINT product_status_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES public.product(product_id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'step_status_product_id_fkey'
      AND conrelid = 'public.step_status'::regclass
  ) THEN
    ALTER TABLE public.step_status
      ADD CONSTRAINT step_status_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES public.product(product_id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'step_status_test_id_fkey'
      AND conrelid = 'public.step_status'::regclass
  ) AND to_regclass('public.steps') IS NOT NULL THEN
    ALTER TABLE public.step_status
      ADD CONSTRAINT step_status_test_id_fkey
      FOREIGN KEY (test_id)
      REFERENCES public.steps(step_id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'step_status_parameter_id_fkey'
      AND conrelid = 'public.step_status'::regclass
  ) AND to_regclass('public.step_parameters') IS NOT NULL THEN
    ALTER TABLE public.step_status
      ADD CONSTRAINT step_status_parameter_id_fkey
      FOREIGN KEY (parameter_id)
      REFERENCES public.step_parameters(parameter_id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_status_product
ON public.product_status (product_id);

CREATE INDEX IF NOT EXISTS idx_step_status_product
ON public.step_status (product_id);

COMMIT;
