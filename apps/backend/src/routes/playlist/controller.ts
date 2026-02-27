import type { Context } from 'hono'
import { Res } from '@/app/rest/rest.js'
import { getPlaylistDeviceId, getPlaylistId } from '@/routes/playlist/modal.js'
import { playlistService } from '@/routes/playlist/service.js'

export const playlistController = {
  async getPlaylist(c: Context) {
    const deviceId = getPlaylistDeviceId(c.req.query('deviceId'))!

    const result = await playlistService.getPlaylist(deviceId)

    return Res(result)
  },

  async getPlaylistById(c: Context) {
    const id = getPlaylistId(c.req.param('id'))!

    const result = await playlistService.getPlaylistById(id)

    return Res(result)
  },
}
