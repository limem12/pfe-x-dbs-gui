BEGIN;

ALTER TABLE public.rights
ADD COLUMN IF NOT EXISTS module VARCHAR(50);

UPDATE public.rights
SET module = 'X-DBS-GUI'
WHERE module IS NULL;

COMMIT;
