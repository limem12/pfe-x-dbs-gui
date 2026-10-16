BEGIN;

ALTER TABLE public.component_instance
  DROP CONSTRAINT IF EXISTS component_instance_product_step_name_key;

CREATE INDEX IF NOT EXISTS idx_component_instance_product_step_name
ON public.component_instance (product_id, step_id, instance_name);

COMMIT;
