-- ============================================================
-- 18-new-schema-migration.sql
-- Migration vers la structure cible demandee par l'encadrant.
--
-- Les tables runtime existantes restent disponibles:
--   "user", role, rights, history, product, product_pipeline,
--   steps, step_parameters, sequences, sequence_steps,
--   product_parameters.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATION DES NOUVELLES TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.execution_mode (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.step (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    depends_on  INTEGER DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    created_by  VARCHAR(50),
    modified_by VARCHAR(50),
    modified_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT step_depends_on_fkey
      FOREIGN KEY (depends_on)
      REFERENCES public.step(id)
      ON DELETE SET NULL,
    CONSTRAINT step_no_self_dependency
      CHECK (depends_on IS NULL OR depends_on <> id)
);

CREATE TABLE IF NOT EXISTS public.step_param (
    id            SERIAL PRIMARY KEY,
    step_id       INTEGER NOT NULL,
    param_name    VARCHAR(255) NOT NULL,
    param_type    VARCHAR(20) NOT NULL CHECK (param_type IN ('float', 'int', 'string', 'boolean')),
    default_value VARCHAR(255),
    created_at    TIMESTAMP DEFAULT NOW(),

    CONSTRAINT step_param_step_id_fkey
      FOREIGN KEY (step_id)
      REFERENCES public.step(id)
      ON DELETE CASCADE,
    CONSTRAINT step_param_step_id_param_name_key
      UNIQUE (step_id, param_name)
);

CREATE TABLE IF NOT EXISTS public.step_limit (
    id              SERIAL PRIMARY KEY,
    step_id         INTEGER NOT NULL,
    limit_name      VARCHAR(255) NOT NULL,
    limit_type      VARCHAR(20) NOT NULL CHECK (limit_type IN ('PASS_FAIL', 'NUMERIC', 'STRING', 'BOOLEAN')),
    comparison_type VARCHAR(10) NOT NULL CHECK (comparison_type IN ('EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'RANGE')),
    limit_value     VARCHAR(255) DEFAULT NULL,
    limit_min       VARCHAR(255) DEFAULT NULL,
    limit_max       VARCHAR(255) DEFAULT NULL,
    unit            VARCHAR(50) DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),

    CONSTRAINT step_limit_step_id_fkey
      FOREIGN KEY (step_id)
      REFERENCES public.step(id)
      ON DELETE CASCADE,
    CONSTRAINT step_limit_range_values_chk
      CHECK (
        comparison_type <> 'RANGE'
        OR (limit_min IS NOT NULL AND limit_max IS NOT NULL)
      )
);

CREATE TABLE IF NOT EXISTS public."sequence" (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    depends_on  INTEGER DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),

    CONSTRAINT sequence_depends_on_fkey
      FOREIGN KEY (depends_on)
      REFERENCES public."sequence"(id)
      ON DELETE SET NULL,
    CONSTRAINT sequence_no_self_dependency
      CHECK (depends_on IS NULL OR depends_on <> id)
);

CREATE TABLE IF NOT EXISTS public.sequence_step (
    id            SERIAL PRIMARY KEY,
    sequence_id   INTEGER NOT NULL,
    step_id       INTEGER NOT NULL,
    order_index   INTEGER NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW(),

    CONSTRAINT sequence_step_sequence_id_fkey
      FOREIGN KEY (sequence_id)
      REFERENCES public."sequence"(id)
      ON DELETE CASCADE,
    CONSTRAINT sequence_step_step_id_fkey
      FOREIGN KEY (step_id)
      REFERENCES public.step(id)
      ON DELETE CASCADE,
    CONSTRAINT sequence_step_sequence_id_order_index_key
      UNIQUE (sequence_id, order_index)
);

CREATE TABLE IF NOT EXISTS public.product_sequence (
    id            SERIAL PRIMARY KEY,
    product_id    INTEGER NOT NULL,
    sequence_id   INTEGER NOT NULL,
    order_index   INTEGER NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW(),

    CONSTRAINT product_sequence_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES public.product(product_id)
      ON DELETE CASCADE,
    CONSTRAINT product_sequence_sequence_id_fkey
      FOREIGN KEY (sequence_id)
      REFERENCES public."sequence"(id)
      ON DELETE CASCADE,
    CONSTRAINT product_sequence_product_id_order_index_key
      UNIQUE (product_id, order_index)
);

CREATE TABLE IF NOT EXISTS public.product_step_param (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER NOT NULL,
    step_param_id   INTEGER NOT NULL,
    value           VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),

    CONSTRAINT product_step_param_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES public.product(product_id)
      ON DELETE CASCADE,
    CONSTRAINT product_step_param_step_param_id_fkey
      FOREIGN KEY (step_param_id)
      REFERENCES public.step_param(id)
      ON DELETE CASCADE,
    CONSTRAINT product_step_param_product_id_step_param_id_key
      UNIQUE (product_id, step_param_id)
);

