DROP TRIGGER IF EXISTS update_playlist_items_updated_at ON playlist_items;
DROP TRIGGER IF EXISTS normalize_playlist_item_duration_trigger ON playlist_items;
DROP TRIGGER IF EXISTS update_playlists_updated_at ON playlists;
DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;

DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS normalize_playlist_item_duration();

DROP TABLE IF EXISTS playlist_items;
DROP TABLE IF EXISTS playlists;
DROP TABLE IF EXISTS devices;
