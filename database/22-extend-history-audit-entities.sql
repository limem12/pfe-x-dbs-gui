-- ============================================================
-- 22-extend-history-audit-entities.sql
-- Autorise l'historique global pour les nouvelles entites CRUD.
-- ============================================================

BEGIN;

ALTER TABLE public.history
  DROP CONSTRAINT IF EXISTS history_entity_check;

ALTER TABLE public.history
  ADD CONSTRAINT history_entity_check
  CHECK (
    entity IN (
      'Step',
      'StepParam',
      'StepLimit',
      'Sequence',
      'SequenceStep',
      'Produit',
      'ProductSequence',
      'ProductStepParam',
      'ComponentInstance',
      'ProductStepLimit',
      'ExecutionConfig',
      'ModeExecution',
      'ProductCounter',
      'ProductStatus',
      'Status',
      'StepStatus',
      'User',
      'Role',
      'Right',
      'Avatar'
    )
  );

COMMIT;