CREATE TABLE IF NOT EXISTS public.product_execution_config (
    id                  SERIAL PRIMARY KEY,
    product_id          INTEGER NOT NULL,
    execution_mode_id   INTEGER NOT NULL,
    sequence_id         INTEGER DEFAULT NULL,
    step_id             INTEGER DEFAULT NULL,
    is_active           BOOLEAN DEFAULT TRUE,
    ignore_fail         BOOLEAN DEFAULT FALSE,
    retry_on_fail       INTEGER DEFAULT 0,
    repeat_count        INTEGER DEFAULT 1,
    retry_delay_ms      INTEGER DEFAULT 0,
    created_at          TIMESTAMP DEFAULT NOW(),

    CONSTRAINT product_execution_config_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES public.product(product_id)
      ON DELETE CASCADE,
    CONSTRAINT product_execution_config_execution_mode_id_fkey
      FOREIGN KEY (execution_mode_id)
      REFERENCES public.execution_mode(id),
    CONSTRAINT product_execution_config_sequence_id_fkey
      FOREIGN KEY (sequence_id)
      REFERENCES public."sequence"(id)
      ON DELETE CASCADE,
    CONSTRAINT product_execution_config_step_id_fkey
      FOREIGN KEY (step_id)
      REFERENCES public.step(id)
      ON DELETE CASCADE,
    CONSTRAINT product_execution_config_target_chk
      CHECK (
        (sequence_id IS NOT NULL AND step_id IS NULL)
        OR (sequence_id IS NULL AND step_id IS NOT NULL)
      ),
    CONSTRAINT product_execution_config_retry_chk
      CHECK (retry_on_fail >= 0 AND repeat_count >= 1 AND retry_delay_ms >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS product_execution_config_sequence_key
ON public.product_execution_config (product_id, execution_mode_id, sequence_id)
WHERE sequence_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS product_execution_config_step_key
ON public.product_execution_config (product_id, execution_mode_id, step_id)
WHERE step_id IS NOT NULL;

-- ============================================================
-- 2. DONNEES INITIALES
-- ============================================================

INSERT INTO public.execution_mode (name, description) VALUES
('PROD', 'Mode production standard'),
('RNR', 'Mode Run and Record'),
('RETEST', 'Mode re-test apres echec'),
('DEBUG', 'Mode debug developpement')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 3. MIGRATION DES DONNEES EXISTANTES
-- ============================================================

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
              THEN CONCAT(s.name, ' #', s.step_id::text)
            ELSE s.name
          END AS normalized_name,
          s.description,
          s.created_at
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
        s.sequence_id,
        s.name,
        s.description,
        COALESCE(s.created_at, NOW())
      FROM public.sequences s
      ON CONFLICT (id) DO UPDATE
      SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        created_at = COALESCE(public."sequence".created_at, EXCLUDED.created_at)
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.sequence_steps') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.sequence_step (sequence_id, step_id, order_index, created_at)
      SELECT
        ss.sequence_id,
        ss.step_id,
        ss."position",
        COALESCE(ss.created_at, NOW())
      FROM public.sequence_steps ss
      WHERE EXISTS (SELECT 1 FROM public."sequence" sq WHERE sq.id = ss.sequence_id)
        AND EXISTS (SELECT 1 FROM public.step st WHERE st.id = ss.step_id)
      ON CONFLICT (sequence_id, order_index) DO UPDATE
      SET
        step_id = EXCLUDED.step_id,
        created_at = COALESCE(public.sequence_step.created_at, EXCLUDED.created_at)
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.step_parameters') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.step_param (step_id, param_name, param_type, default_value, created_at)
      SELECT
        sp.step_id,
        sp.name,
        CASE sp.vtype
          WHEN 1 THEN 'string'
          WHEN 2 THEN 'int'
          WHEN 3 THEN 'float'
          WHEN 4 THEN 'boolean'
          ELSE 'string'
        END,
        sp.value,
        COALESCE(sp.created_at, NOW())
      FROM public.step_parameters sp
      WHERE sp.step_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.step st WHERE st.id = sp.step_id)
      ON CONFLICT (step_id, param_name) DO UPDATE
      SET
        param_type = EXCLUDED.param_type,
        default_value = EXCLUDED.default_value,
        created_at = COALESCE(public.step_param.created_at, EXCLUDED.created_at)
    $sql$;
  END IF;
END $$;

INSERT INTO public.product_sequence (product_id, sequence_id, order_index, created_at)
SELECT
  pp.product_id,
  pp.sequence_id,
  pp."position",
  COALESCE(pp.created_at, NOW())
FROM public.product_pipeline pp
WHERE pp.zone = 'SEQUENCE'
  AND pp.sequence_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.product p WHERE p.product_id = pp.product_id)
  AND EXISTS (SELECT 1 FROM public."sequence" sq WHERE sq.id = pp.sequence_id)
