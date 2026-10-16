BEGIN;

DROP TABLE IF EXISTS public.user_backup;
ALTER TABLE IF EXISTS public."user" RENAME TO user_backup;

ALTER TABLE IF EXISTS public.user_backup
    ADD COLUMN IF NOT EXISTS username VARCHAR(50),
    ADD COLUMN IF NOT EXISTS name VARCHAR(50),
    ADD COLUMN IF NOT EXISTS password VARCHAR(255),
    ADD COLUMN IF NOT EXISTS role VARCHAR(50),
    ADD COLUMN IF NOT EXISTS role_name VARCHAR(50),
    ADD COLUMN IF NOT EXISTS rights TEXT[] DEFAULT ARRAY[]::text[],
    ADD COLUMN IF NOT EXISTS email VARCHAR(100),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS admin_id INTEGER,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();

DROP TABLE IF EXISTS public.role_backup;
ALTER TABLE IF EXISTS public.role RENAME TO role_backup;

CREATE TABLE IF NOT EXISTS public.rights (
    id_right VARCHAR(50) PRIMARY KEY,
    description TEXT,
    module VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role (
    id_role VARCHAR(50) PRIMARY KEY,
    description TEXT,
    rights TEXT[] DEFAULT '{}'::text[] NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."user" (
    username VARCHAR(50) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL REFERENCES public.role(id_role) ON DELETE RESTRICT,
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    avatar TEXT,
    status VARCHAR(20) DEFAULT 'ENABLED',
    last_login TIMESTAMP WITHOUT TIME ZONE,
    admin_id VARCHAR(50) REFERENCES public."user"(username) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT user_status_check CHECK (status IN ('ENABLED', 'DISABLED'))
);

CREATE INDEX IF NOT EXISTS idx_user_role ON public."user"(role);
CREATE INDEX IF NOT EXISTS idx_user_status ON public."user"(status);
CREATE INDEX IF NOT EXISTS idx_user_email ON public."user"(email);
CREATE INDEX IF NOT EXISTS idx_user_last_login ON public."user"(last_login);
CREATE INDEX IF NOT EXISTS idx_role_rights ON public.role USING GIN (rights);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_username_lower_unique
ON public."user" (LOWER(username));

INSERT INTO public.rights (id_right, description, module) VALUES
    ('VIEW_DATA', 'Peut consulter toutes les donnees', 'X-DBS-GUI'),
    ('EDIT_PRODUCT', 'Peut creer, modifier et supprimer des produits', 'X-DBS-GUI'),
    ('EDIT_STEP', 'Peut creer, modifier et supprimer des steps', 'X-DBS-GUI'),
    ('EDIT_SEQUENCE', 'Peut creer, modifier et supprimer des sequences', 'X-DBS-GUI'),
    ('MANAGE_USERS', 'Peut gerer les utilisateurs et les roles', 'X-DBS-GUI')
ON CONFLICT (id_right) DO UPDATE
SET description = EXCLUDED.description,
    module = COALESCE(public.rights.module, EXCLUDED.module);

INSERT INTO public.role (id_role, description, rights) VALUES
    ('ADMIN', 'Administrateur avec tous les droits',
     ARRAY['VIEW_DATA', 'EDIT_PRODUCT', 'EDIT_STEP', 'EDIT_SEQUENCE', 'MANAGE_USERS']),
    ('USER', 'Utilisateur standard',
     ARRAY['VIEW_DATA'])
ON CONFLICT (id_role) DO UPDATE
SET description = EXCLUDED.description,
    rights = EXCLUDED.rights,
    updated_at = NOW();

INSERT INTO public."user" (
    username,
    password,
    role,
    email,
    phone,
    address,
    status,
    last_login,
    admin_id,
    created_at,
    updated_at
)
SELECT
    TRIM(COALESCE(u.username, u.name, CONCAT('user_', u.user_id::text))),
    COALESCE(u.password, ''),
    CASE
        WHEN COALESCE(u.role_name, u.role, 'Utilisateur') ILIKE 'Admin'
          OR COALESCE(u.rights, ARRAY[]::text[]) && ARRAY['Gerer Users']::text[]
        THEN 'ADMIN'
        ELSE 'USER'
    END,
    u.email,
    u.phone,
    u.address,
    CASE WHEN COALESCE(u.is_active, TRUE) THEN 'ENABLED' ELSE 'DISABLED' END,
    u.last_login,
    backup_admin.username,
    COALESCE(u.created_at, NOW()),
    NOW()
FROM public.user_backup u
LEFT JOIN public.user_backup backup_admin
  ON backup_admin.user_id = u.admin_id
WHERE COALESCE(u.username, u.name, '') <> ''
ON CONFLICT (username) DO NOTHING;

ALTER TABLE public.history ADD COLUMN IF NOT EXISTS user_name VARCHAR(50);
UPDATE public.history h
SET user_name = new_u.username
FROM public.user_backup old_u
JOIN public."user" new_u
  ON LOWER(new_u.username) = LOWER(COALESCE(old_u.username, old_u.name))
WHERE h.user_id = old_u.user_id
  AND (h.user_name IS NULL OR h.user_name = '');

ALTER TABLE public.product_types ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);
UPDATE public.product_types pt
SET created_by = new_u.username
FROM public.user_backup old_u
JOIN public."user" new_u
  ON LOWER(new_u.username) = LOWER(COALESCE(old_u.username, old_u.name))
WHERE pt.user_id = old_u.user_id
  AND (pt.created_by IS NULL OR pt.created_by = '');

ALTER TABLE public.steps ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);
UPDATE public.steps s
SET created_by = new_u.username
FROM public.user_backup old_u
JOIN public."user" new_u
  ON LOWER(new_u.username) = LOWER(COALESCE(old_u.username, old_u.name))
