CREATE TABLE IF NOT EXISTS flip_history (
  id SERIAL PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skin_name text NOT NULL,
  buy_price numeric NOT NULL,
  sell_price_expected numeric NOT NULL,
  sell_price_actual numeric,
  profit_expected numeric NOT NULL,
  profit_actual numeric,
  source_buy text NOT NULL,
  source_sell text NOT NULL,
  status text NOT NULL DEFAULT 'tracked' CHECK (status IN ('tracked', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_flip_history_user_created_at
  ON flip_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_flip_history_user_status_created_at
  ON flip_history (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_flip_history_user_completed_at
  ON flip_history (user_id, completed_at DESC);
