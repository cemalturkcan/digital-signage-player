import type {
  PlaylistItemInput,
  PlaylistItemRecord,
  PlaylistRecord,
} from '@/routes/playlist/modal.js'
import type { MediaItem, Playlist, PlaylistResponse } from '@signage/contracts'
import { db } from '@/app/db/db.js'

interface PlaylistRow {
  id: number
  device_id: string
  name: string
  created_at: Date | string
  updated_at: Date | string
}

interface PlaylistItemRow {
  id: number
  playlist_id: number
  media_url: string
  media_type: 'image' | 'video'
  duration: number | null
  sort_order: number
  created_at: Date | string
  updated_at: Date | string
}

interface PlaylistListRow {
  playlist_id: number
  playlist_created_at: Date | string
  playlist_updated_at: Date | string
  item_id: number | null
  media_url: string | null
  media_type: 'image' | 'video' | null
  sort_order: number | null
}

interface CountRow {
  total: string
}

const SELECT_PLAYLIST_BY_DEVICE_ID = `SELECT id, device_id, name, created_at, updated_at
FROM playlists
WHERE device_id = $1
ORDER BY updated_at DESC, id DESC
LIMIT 1`

const SELECT_PLAYLIST_BY_ID = `SELECT id, device_id, name, created_at, updated_at
FROM playlists
WHERE id = $1`

const SELECT_PLAYLISTS_BY_DEVICE_ID = `SELECT id, device_id, name, created_at, updated_at
FROM playlists
WHERE device_id = $1
ORDER BY updated_at DESC, id DESC
LIMIT $2 OFFSET $3`

const COUNT_PLAYLISTS_BY_DEVICE_ID = `SELECT COUNT(*)::text AS total
FROM playlists
WHERE device_id = $1`

const SELECT_PAGED_PLAYLISTS_WITH_ITEMS_BY_DEVICE_ID = `WITH paged_playlists AS (
  SELECT id, created_at, updated_at
  FROM playlists
  WHERE device_id = $1
  ORDER BY updated_at DESC, id DESC
  LIMIT $2 OFFSET $3
)
SELECT
  paged_playlists.id AS playlist_id,
  paged_playlists.created_at AS playlist_created_at,
  paged_playlists.updated_at AS playlist_updated_at,
  playlist_items.id AS item_id,
  playlist_items.media_url AS media_url,
  playlist_items.media_type AS media_type,
  playlist_items.sort_order AS sort_order
FROM paged_playlists
LEFT JOIN playlist_items ON playlist_items.playlist_id = paged_playlists.id
ORDER BY paged_playlists.updated_at DESC, paged_playlists.id DESC, playlist_items.sort_order ASC, playlist_items.id ASC`

const INSERT_PLAYLIST = `INSERT INTO playlists (device_id, name)
VALUES ($1, $2)
RETURNING id, device_id, name, created_at, updated_at`

const UPDATE_PLAYLIST_DEVICE = `UPDATE playlists
SET device_id = $1
WHERE id = $2
RETURNING id, device_id, name, created_at, updated_at`

const TOUCH_PLAYLIST = `UPDATE playlists
SET name = name
WHERE id = $1
RETURNING id, device_id, name, created_at, updated_at`

const SELECT_PLAYLIST_ITEMS_ORDERED = `SELECT id, playlist_id, media_url, media_type, duration, sort_order, created_at, updated_at
FROM playlist_items
WHERE playlist_id = $1
ORDER BY sort_order ASC, id ASC`

const DELETE_PLAYLIST_ITEMS = 'DELETE FROM playlist_items WHERE playlist_id = $1'

const INSERT_PLAYLIST_ITEM = `INSERT INTO playlist_items (playlist_id, media_url, media_type, duration, sort_order)
VALUES ($1, $2, $3, $4, $5)`

function getDb(): NonNullable<typeof db> {
  if (db === null) {
    throw new Error('Database not connected')
  }

  return db
}