WHERE s.user_id = old_u.user_id
  AND (s.created_by IS NULL OR s.created_by = '');

ALTER TABLE public.sequences ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);
UPDATE public.sequences s
SET created_by = new_u.username
FROM public.user_backup old_u
JOIN public."user" new_u
  ON LOWER(new_u.username) = LOWER(COALESCE(old_u.username, old_u.name))
WHERE s.user_id = old_u.user_id
  AND (s.created_by IS NULL OR s.created_by = '');

ALTER TABLE public.sequence_steps ADD COLUMN IF NOT EXISTS modified_by VARCHAR(50);
UPDATE public.sequence_steps ss
SET modified_by = new_u.username
FROM public.user_backup old_u
JOIN public."user" new_u
  ON LOWER(new_u.username) = LOWER(COALESCE(old_u.username, old_u.name))
WHERE ss.user_id = old_u.user_id
  AND (ss.modified_by IS NULL OR ss.modified_by = '');

ALTER TABLE public.product_parameters ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);
UPDATE public.product_parameters pp
SET created_by = new_u.username
FROM public.user_backup old_u
JOIN public."user" new_u
  ON LOWER(new_u.username) = LOWER(COALESCE(old_u.username, old_u.name))
WHERE pp.user_id = old_u.user_id
  AND (pp.created_by IS NULL OR pp.created_by = '');

ALTER TABLE public.step_parameters ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);
UPDATE public.step_parameters sp
SET created_by = new_u.username
FROM public.user_backup old_u
JOIN public."user" new_u
  ON LOWER(new_u.username) = LOWER(COALESCE(old_u.username, old_u.name))
WHERE sp.user_id = old_u.user_id
  AND (sp.created_by IS NULL OR sp.created_by = '');

DO $$
BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'history_user_name_fkey'
    ) THEN
      ALTER TABLE public.history
        ADD CONSTRAINT history_user_name_fkey
        FOREIGN KEY (user_name) REFERENCES public."user"(username) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'product_types_created_by_fkey'
    ) THEN
      ALTER TABLE public.product_types
        ADD CONSTRAINT product_types_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public."user"(username) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'steps_created_by_fkey'
    ) THEN
      ALTER TABLE public.steps
        ADD CONSTRAINT steps_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public."user"(username) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'sequences_created_by_fkey'
    ) THEN
      ALTER TABLE public.sequences
        ADD CONSTRAINT sequences_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public."user"(username) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'sequence_steps_modified_by_fkey'
    ) THEN
      ALTER TABLE public.sequence_steps
        ADD CONSTRAINT sequence_steps_modified_by_fkey
        FOREIGN KEY (modified_by) REFERENCES public."user"(username) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'product_parameters_created_by_fkey'
    ) THEN
      ALTER TABLE public.product_parameters
        ADD CONSTRAINT product_parameters_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public."user"(username) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'step_parameters_created_by_fkey'
    ) THEN
      ALTER TABLE public.step_parameters
        ADD CONSTRAINT step_parameters_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public."user"(username) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE public.history DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.product_types DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.steps DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.sequences DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.sequence_steps DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.product_parameters DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.step_parameters DROP COLUMN IF EXISTS user_id;

DO $$
BEGIN
    RAISE NOTICE '=== VERIFICATIONS POST-MIGRATION ===';
    RAISE NOTICE 'Nombre d''utilisateurs: %', (SELECT COUNT(*) FROM public."user");
    RAISE NOTICE 'Nombre de roles: %', (SELECT COUNT(*) FROM public.role);
    RAISE NOTICE 'Nombre de droits: %', (SELECT COUNT(*) FROM public.rights);
END $$;

COMMIT;
