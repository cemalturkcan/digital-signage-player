import type {
  PlaylistItemInput,
  PlaylistItemRecord,
  PlaylistRecord,
} from '@/routes/playlist/modal.js'
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

const SELECT_PLAYLIST_BY_DEVICE_ID = `SELECT id, device_id, name, created_at, updated_at
FROM playlists
WHERE device_id = $1
ORDER BY updated_at DESC, id DESC
LIMIT 1`

const SELECT_PLAYLIST_BY_ID = `SELECT id, device_id, name, created_at, updated_at
FROM playlists
WHERE id = $1`

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

export interface PlaylistRepository {
  findPlaylistByDeviceId: (deviceId: string) => Promise<PlaylistRecord | null>
  findPlaylistById: (playlistId: number) => Promise<PlaylistRecord | null>
  createPlaylistForDevice: (deviceId: string, name: string) => Promise<PlaylistRecord>
  replacePlaylistItems: (playlistId: number, items: PlaylistItemInput[]) => Promise<void>
  loadPlaylistItemsOrdered: (playlistId: number) => Promise<PlaylistItemRecord[]>
  assignPlaylistToDevice: (playlistId: number, deviceId: string) => Promise<PlaylistRecord | null>
  touchPlaylist: (playlistId: number) => Promise<PlaylistRecord | null>
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
    }
    catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
    finally {
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
    deviceId: string,
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
}