function toPlaylistRecord(row: PlaylistRow): PlaylistRecord {
  const createdAt = new Date(row.created_at).getTime()
  const updatedAt = new Date(row.updated_at).getTime()

  return {
    id: row.id,
    deviceId: row.device_id,
    name: row.name,
    createdAt,
    updatedAt,
  }
}

function toPlaylistItemRecord(row: PlaylistItemRow): PlaylistItemRecord {
  const createdAt = new Date(row.created_at).getTime()
  const updatedAt = new Date(row.updated_at).getTime()

  return {
    id: row.id,
    playlistId: row.playlist_id,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    duration: row.duration,
    sortOrder: row.sort_order,
    createdAt,
    updatedAt,
  }
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
  ],
}

function buildPageWindow(
  page: number,
  pageSize: number
): {
  includeDefault: boolean
  deviceOffset: number
  deviceLimit: number
} {
  const startIndex = (page - 1) * pageSize
  const includeDefault = startIndex === 0

  if (includeDefault) {
    return {
      includeDefault: true,
      deviceOffset: 0,
      deviceLimit: Math.max(0, pageSize - 1),
    }
  }

  return {
    includeDefault: false,
    deviceOffset: Math.max(0, startIndex - 1),
    deviceLimit: pageSize,
  }
}

function mapRowsToPlaylists(rows: PlaylistListRow[]): Playlist[] {
  const playlistMap = new Map<number, Playlist>()

  for (const row of rows) {
    let playlist = playlistMap.get(row.playlist_id)

    if (!playlist) {
      playlist = {
        id: String(row.playlist_id),
        createdAt: new Date(row.playlist_created_at).getTime(),
        updatedAt: new Date(row.playlist_updated_at).getTime(),
        items: [],
      }
      playlistMap.set(row.playlist_id, playlist)
    }

    if (
      row.item_id === null ||
      row.media_type === null ||
      row.media_url === null ||
      row.sort_order === null
    ) {
      continue
    }

    const item: MediaItem = {
      id: String(row.item_id),
      type: row.media_type,
      url: row.media_url,
      order: row.sort_order,
    }
    playlist.items.push(item)
  }

  return Array.from(playlistMap.values())
}

export interface PlaylistRepository {
  findPlaylistByDeviceId: (deviceId: string) => Promise<PlaylistRecord | null>
  listPlaylistsByDeviceId: (
    deviceId: string,
    limit: number,
    offset: number
  ) => Promise<PlaylistRecord[]>
  countPlaylistsByDeviceId: (deviceId: string) => Promise<number>
  findPlaylistById: (playlistId: number) => Promise<PlaylistRecord | null>
  createPlaylistForDevice: (deviceId: string, name: string) => Promise<PlaylistRecord>
  replacePlaylistItems: (playlistId: number, items: PlaylistItemInput[]) => Promise<void>
  loadPlaylistItemsOrdered: (playlistId: number) => Promise<PlaylistItemRecord[]>
  assignPlaylistToDevice: (playlistId: number, deviceId: string) => Promise<PlaylistRecord | null>
  touchPlaylist: (playlistId: number) => Promise<PlaylistRecord | null>
  getPlaylistsByDeviceIdPage: (
    deviceId: string,
    page: number,
    pageSize: number
  ) => Promise<PlaylistResponse>
}

