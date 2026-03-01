INSERT INTO playlists (device_id, name, loop)
SELECT NULL, 'default-loop', TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM playlists
  WHERE device_id IS NULL AND name = 'default-loop'
);

INSERT INTO playlists (device_id, name, loop)
SELECT NULL, 'default-once', FALSE
WHERE NOT EXISTS (
  SELECT 1
  FROM playlists
  WHERE device_id IS NULL AND name = 'default-once'
);

WITH target_playlist AS (
  SELECT id
  FROM playlists
  WHERE device_id IS NULL AND name = 'default-loop'
  LIMIT 1
)
INSERT INTO playlist_items (playlist_id, media_url, media_type, duration, sort_order)
SELECT
  target_playlist.id,
  payload.media_url,
  payload.media_type,
  payload.duration,
  payload.sort_order
FROM target_playlist
CROSS JOIN (
  VALUES
    ('https://cdn.cemalturkcan.com/images/image1.jpg', 'image', 5, 0),
    ('https://cdn.cemalturkcan.com/videos/video1.mp4', 'video', NULL, 1),
    ('https://cdn.cemalturkcan.com/images/image2.jpg', 'image', 5, 2),
    ('https://cdn.cemalturkcan.com/videos/video2.mp4', 'video', NULL, 3)
) AS payload(media_url, media_type, duration, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM playlist_items
  WHERE playlist_id = target_playlist.id
);

WITH target_playlist AS (
  SELECT id
  FROM playlists
  WHERE device_id IS NULL AND name = 'default-once'
  LIMIT 1
)
INSERT INTO playlist_items (playlist_id, media_url, media_type, duration, sort_order)
SELECT
  target_playlist.id,
  payload.media_url,
  payload.media_type,
  payload.duration,
  payload.sort_order
FROM target_playlist
CROSS JOIN (
  VALUES
    ('https://cdn.cemalturkcan.com/images/image3.jpg', 'image', 5, 0),
    ('https://cdn.cemalturkcan.com/videos/video3.mp4', 'video', NULL, 1)
) AS payload(media_url, media_type, duration, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM playlist_items
  WHERE playlist_id = target_playlist.id
);
