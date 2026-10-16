DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user'
      AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user'
      AND column_name = 'username'
  ) THEN
    ALTER TABLE public."user" RENAME COLUMN name TO username;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user'
      AND column_name = 'role'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user'
      AND column_name = 'role_name'
  ) THEN
    ALTER TABLE public."user" RENAME COLUMN role TO role_name;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_new_pkey'
      AND conrelid = 'public."user"'::regclass
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_pkey'
  ) THEN
    ALTER TABLE public."user" RENAME CONSTRAINT user_new_pkey TO user_pkey;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.role (
  role_name character varying(50) PRIMARY KEY,
  description text,
  rights text[] DEFAULT '{}'::text[] NOT NULL,
  created_at timestamp without time zone DEFAULT now()
);

ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS password character varying(255),
  ADD COLUMN IF NOT EXISTS email character varying(100),
  ADD COLUMN IF NOT EXISTS phone character varying(20),
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS last_login timestamp without time zone,
  ADD COLUMN IF NOT EXISTS admin_id integer,
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now();

ALTER TABLE public."user"
  ALTER COLUMN role_name TYPE character varying(50),
  ALTER COLUMN role_name SET DEFAULT 'Utilisateur',
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN updated_at SET DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_parameters'
  ) THEN
    UPDATE public."user" u
    SET
      password = COALESCE(u.password, up.password),
      admin_id = COALESCE(u.admin_id, up.admin_id),
      updated_at = COALESCE(u.updated_at, up.updated_at, now())
    FROM public.user_parameters up
    WHERE up.user_id = u.user_id;
  END IF;

  UPDATE public."user"
  SET
    updated_at = COALESCE(updated_at, created_at, now()),
    role_name = COALESCE(role_name, 'Utilisateur');
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_rights_labels'
  ) THEN
    INSERT INTO public.role (role_name, description, rights, created_at)
    SELECT
      u.role_name,
      CASE
        WHEN u.role_name = 'Admin' THEN 'Administrateur'
        WHEN u.role_name = 'Utilisateur' THEN 'Utilisateur standard'
        ELSE 'Role migre'
      END,
      CASE
        WHEN COUNT(url.right_label) = 0 AND u.role_name = 'Admin' THEN
          ARRAY['Voir Data', 'Editer Produit', 'Editer Step', 'Editer Sequence', 'Gerer Users']::text[]
        WHEN COUNT(url.right_label) = 0 AND u.role_name = 'Utilisateur' THEN
          ARRAY['Voir Data']::text[]
        ELSE
          COALESCE(
            array_agg(DISTINCT url.right_label ORDER BY url.right_label)
              FILTER (WHERE url.right_label IS NOT NULL),
            ARRAY[]::text[]
          )
      END,
      now()
    FROM public."user" u
    LEFT JOIN public.user_rights_labels url ON url.user_id = u.user_id
    GROUP BY u.role_name
    ON CONFLICT (role_name) DO UPDATE
    SET
      description = EXCLUDED.description,
      rights = EXCLUDED.rights;
  END IF;

  INSERT INTO public.role (role_name, description, rights, created_at)
  VALUES
    ('Admin', 'Administrateur', ARRAY['Voir Data', 'Editer Produit', 'Editer Step', 'Editer Sequence', 'Gerer Users']::text[], now()),
    ('Utilisateur', 'Utilisateur standard', ARRAY['Voir Data']::text[], now())
  ON CONFLICT (role_name) DO NOTHING;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_role_name_fkey'
  ) THEN
    ALTER TABLE public."user"
      ADD CONSTRAINT user_role_name_fkey
      FOREIGN KEY (role_name) REFERENCES public.role(role_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_admin_id_fkey'
  ) THEN
    ALTER TABLE public."user"
      ADD CONSTRAINT user_admin_id_fkey
      FOREIGN KEY (admin_id) REFERENCES public."user"(user_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_username ON public."user" (username);
CREATE INDEX IF NOT EXISTS idx_user_role ON public."user" (role_name);
CREATE INDEX IF NOT EXISTS idx_user_email ON public."user" (email);

ALTER TABLE public."user"
  ALTER COLUMN username SET NOT NULL,
  ALTER COLUMN password SET NOT NULL,
  ALTER COLUMN role_name SET NOT NULL;

CREATE SEQUENCE IF NOT EXISTS public.user_user_id_seq;

ALTER SEQUENCE public.user_user_id_seq OWNED BY public."user".user_id;

ALTER TABLE public."user"
  ALTER COLUMN user_id SET DEFAULT nextval('public.user_user_id_seq'::regclass);

SELECT setval(
  'public.user_user_id_seq',
  COALESCE((SELECT MAX(user_id) FROM public."user"), 0) + 1,
  false
);

DROP TABLE IF EXISTS public.user_rights_labels;
DROP TABLE IF EXISTS public.user_parameters;
