CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(80) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allowed_registration_emails (
  id SERIAL PRIMARY KEY,
  email VARCHAR(160) UNIQUE NOT NULL,
  used_by_user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maps (
  id UUID PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  item_colors JSONB NOT NULL,
  color_names JSONB NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS map_shares (
  id SERIAL PRIMARY KEY,
  map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(map_id, shared_with_user_id)
);

CREATE TABLE IF NOT EXISTS et_history (
  requested_date DATE NOT NULL,
  data_label VARCHAR(20) NOT NULL,
  data_completa DATE,
  et VARCHAR(32) NOT NULL DEFAULT '0mm',
  temp_max VARCHAR(32) NOT NULL DEFAULT 'N/A',
  temp_min VARCHAR(32) NOT NULL DEFAULT 'N/A',
  imported_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (requested_date, data_label)
);

CREATE TABLE IF NOT EXISTS weather_station_history (
  requested_date DATE NOT NULL,
  reading_date DATE NOT NULL,
  precipitacao_mm VARCHAR(32) NOT NULL DEFAULT '0.00',
  et_mm VARCHAR(32) NOT NULL DEFAULT '0.00',
  temp_min_c VARCHAR(32) NOT NULL DEFAULT 'N/A',
  temp_max_c VARCHAR(32) NOT NULL DEFAULT 'N/A',
  imported_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (requested_date, reading_date)
);

CREATE INDEX IF NOT EXISTS idx_maps_owner ON maps(owner_id);
CREATE INDEX IF NOT EXISTS idx_shares_map ON map_shares(map_id);
CREATE INDEX IF NOT EXISTS idx_shares_user ON map_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_allowed_registration_emails_email ON allowed_registration_emails(email);
CREATE INDEX IF NOT EXISTS idx_et_history_requested_date ON et_history(requested_date DESC);
CREATE INDEX IF NOT EXISTS idx_et_history_imported_at ON et_history(imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_weather_station_history_requested_date ON weather_station_history(requested_date DESC);
CREATE INDEX IF NOT EXISTS idx_weather_station_history_imported_at ON weather_station_history(imported_at DESC);
