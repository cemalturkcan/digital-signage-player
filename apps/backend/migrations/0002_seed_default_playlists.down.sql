DELETE FROM playlists
WHERE device_id IS NULL
  AND name IN ('default-loop', 'default-once');
