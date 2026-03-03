DROP INDEX IF EXISTS idx_devices_is_online_last_seen_at;

ALTER TABLE devices
  DROP COLUMN IF EXISTS last_presence_reason,
  DROP COLUMN IF EXISTS last_seen_at,
  DROP COLUMN IF EXISTS is_online;
