ALTER TABLE users
  ADD COLUMN IF NOT EXISTS steam_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_steam_id_unique
  ON users (steam_id)
  WHERE steam_id IS NOT NULL;
