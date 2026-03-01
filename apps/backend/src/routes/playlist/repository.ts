import type { MediaItem, Playlist, PlaylistResponse } from '@signage/contracts'
import { db } from '@/app/db/db.js'

interface PlaylistWithItemsRow {
  id: number
  loop: boolean
  created_at: number
  updated_at: number
  total_count: number
  items: unknown
}

interface PlaylistDetailsRow {
  id: number
  loop: boolean
  created_at: number
  updated_at: number
  items: unknown
}

interface PlaylistItemJson {
  id: string
  type: 'image' | 'video'
  url: string
  order: number
  duration?: number | null
}

const SELECT_PLAYLISTS_WITH_ITEMS_BY_DEVICE_ID = `WITH filtered_playlists AS (
  SELECT
    id,
    loop,
    created_at,
    updated_at,
    COUNT(*) OVER()::int AS total_count
  FROM playlists
  WHERE device_id IS NULL OR device_id = $1
  ORDER BY updated_at DESC, id DESC
), paged_playlists AS (
  SELECT *
  FROM filtered_playlists
  LIMIT $2 OFFSET $3
)
SELECT
  paged_playlists.id,
  paged_playlists.loop,
  (EXTRACT(EPOCH FROM paged_playlists.created_at) * 1000)::double precision AS created_at,
  (EXTRACT(EPOCH FROM paged_playlists.updated_at) * 1000)::double precision AS updated_at,
  paged_playlists.total_count,
  COALESCE(
    json_agg(
      json_build_object(
        'id', playlist_items.id::text,
        'type', playlist_items.media_type,
        'url', playlist_items.media_url,
        'duration', playlist_items.duration,
        'order', playlist_items.sort_order
      )
      ORDER BY playlist_items.sort_order ASC, playlist_items.id ASC
    ) FILTER (WHERE playlist_items.id IS NOT NULL),
    '[]'::json
  ) AS items
FROM paged_playlists
LEFT JOIN playlist_items ON playlist_items.playlist_id = paged_playlists.id
GROUP BY paged_playlists.id, paged_playlists.loop, paged_playlists.created_at, paged_playlists.updated_at, paged_playlists.total_count
ORDER BY paged_playlists.updated_at DESC, paged_playlists.id DESC`

const SELECT_PLAYLIST_BY_ID = `WITH target_playlist AS (
  SELECT id, loop, created_at, updated_at
  FROM playlists
  WHERE id = $1
    AND (device_id IS NULL OR device_id = $2)
  LIMIT 1
)
SELECT
  target_playlist.id,
  target_playlist.loop,
  (EXTRACT(EPOCH FROM target_playlist.created_at) * 1000)::double precision AS created_at,
  (EXTRACT(EPOCH FROM target_playlist.updated_at) * 1000)::double precision AS updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'id', playlist_items.id::text,
        'type', playlist_items.media_type,
        'url', playlist_items.media_url,
        'duration', playlist_items.duration,
        'order', playlist_items.sort_order
      )
      ORDER BY playlist_items.sort_order ASC, playlist_items.id ASC
    ) FILTER (WHERE playlist_items.id IS NOT NULL),
    '[]'::json
  ) AS items
FROM target_playlist
LEFT JOIN playlist_items ON playlist_items.playlist_id = target_playlist.id
GROUP BY target_playlist.id, target_playlist.loop, target_playlist.created_at, target_playlist.updated_at`

function mapItems(value: unknown): MediaItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  const items: MediaItem[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') {
      continue
    }

    const item = raw as PlaylistItemJson
    if (
      typeof item.id !== 'string'
      || (item.type !== 'image' && item.type !== 'video')
      || typeof item.url !== 'string'
      || typeof item.order !== 'number'
    ) {
      continue
    }

    items.push({
      id: item.id,
      type: item.type,
      url: item.url,
      duration: item.duration,
      order: item.order,
    })
  }

  return items
}

function mapRowToPlaylist(row: PlaylistDetailsRow): Playlist {
  return {
    id: String(row.id),
    loop: row.loop,
    createdAt: Math.trunc(row.created_at),
    updatedAt: Math.trunc(row.updated_at),
    items: mapItems(row.items),
  }
}

function mapRowsToPlaylists(rows: PlaylistWithItemsRow[]): Playlist[] {
  return rows.map(row => mapRowToPlaylist(row))
}

export interface PlaylistRepository {
  getPlaylistsByDeviceIdPage: (
    deviceId: string,
    page: number,
    pageSize: number,
  ) => Promise<PlaylistResponse>
  getPlaylistById: (playlistId: number, deviceId: string) => Promise<Playlist | null>
}

export const playlistRepository: PlaylistRepository = {
  async getPlaylistsByDeviceIdPage(
    deviceId: string,
    page: number,
    pageSize: number,
  ): Promise<PlaylistResponse> {
    const offset = (page - 1) * pageSize
    const result = await db.query<PlaylistWithItemsRow>(SELECT_PLAYLISTS_WITH_ITEMS_BY_DEVICE_ID, [
      deviceId,
      pageSize,
      offset,
    ])

    const total = result.rows[0]?.total_count ?? 0
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0
    const playlists = mapRowsToPlaylists(result.rows)

    return {
      size: pageSize,
      total,
      currentPage: page,
      totalPages,
      content: playlists,
    }
  },

  async getPlaylistById(playlistId: number, deviceId: string): Promise<Playlist | null> {
    const result = await db.query<PlaylistDetailsRow>(SELECT_PLAYLIST_BY_ID, [playlistId, deviceId])
    const row = result.rows[0]
    if (!row) {
      return null
    }

    return mapRowToPlaylist(row)
  },
}