ON CONFLICT (product_id, order_index) DO UPDATE
SET
  sequence_id = EXCLUDED.sequence_id,
  created_at = COALESCE(public.product_sequence.created_at, EXCLUDED.created_at);

INSERT INTO public.product_step_param (product_id, step_param_id, value, created_at)
SELECT
  pp.product_id,
  sp.id,
  pp.value,
  COALESCE(pp.created_at, NOW())
FROM public.product_parameters pp
JOIN public.step_param sp
  ON sp.param_name = pp.name
WHERE pp.value IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.product p WHERE p.product_id = pp.product_id)
ON CONFLICT (product_id, step_param_id) DO UPDATE
SET
  value = EXCLUDED.value,
  created_at = COALESCE(public.product_step_param.created_at, EXCLUDED.created_at);

INSERT INTO public.product_execution_config (
  product_id,
  execution_mode_id,
  sequence_id,
  step_id,
  created_at
)
SELECT
  pp.product_id,
  em.id,
  CASE WHEN pp.sequence_id IS NOT NULL THEN pp.sequence_id ELSE NULL END,
  CASE WHEN pp.step_id IS NOT NULL THEN pp.step_id ELSE NULL END,
  COALESCE(pp.created_at, NOW())
FROM public.product_pipeline pp
CROSS JOIN public.execution_mode em
WHERE em.name = 'PROD'
  AND (
    (pp.sequence_id IS NOT NULL AND EXISTS (SELECT 1 FROM public."sequence" sq WHERE sq.id = pp.sequence_id))
    OR
    (pp.step_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.step st WHERE st.id = pp.step_id))
  )
ON CONFLICT DO NOTHING;

-- Les sequences SERIAL doivent repartir apres les identifiants migres.
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

-- ============================================================
-- 4. INDEX POUR OPTIMISATION
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_step_depends_on
ON public.step (depends_on);

CREATE INDEX IF NOT EXISTS idx_step_param_step_id
ON public.step_param (step_id);

CREATE INDEX IF NOT EXISTS idx_step_limit_step_id
ON public.step_limit (step_id);

CREATE INDEX IF NOT EXISTS idx_sequence_depends_on
ON public."sequence" (depends_on);

CREATE INDEX IF NOT EXISTS idx_sequence_step_order
ON public.sequence_step (sequence_id, order_index);

CREATE INDEX IF NOT EXISTS idx_product_sequence_order
ON public.product_sequence (product_id, order_index);

CREATE INDEX IF NOT EXISTS idx_product_step_param_product
ON public.product_step_param (product_id);

CREATE INDEX IF NOT EXISTS idx_exec_config_product
ON public.product_execution_config (product_id);

CREATE INDEX IF NOT EXISTS idx_exec_config_mode
ON public.product_execution_config (execution_mode_id);

-- ============================================================
-- 5. VERIFICATION
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Nouvelle structure creee/migree: % steps, % sequences, % produits, % sequence_steps, % step_params',
    (SELECT COUNT(*) FROM public.step),
    (SELECT COUNT(*) FROM public."sequence"),
    (SELECT COUNT(*) FROM public.product),
    (SELECT COUNT(*) FROM public.sequence_step),
    (SELECT COUNT(*) FROM public.step_param);
END $$;

COMMIT;
