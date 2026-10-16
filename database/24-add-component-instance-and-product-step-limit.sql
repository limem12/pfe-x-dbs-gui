-- ============================================================
-- 24-add-component-instance-and-product-step-limit.sql
-- Ajout des tables demandees par le schema encadrant:
--   - component_instance
--   - product_step_limit
--   - step_limit.description
-- ============================================================

BEGIN;

ALTER TABLE public.step_limit
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.component_instance (
    id             SERIAL PRIMARY KEY,
    product_id     INTEGER NOT NULL,
    step_id        INTEGER NOT NULL,
    instance_index INTEGER NOT NULL,
    instance_name  VARCHAR(100) NOT NULL,
    description    TEXT DEFAULT NULL,
    physical_ref   VARCHAR(50) DEFAULT NULL,
    is_active      BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT NOW(),

    CONSTRAINT component_instance_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES public.product(product_id)
      ON DELETE CASCADE,

    CONSTRAINT component_instance_step_id_fkey
      FOREIGN KEY (step_id)
      REFERENCES public.step(id)
      ON DELETE CASCADE,

    CONSTRAINT component_instance_product_step_name_key
      UNIQUE (product_id, step_id, instance_name)
);

CREATE TABLE IF NOT EXISTS public.product_step_limit (
    id                    SERIAL PRIMARY KEY,
    component_instance_id INTEGER NOT NULL,
    step_limit_id         INTEGER NOT NULL,
    limit_value           VARCHAR(255) DEFAULT NULL,
    limit_min             VARCHAR(255) DEFAULT NULL,
    limit_max             VARCHAR(255) DEFAULT NULL,
    is_active             BOOLEAN DEFAULT TRUE,
    execution_mode_id     INTEGER DEFAULT NULL,
    created_at            TIMESTAMP DEFAULT NOW(),
    updated_at            TIMESTAMP DEFAULT NOW(),

    CONSTRAINT product_step_limit_component_instance_id_fkey
      FOREIGN KEY (component_instance_id)
      REFERENCES public.component_instance(id)
      ON DELETE CASCADE,

    CONSTRAINT product_step_limit_step_limit_id_fkey
      FOREIGN KEY (step_limit_id)
      REFERENCES public.step_limit(id)
      ON DELETE CASCADE,

    CONSTRAINT product_step_limit_execution_mode_id_fkey
      FOREIGN KEY (execution_mode_id)
      REFERENCES public.execution_mode(id)
      ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS product_step_limit_default_key
ON public.product_step_limit (component_instance_id, step_limit_id)
WHERE execution_mode_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS product_step_limit_mode_key
ON public.product_step_limit (
  component_instance_id,
  step_limit_id,
  execution_mode_id
)
WHERE execution_mode_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_component_instance_product_step
ON public.component_instance (product_id, step_id);

CREATE INDEX IF NOT EXISTS idx_product_step_limit_component
ON public.product_step_limit (component_instance_id);

CREATE INDEX IF NOT EXISTS idx_product_step_limit_step_limit
ON public.product_step_limit (step_limit_id);

COMMIT;
