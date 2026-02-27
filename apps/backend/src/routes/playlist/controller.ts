import { toHttpResponse } from '@/app/rest/rest.js'
import { playlistService } from '@/routes/playlist/service.js'

export const playlistController = {
  async getPlaylist(c: {
    req: { query: (name: string) => string | undefined }
  }): Promise<Response> {
    const deviceId = c.req.query('deviceId') ?? ''
    const result = await playlistService.getPlaylist(deviceId)
    return toHttpResponse(result)
  },

  async getPlaylistById(c: {
    req: { param: (name: string) => string | undefined }
  }): Promise<Response> {
    const id = c.req.param('id') ?? ''
    const result = await playlistService.getPlaylistById(id)
    return toHttpResponse(result)
  },
}
