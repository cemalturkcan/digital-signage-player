CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  mqtt_username VARCHAR(255) NOT NULL,
  mqtt_password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS playlists (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  loop BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_playlists_device_id
    FOREIGN KEY (device_id)
    REFERENCES devices(device_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playlist_items (
  id SERIAL PRIMARY KEY,
  playlist_id INTEGER NOT NULL,
  media_url TEXT NOT NULL,
  media_type VARCHAR(50) NOT NULL,
  duration INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_playlist_items_playlist_id
    FOREIGN KEY (playlist_id)
    REFERENCES playlists(id)
    ON DELETE CASCADE
);


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION normalize_playlist_item_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.media_type = 'image' THEN
    NEW.duration := COALESCE(NEW.duration, 5);
  ELSIF NEW.media_type = 'video' THEN
    NEW.duration := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_playlists_updated_at ON playlists;
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_playlist_items_updated_at ON playlist_items;
CREATE TRIGGER update_playlist_items_updated_at
  BEFORE UPDATE ON playlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS normalize_playlist_item_duration_trigger ON playlist_items;
CREATE TRIGGER normalize_playlist_item_duration_trigger
  BEFORE INSERT OR UPDATE ON playlist_items
  FOR EACH ROW
  EXECUTE FUNCTION normalize_playlist_item_duration();