export const playlistRepository: PlaylistRepository = {
  async findPlaylistByDeviceId(deviceId: string): Promise<PlaylistRecord | null> {
    const database = getDb()

    const result = await database.query<PlaylistRow>(SELECT_PLAYLIST_BY_DEVICE_ID, [deviceId])
    if (result.rows.length === 0) {
      return null
    }

    return toPlaylistRecord(result.rows[0])
  },

  async listPlaylistsByDeviceId(
    deviceId: string,
    limit: number,
    offset: number
  ): Promise<PlaylistRecord[]> {
    const database = getDb()

    const result = await database.query<PlaylistRow>(SELECT_PLAYLISTS_BY_DEVICE_ID, [
      deviceId,
      limit,
      offset,
    ])

    return result.rows.map(toPlaylistRecord)
  },

  async countPlaylistsByDeviceId(deviceId: string): Promise<number> {
    const database = getDb()

    const result = await database.query<CountRow>(COUNT_PLAYLISTS_BY_DEVICE_ID, [deviceId])
    const row = result.rows[0]

    if (!row) {
      return 0
    }

    const total = Number.parseInt(row.total, 10)
    return Number.isSafeInteger(total) && total >= 0 ? total : 0
  },

  async findPlaylistById(playlistId: number): Promise<PlaylistRecord | null> {
    const database = getDb()

    const result = await database.query<PlaylistRow>(SELECT_PLAYLIST_BY_ID, [playlistId])
    if (result.rows.length === 0) {
      return null
    }

    return toPlaylistRecord(result.rows[0])
  },

  async createPlaylistForDevice(deviceId: string, name: string): Promise<PlaylistRecord> {
    const database = getDb()

    const result = await database.query<PlaylistRow>(INSERT_PLAYLIST, [deviceId, name])
    return toPlaylistRecord(result.rows[0])
  },

  async replacePlaylistItems(playlistId: number, items: PlaylistItemInput[]): Promise<void> {
    const database = getDb()

    const client = await database.connect()
    try {
      await client.query('BEGIN')
      await client.query(DELETE_PLAYLIST_ITEMS, [playlistId])

      for (const item of items) {
        await client.query(INSERT_PLAYLIST_ITEM, [
          playlistId,
          item.mediaUrl,
          item.mediaType,
          item.duration ?? null,
          item.sortOrder,
        ])
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  async loadPlaylistItemsOrdered(playlistId: number): Promise<PlaylistItemRecord[]> {
    const database = getDb()

    const result = await database.query<PlaylistItemRow>(SELECT_PLAYLIST_ITEMS_ORDERED, [
      playlistId,
    ])
    return result.rows.map(toPlaylistItemRecord)
  },

  async assignPlaylistToDevice(
    playlistId: number,
    deviceId: string
  ): Promise<PlaylistRecord | null> {
    const database = getDb()

    const result = await database.query<PlaylistRow>(UPDATE_PLAYLIST_DEVICE, [deviceId, playlistId])
    if (result.rows.length === 0) {
      return null
    }

    return toPlaylistRecord(result.rows[0])
  },

  async touchPlaylist(playlistId: number): Promise<PlaylistRecord | null> {
    const database = getDb()

    const result = await database.query<PlaylistRow>(TOUCH_PLAYLIST, [playlistId])
    if (result.rows.length === 0) {
      return null
    }

    return toPlaylistRecord(result.rows[0])
  },

  async getPlaylistsByDeviceIdPage(
    deviceId: string,
    page: number,
    pageSize: number
  ): Promise<PlaylistResponse> {
    const database = getDb()
    const totalDevicePlaylists = await this.countPlaylistsByDeviceId(deviceId)
    const total = totalDevicePlaylists + 1
    const totalPages = Math.ceil(total / pageSize)

    const { includeDefault, deviceLimit, deviceOffset } = buildPageWindow(page, pageSize)

    let devicePlaylists: Playlist[] = []
    if (deviceLimit > 0) {
      const result = await database.query<PlaylistListRow>(
        SELECT_PAGED_PLAYLISTS_WITH_ITEMS_BY_DEVICE_ID,
        [deviceId, deviceLimit, deviceOffset]
      )
      devicePlaylists = mapRowsToPlaylists(result.rows)
    }

    const content = includeDefault ? [DEFAULT_PLAYLIST, ...devicePlaylists] : devicePlaylists

    return {
      size: pageSize,
      total,
      currentPage: page,
      totalPages,
      content,
    }
  },
}
