-- Users (email/password SaaS auth)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT,
  password_hash TEXT,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill/upgrade legacy `users` table (e.g. steam_id-based) to email/password auth shape.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE users
  ALTER COLUMN created_at SET DEFAULT now();

UPDATE users
SET created_at = COALESCE(created_at, now())
WHERE created_at IS NULL;

-- Ensure every legacy user has a unique placeholder email.
-- Prefer steam-based email if steam_id exists, otherwise fall back to id-based.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'steam_id'
  ) THEN
    EXECUTE $q$
      UPDATE users
      SET email = COALESCE(
        email,
        'steam_' || steam_id::text || '@local'
      )
      WHERE email IS NULL
    $q$;
  ELSE
    UPDATE users
    SET email = COALESCE(email, 'user_' || id::text || '@local')
    WHERE email IS NULL;
  END IF;
END $$;

-- Legacy users won't be able to login until they re-register; we still need a non-null value.
UPDATE users
SET password_hash = COALESCE(password_hash, 'DISABLED_LEGACY')
WHERE password_hash IS NULL;

ALTER TABLE users
  ALTER COLUMN email SET NOT NULL;

ALTER TABLE users
  ALTER COLUMN password_hash SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_email_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

-- Legacy default user for existing flips (so user_id can be NOT NULL)
INSERT INTO users (email, password_hash)
SELECT 'legacy@local', 'DISABLED_LEGACY'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'legacy@local');

-- Flips: multi-tenant + defaults + indexes
ALTER TABLE flips
  ADD COLUMN IF NOT EXISTS user_id integer;

ALTER TABLE flips
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE flips
  ALTER COLUMN created_at SET DEFAULT now();

UPDATE flips
SET created_at = COALESCE(created_at, now())
WHERE created_at IS NULL;

ALTER TABLE flips
  ALTER COLUMN created_at SET NOT NULL;

UPDATE flips
SET user_id = COALESCE(user_id, (SELECT id FROM users WHERE email = 'legacy@local'))
WHERE user_id IS NULL;

ALTER TABLE flips
  ALTER COLUMN user_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flips_user_id_fkey'
  ) THEN
    ALTER TABLE flips
      ADD CONSTRAINT flips_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flips_user_created_at ON flips (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flips_user_profit ON flips (user_id, profit DESC);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skin TEXT NOT NULL,
  purchase_price numeric NOT NULL,
  current_price numeric NOT NULL,
  quantity integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_user_created_at ON inventory (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_user_skin ON inventory (user_id, skin);
