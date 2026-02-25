import type { Hono } from 'hono'
import type {
  Playlist as _Playlist,
  PlaylistResponse as _PlaylistResponse,
} from '@signage/contracts'

export type { _Playlist, _PlaylistResponse }

async function getPlaylist(): Promise<Response> {
  throw new Error('Not implemented: getPlaylist')
}

async function getPlaylistById(): Promise<Response> {
  throw new Error('Not implemented: getPlaylistById')
}

export function registerPlaylistRoutes(api: Hono): void {
  api.get('/playlist', getPlaylist)
  api.get('/playlist/:id', getPlaylistById)
}
