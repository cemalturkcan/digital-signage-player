import type { PlaylistResponse } from '@signage/contracts'
import type { Hono } from 'hono'
import { playlistService } from '@/routes/playlist/service.js'

async function getPlaylist(c: {
  req: { query: (name: string) => string | undefined }
}): Promise<Response> {
  const deviceId = c.req.query('deviceId')
  if (!deviceId) {
    return Response.json({ error: 'deviceId required' }, { status: 400 })
  }
  const result = await playlistService.getPlaylist(deviceId)
  if (!result) {
    return Response.json({ error: 'Playlist not found' }, { status: 404 })
  }
  return Response.json(result satisfies PlaylistResponse)
}

async function getPlaylistById(c: {
  req: { param: (name: string) => string | undefined }
}): Promise<Response> {
  const id = c.req.param('id')
  if (!id) {
    return Response.json({ error: 'id required' }, { status: 400 })
  }
  const playlist = await playlistService.getPlaylistById(id)
  if (!playlist) {
    return Response.json({ error: 'Playlist not found' }, { status: 404 })
  }
  return Response.json(playlist)
}

export function registerPlaylistRoutes(api: Hono): void {
  api.get('/playlist', getPlaylist)
  api.get('/playlist/:id', getPlaylistById)
}
