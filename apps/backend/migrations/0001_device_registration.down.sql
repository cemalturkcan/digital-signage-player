-- Drop triggers
DROP TRIGGER IF EXISTS update_playlist_items_updated_at ON playlist_items;
DROP TRIGGER IF EXISTS update_playlists_updated_at ON playlists;
DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_playlist_items_sort_order;
DROP INDEX IF EXISTS idx_playlist_items_playlist_id;
DROP INDEX IF EXISTS idx_playlists_device_id;
DROP INDEX IF EXISTS idx_devices_mqtt_username;
DROP INDEX IF EXISTS idx_devices_device_id;

-- Drop tables in dependency-safe order
DROP TABLE IF EXISTS playlist_items;
DROP TABLE IF EXISTS playlists;
DROP TABLE IF EXISTS devices;
