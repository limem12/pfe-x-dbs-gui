BEGIN;

CREATE TEMP TABLE tmp_user_username_dedup_map
ON COMMIT DROP AS
SELECT
  user_id,
  username,
  FIRST_VALUE(user_id) OVER (
    PARTITION BY LOWER(username)
    ORDER BY user_id
  ) AS canonical_user_id,
  ROW_NUMBER() OVER (
    PARTITION BY LOWER(username)
    ORDER BY user_id
  ) AS duplicate_rank
FROM public."user";

UPDATE public.history h
SET user_id = m.canonical_user_id
FROM tmp_user_username_dedup_map m
WHERE h.user_id = m.user_id
  AND m.duplicate_rank > 1;

UPDATE public.sequences s
SET user_id = m.canonical_user_id
FROM tmp_user_username_dedup_map m
WHERE s.user_id = m.user_id
  AND m.duplicate_rank > 1;

UPDATE public.sequence_steps ss
SET user_id = m.canonical_user_id
FROM tmp_user_username_dedup_map m
WHERE ss.user_id = m.user_id
  AND m.duplicate_rank > 1;

UPDATE public.product_masters pm
SET user_id = m.canonical_user_id
FROM tmp_user_username_dedup_map m
WHERE pm.user_id = m.user_id
  AND m.duplicate_rank > 1;

UPDATE public.product_parameters pp
SET user_id = m.canonical_user_id
FROM tmp_user_username_dedup_map m
WHERE pp.user_id = m.user_id
  AND m.duplicate_rank > 1;

UPDATE public.product_types pt
SET user_id = m.canonical_user_id
FROM tmp_user_username_dedup_map m
WHERE pt.user_id = m.user_id
  AND m.duplicate_rank > 1;

UPDATE public.sequence_parameters sp
SET user_id = m.canonical_user_id
FROM tmp_user_username_dedup_map m
WHERE sp.user_id = m.user_id
  AND m.duplicate_rank > 1;

UPDATE public.step_parameters sp
SET user_id = m.canonical_user_id
FROM tmp_user_username_dedup_map m
WHERE sp.user_id = m.user_id
  AND m.duplicate_rank > 1;

UPDATE public.steps s
SET user_id = m.canonical_user_id
FROM tmp_user_username_dedup_map m
WHERE s.user_id = m.user_id
  AND m.duplicate_rank > 1;

UPDATE public."user" u
SET admin_id = m.canonical_user_id
FROM tmp_user_username_dedup_map m
WHERE u.admin_id = m.user_id
  AND m.duplicate_rank > 1;

DELETE FROM public."user" u
USING tmp_user_username_dedup_map m
WHERE u.user_id = m.user_id
  AND m.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_username_lower
ON public."user" (LOWER(username));

COMMIT;
