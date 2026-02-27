import type { Hono } from 'hono'
import { playlistController } from '@/routes/playlist/controller.js'

export function registerPlaylistRoutes(api: Hono): void {
  api.get('/playlist', playlistController.getPlaylist)
  api.get('/playlist/:id', playlistController.getPlaylistById)
}
