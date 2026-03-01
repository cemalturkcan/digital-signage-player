import type { MediaItem, Playlist, PlaylistResponse } from '@signage/contracts'
import { db } from '@/app/db/db.js'

interface PlaylistWithItemsRow {
  playlist_id: number | null
  playlist_created_at: Date | string | null
  playlist_updated_at: Date | string | null
  items: unknown
  total_count: number
}

interface PlaylistItemJson {
  id: string
  type: 'image' | 'video'
  url: string
  order: number
}

const DEFAULT_PLAYLIST: Playlist = {
  id: 'default',
  createdAt: 0,
  updatedAt: 0,
  items: [
    {
      id: 'default-0',
      type: 'image',
      url: 'https://cdn.cemalturkcan.com/images/image1.jpg',
      order: 0,
    },
    {
      id: 'default-1',
      type: 'video',
      url: 'https://cdn.cemalturkcan.com/videos/video1.mp4',
      order: 1,
    },
    {
      id: 'default-2',
      type: 'image',
      url: 'https://cdn.cemalturkcan.com/images/image2.jpg',
      order: 2,
    },
    {
      id: 'default-3',
      type: 'video',
      url: 'https://cdn.cemalturkcan.com/videos/video2.mp4',
      order: 3,
    },
    {
      id: 'default-4',
      type: 'image',
      url: 'https://cdn.cemalturkcan.com/videos/image3.mp4',
      order: 4,
    },
    {
      id: 'default-4',
      type: 'video',
      url: 'https://cdn.cemalturkcan.com/videos/video3.mp4',
      order: 5,
    },
  ],
}

const SELECT_PLAYLISTS_WITH_ITEMS_BY_DEVICE_ID = `WITH filtered_playlists AS (
  SELECT id, created_at, updated_at
  FROM playlists
  WHERE device_id = $1
),
total_count AS (
  SELECT COUNT(*)::int AS total
  FROM filtered_playlists
),
paged_playlists AS (
  SELECT id, created_at, updated_at
  FROM filtered_playlists
  ORDER BY updated_at DESC, id DESC
  LIMIT $2 OFFSET $3
),
playlists_with_items AS (
  SELECT
    paged_playlists.id AS playlist_id,
    paged_playlists.created_at AS playlist_created_at,
    paged_playlists.updated_at AS playlist_updated_at,
    COALESCE(
      json_agg(
        json_build_object(
          'id', playlist_items.id::text,
          'type', playlist_items.media_type,
          'url', playlist_items.media_url,
          'order', playlist_items.sort_order
        )
        ORDER BY playlist_items.sort_order ASC, playlist_items.id ASC
      ) FILTER (WHERE playlist_items.id IS NOT NULL),
      '[]'::json
    ) AS items
  FROM paged_playlists
  LEFT JOIN playlist_items ON playlist_items.playlist_id = paged_playlists.id
  GROUP BY paged_playlists.id, paged_playlists.created_at, paged_playlists.updated_at
)
SELECT
  playlists_with_items.playlist_id,
  playlists_with_items.playlist_created_at,
  playlists_with_items.playlist_updated_at,
  playlists_with_items.items,
  total_count.total AS total_count
FROM total_count
LEFT JOIN playlists_with_items ON true
ORDER BY playlists_with_items.playlist_updated_at DESC NULLS LAST, playlists_with_items.playlist_id DESC NULLS LAST`

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
      order: item.order,
    })
  }

  return items
}

function mapRowsToPlaylists(rows: PlaylistWithItemsRow[]): Playlist[] {
  const playlists: Playlist[] = []

  for (const row of rows) {
    if (
      row.playlist_id === null
      || row.playlist_created_at === null
      || row.playlist_updated_at === null
    ) {
      continue
    }

    playlists.push({
      id: String(row.playlist_id),
      createdAt: new Date(row.playlist_created_at).getTime(),
      updatedAt: new Date(row.playlist_updated_at).getTime(),
      items: mapItems(row.items),
    })
  }

  return playlists
}

export interface PlaylistRepository {
  getPlaylistsByDeviceIdPage: (
    deviceId: string,
    page: number,
    pageSize: number,
  ) => Promise<PlaylistResponse>
}

export const playlistRepository: PlaylistRepository = {
  async getPlaylistsByDeviceIdPage(
    deviceId: string,
    page: number,
    pageSize: number,
  ): Promise<PlaylistResponse> {
    if (db === null) {
      throw new Error('Database not connected')
    }

    const offset = (page - 1) * pageSize
    const result = await db.query<PlaylistWithItemsRow>(SELECT_PLAYLISTS_WITH_ITEMS_BY_DEVICE_ID, [
      deviceId,
      pageSize,
      offset,
    ])

    const totalDevicePlaylists = result.rows[0]?.total_count ?? 0
    const total = totalDevicePlaylists + 1
    const totalPages = Math.ceil(total / pageSize)
    const playlists = mapRowsToPlaylists(result.rows)

    return {
      size: pageSize,
      total,
      currentPage: page,
      totalPages,
      content: [DEFAULT_PLAYLIST, ...playlists],
    }
  },
}
