ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_presence_reason VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_devices_is_online_last_seen_at
  ON devices (is_online, last_seen_at DESC);
